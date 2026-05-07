<script lang="ts">
	import { onMount } from 'svelte';
    import Icon from "@iconify/svelte";
	import SafeIcon from '$lib/SafeIcon.svelte';
    import Toolbar from '$lib/components/editor/Toolbar.svelte';
    import JsonTree from '$lib/components/editor/JsonTree.svelte';
    import DiffPanel from '$lib/components/editor/DiffPanel.svelte';

    import { createJsonEditor } from '$lib/plugin/monaco/monaco';
    import { buildTree } from '$lib/json/tree';
    import { parseJsonInWorker } from '$lib/json/worker';

	let editorEl: HTMLDivElement;
	let editor: any;

	let tree = [];
	let showTree = true;
	let diffData: { original: string; modified: string } | null = null;
	let error = '';
	let success = '';
	let rawJsonText = '';
	let showValidationSection = false;

	onMount(async () => {
		editor = await createJsonEditor(editorEl);

		editor.onDidChangeModelContent(async () => {
			try {
				const parsed = await parseJsonInWorker(editor.getValue());
				tree = buildTree(parsed);
				error = '';
			} catch (e: any) {
				error = e;
			}
		});
	});

	function reveal(path: string) {
		const model = editor.getModel();
		const idx = model.getValue().indexOf(`"${path.split('.').pop()}"`);
		if (idx < 0) return;

		const pos = model.getPositionAt(idx);
		editor.revealPositionInCenter(pos);
		editor.setPosition(pos);
	}


	function walk(node) {
        return [
            node.id,
            ...(node.children?.flatMap(walk) ?? [])
        ];
    }

	function validateJSON(input: string) {
		if (!input.trim()) {
			return { valid: false, error: 'Empty input' };
		}
		try {
			JSON.parse(input);
			return { valid: true, error: null };
		} catch (e: any) {
			return { valid: false, error: e.message };
		}
	}

	function repairJSON(input: string) {
		if (!input.trim()) {
			error = 'Empty input';
			return input;
		}

		let repaired = input;
		
		// Fix smart quotes
		repaired = repaired.replace(/[\u201C\u201D]/g, '"')
					.replace(/[\u2018\u2019]/g, "'");
		
		// Fix single quotes to double quotes for strings and keys
		repaired = repaired.replace(/'/g, '"');
		
		// Fix missing quotes around keys
		repaired = repaired.replace(/(\w+):/g, '"$1":');
		
		// Fix missing quotes around string values
		repaired = repaired.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)/g, ': "$1"');
		
		// Fix trailing commas in objects
		repaired = repaired.replace(/,\s*}/g, '}');
		
		// Fix trailing commas in arrays
		repaired = repaired.replace(/,\s*\]/g, ']');
		
		// Fix missing commas between fields
		repaired = repaired.replace(/}\s*{/g, '},{');
		repaired = repaired.replace(/]\s*{/g, '],{');
		repaired = repaired.replace(/}\s*\[/g, '},[');
		repaired = repaired.replace(/]\s*\[/g, '],[');
		
		// Fix missing colons after keys
		repaired = repaired.replace(/"(\w+)"\s*([\{\[\w])/g, '"$1": $2');
		
		// Fix missing braces and brackets (basic attempt)
		const openBraces = (repaired.match(/{/g) || []).length;
		const closeBraces = (repaired.match(/}/g) || []).length;
		const openBrackets = (repaired.match(/\[/g) || []).length;
		const closeBrackets = (repaired.match(/]/g) || []).length;
		
		repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
		repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
		
		// Fix unescaped newlines and tabs in strings
		repaired = repaired.replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
		repaired = repaired.replace(/"([^"]*)\t([^"]*)"/g, '"$1\\t$2"');
		
		// Fix invalid escape characters
		repaired = repaired.replace(/\\x([0-9A-Fa-f]{0,1})/g, (match, hex) => {
			if (hex.length === 1) {
				return '\\x0' + hex;
			}
			return match;
		});
		
		// Fix broken backslash escaping
		repaired = repaired.replace(/\\\\/g, '\\\\');
		
		// Fix double-encoded JSON
		try {
			const decoded = JSON.parse(repaired);
			if (typeof decoded === 'string') {
				try {
					const doubleDecoded = JSON.parse(decoded);
					repaired = JSON.stringify(doubleDecoded, null, 2);
				} catch (e) {
					repaired = JSON.stringify(decoded, null, 2);
				}
			}
		} catch (e) {
			// Continue with original repaired string
		}
		
		// Fix boolean, number, and null values that are incorrectly quoted
		repaired = repaired.replace(/"(true|false)"/g, '$1');
		repaired = repaired.replace(/"(null)"/g, '$1');
		repaired = repaired.replace(/"(\d+(\.\d+)?)"/g, '$1');
		
		// Try to parse the repaired JSON
		try {
			JSON.parse(repaired);
			success = 'JSON repaired successfully!';
			error = '';
			return repaired;
		} catch (e: any) {
			// If still invalid, try more aggressive repairs
			return aggressiveJSONRepair(repaired);
		}
	}

	function aggressiveJSONRepair(input: string) {
		let repaired = input;
		
		// Fix array/object mismatch
		repaired = repaired.replace(/\{\s*\[/g, '[').replace(/\]\s*\}/g, ']');
		
		// Fix invalid nesting structure
		repaired = repaired.replace(/\{\s*\}/g, '{}');
		repaired = repaired.replace(/\[\s*\]/g, '[]');
		
		// Fix missing array separators
		repaired = repaired.replace(/([\w\"'])\s+([\w\"'])/g, '$1, $2');
		
		// Fix escaped JSON inside string fields
		repaired = repaired.replace(/"\\"([^"\\]*)\\""/g, '"$1"');
		
		// Final attempt to parse
		try {
			JSON.parse(repaired);
			success = 'JSON repaired with advanced fixes!';
			error = '';
			return repaired;
		} catch (e: any) {
			error = 'Could not repair JSON: ' + e.message;
			return input; // Return original if repair failed
		}
	}

	function validateCurrentJSON() {
		const input = rawJsonText;
		const result = validateJSON(input);
		
		if (result.valid) {
			success = 'Valid JSON!';
			error = '';
		} else {
			error = 'Invalid JSON: ' + result.error;
			success = '';
		}
		
		setTimeout(() => { success = ''; error = ''; }, 5000);
	}

	function repairCurrentJSON() {
		const input = rawJsonText;
		const repaired = repairJSON(input);
		
		if (error === '') {
			rawJsonText = repaired;
			// Update the editor if it exists
			if (editor) {
				editor.setValue(repaired);
			}
		}
		
		setTimeout(() => { success = ''; error = ''; }, 5000);
	}

	function syncWithEditor() {
		if (editor) {
			rawJsonText = editor.getValue();
		}
	}
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="bg-white shadow-lg border-b border-purple-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-purple-600 transition-all hover:bg-purple-100 hover:scale-110"
						on:click={() => {location.href = "/"}}
					>
						<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 p-3">
							<Icon icon="mdi-light:code-json" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
								JSON Tools
							</h1>
							<p class="text-gray-600 mt-1">
								Advanced JSON editor with tree view and diff capabilities
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
		<!-- JSON Editor Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
			<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:code-braces" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">JSON Editor</h2>
					</div>
				</div>
			</div>
			<div class="flex h-96 flex-col bg-gray-900">
				<Toolbar
					{editor}
					on:toggleTree={() => (showTree = !showTree)}
					on:showDiff={(e) => (diffData = e.detail)}
				/>
		
				<div class="flex flex-1 overflow-hidden">
					{#if showTree}
						<JsonTree {tree} on:select={(e) => reveal(e.detail)} />
					{/if}
		
					<div bind:this={editorEl} class="flex-1"></div>
				</div>
		
				{#if diffData}
					<DiffPanel {diffData} on:close={() => (diffData = null)} />
				{/if}
		
				{#if error}
					<div class="bg-red-600 p-3 text-white">
						<div class="flex items-center space-x-2">
							<Icon icon="mdi-light:alert" class="h-5 w-5" />
							<span class="text-sm">{error}</span>
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- JSON Validation & Repair Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
			<div class="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<SafeIcon iconName="mdi-light:wrench" customClass="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">JSON Validation & Repair Tools</h2>
					</div>
					<button
						on:click={() => showValidationSection = !showValidationSection}
						class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<SafeIcon iconName={showValidationSection ? "mdi-light:chevron-up" : "mdi-light:chevron-down"} customClass="h-4 w-4" />
							<span>{showValidationSection ? 'Hide' : 'Show'}</span>
						</span>
					</button>
				</div>
			</div>
			
			{#if showValidationSection}
				<div class="p-6 space-y-6">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Raw JSON Input
							</label>
							<textarea
								bind:value={rawJsonText}
								placeholder="Paste your JSON here for validation and repair..."
								class="w-full h-64 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
							></textarea>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Quick Actions
							</label>
							<div class="space-y-4">
								<div class="bg-gray-50 rounded-xl p-4">
									<h3 class="font-semibold text-gray-800 mb-3">Validation Tools</h3>
									<p class="text-sm text-gray-600 mb-4">Check if your JSON is valid and get detailed error messages.</p>
									<button
										on:click={validateCurrentJSON}
										class="w-full group relative overflow-hidden rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600"
									>
										<span class="relative z-10 flex items-center justify-center space-x-2">
											<SafeIcon iconName="mdi-light:check-circle" customClass="h-4 w-4" />
											<span>Validate JSON</span>
										</span>
									</button>
								</div>
								
								<div class="bg-gray-50 rounded-xl p-4">
									<h3 class="font-semibold text-gray-800 mb-3">Repair Tools</h3>
									<p class="text-sm text-gray-600 mb-4">Automatically fix common JSON issues like missing quotes, trailing commas, and syntax errors.</p>
									<button
										on:click={repairCurrentJSON}
										class="w-full group relative overflow-hidden rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-600"
									>
										<span class="relative z-10 flex items-center justify-center space-x-2">
											<SafeIcon iconName="mdi-light:wrench" customClass="h-4 w-4" />
											<span>Repair JSON</span>
										</span>
									</button>
								</div>
								
								<div class="bg-gray-50 rounded-xl p-4">
									<h3 class="font-semibold text-gray-800 mb-3">Sync with Editor</h3>
									<p class="text-sm text-gray-600 mb-4">Copy content from the Monaco editor above.</p>
									<button
										on:click={syncWithEditor}
										class="w-full group relative overflow-hidden rounded-lg bg-gray-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-600"
									>
										<span class="relative z-10 flex items-center justify-center space-x-2">
											<SafeIcon iconName="mdi-light:sync" customClass="h-4 w-4" />
											<span>Sync from Editor</span>
										</span>
									</button>
								</div>
							</div>
						</div>
					</div>
					
					{#if success}
						<div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl border border-green-100 overflow-hidden">
							<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
								<div class="flex items-center space-x-3">
									<SafeIcon iconName="mdi-light:check-circle" customClass="h-5 w-5 text-white" />
									<h3 class="text-lg font-bold text-white">Success</h3>
								</div>
							</div>
							<div class="p-6">
								<div class="flex items-center space-x-3">
									<div class="rounded-full bg-green-100 p-2">
										<SafeIcon iconName="mdi-light:check" customClass="h-6 w-6 text-green-600" />
									</div>
									<p class="text-green-800 font-medium">{success}</p>
								</div>
							</div>
						</div>
					{/if}
					
					{#if error && showValidationSection}
						<div class="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl shadow-xl border border-red-100 overflow-hidden">
							<div class="bg-gradient-to-r from-red-500 to-rose-500 p-4">
								<div class="flex items-center space-x-3">
									<SafeIcon iconName="mdi-light:alert" customClass="h-5 w-5 text-white" />
									<h3 class="text-lg font-bold text-white">Error</h3>
								</div>
							</div>
							<div class="p-6">
								<div class="flex items-center space-x-3">
									<div class="rounded-full bg-red-100 p-2">
										<SafeIcon iconName="mdi-light:alert-circle" customClass="h-6 w-6 text-red-600" />
									</div>
									<p class="text-red-800 font-medium">{error}</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</section>
	</div>
</main>
