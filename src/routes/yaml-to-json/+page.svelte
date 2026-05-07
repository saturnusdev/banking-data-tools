<script>
	import { goto } from '$app/navigation';
	import SafeIcon from '$lib/SafeIcon.svelte';
	import { loadYAML } from '$lib/lazy-loads';

	let yamlText = '';
	let jsonText = '';
	let error = '';
	let dependenciesLoaded = false;
	let mode = 'yaml-to-json'; // 'yaml-to-json' or 'json-to-yaml'

	async function loadDependencies() {
		if (dependenciesLoaded) return;
		try {
			await loadYAML();
			dependenciesLoaded = true;
		} catch (err) {
			error = 'Failed to load YAML parser';
		}
	}

	async function convertYamlToJson() {
		await loadDependencies();
		
		if (!yamlText.trim()) {
			error = 'Please enter YAML content';
			return;
		}

		try {
			const yaml = await import('js-yaml');
			const parsed = yaml.load(yamlText);
			jsonText = JSON.stringify(parsed, null, 2);
			error = '';
		} catch (e) {
			error = 'Invalid YAML: ' + e.message;
		}
	}

	async function convertJsonToYaml() {
		await loadDependencies();
		
		if (!jsonText.trim()) {
			error = 'Please enter JSON content';
			return;
		}

		try {
			const yaml = await import('js-yaml');
			const parsed = JSON.parse(jsonText);
			yamlText = yaml.dump(parsed, { indent: 2 });
			error = '';
		} catch (e) {
			error = 'Invalid JSON: ' + e.message;
		}
	}

	function convert() {
		if (mode === 'yaml-to-json') {
			convertYamlToJson();
		} else {
			convertJsonToYaml();
		}
	}

	async function copyToClipboard() {
		const textToCopy = mode === 'yaml-to-json' ? jsonText : yamlText;
		if (!textToCopy.trim()) {
			error = 'Nothing to copy';
			return;
		}
		try {
			await navigator.clipboard.writeText(textToCopy);
			error = 'Copied to clipboard!';
			setTimeout(() => error = '', 3000);
		} catch (err) {
			error = 'Failed to copy to clipboard';
		}
	}

	function clearAll() {
		yamlText = '';
		jsonText = '';
		error = '';
	}
</script>

<main class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
	<header class="bg-white shadow-lg border-b border-green-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-green-600 transition-all hover:bg-green-100 hover:scale-110"
						on:click={() => goto('/')}
					>
						<SafeIcon iconName="mdi-light:arrow-left" customClass="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 p-3">
							<SafeIcon iconName="mdi-light:file-code" customClass="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
								{mode === 'yaml-to-json' ? 'YAML to JSON' : 'JSON to YAML'}
							</h1>
							<p class="text-gray-600 mt-1">
								{mode === 'yaml-to-json' ? 'Convert YAML/OpenAPI specifications to JSON format' : 'Convert JSON to YAML format'}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
		<!-- Mode Switcher Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
			<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<SafeIcon iconName="mdi-light:swap-horizontal" customClass="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Conversion Mode</h2>
					</div>
				</div>
			</div>
			<div class="p-6">
				<div class="flex justify-center">
					<div class="inline-flex rounded-xl bg-gray-100 p-1">
						<button
							on:click={() => mode = 'yaml-to-json'}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'yaml-to-json'
								? 'bg-white text-green-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<SafeIcon iconName="mdi-light:file-code" customClass="h-4 w-4" />
								<span>YAML to JSON</span>
							</span>
						</button>
						<button
							on:click={() => mode = 'json-to-yaml'}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'json-to-yaml'
								? 'bg-white text-green-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<SafeIcon iconName="mdi-light:code-json" customClass="h-4 w-4" />
								<span>JSON to YAML</span>
							</span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Converter Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
			<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<SafeIcon iconName="mdi-light:file-code" customClass="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">
							{mode === 'yaml-to-json' ? 'YAML to JSON Converter' : 'JSON to YAML Converter'}
						</h2>
					</div>
					<button
						on:click={convert}
						class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<SafeIcon iconName="mdi-light:swap-horizontal" customClass="h-4 w-4" />
							<span>Convert</span>
						</span>
					</button>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{#if mode === 'yaml-to-json'}
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium text-gray-700 mb-2">
								YAML Input
							</label>
							<textarea
								bind:value={yamlText}
								placeholder="Enter YAML/OpenAPI content here..."
								class="w-full h-96 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-green-400 focus:ring-4 focus:ring-green-100 resize-none"
							></textarea>
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium text-gray-700 mb-2">
								JSON Output
							</label>
							<textarea
								bind:value={jsonText}
								placeholder="JSON output will appear here..."
								readonly
								class="w-full h-96 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm bg-gray-50 transition-all focus:border-green-400 focus:ring-4 focus:ring-green-100 resize-none"
							></textarea>
						</div>
					{:else}
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium text-gray-700 mb-2">
								JSON Input
							</label>
							<textarea
								bind:value={jsonText}
								placeholder="Enter JSON content here..."
								class="w-full h-96 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-green-400 focus:ring-4 focus:ring-green-100 resize-none"
							></textarea>
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium text-gray-700 mb-2">
								YAML Output
							</label>
							<textarea
								bind:value={yamlText}
								placeholder="YAML output will appear here..."
								readonly
								class="w-full h-96 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm bg-gray-50 transition-all focus:border-green-400 focus:ring-4 focus:ring-green-100 resize-none"
							></textarea>
						</div>
					{/if}
				</div>
				
				<div class="flex justify-center space-x-4">
					<button
						on:click={copyToClipboard}
						class="group relative overflow-hidden rounded-lg bg-green-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-green-600"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<SafeIcon iconName="mdi-light:content-copy" customClass="h-4 w-4" />
							<span>Copy {mode === 'yaml-to-json' ? 'JSON' : 'YAML'}</span>
						</span>
					</button>
					<button
						on:click={clearAll}
						class="group relative overflow-hidden rounded-lg bg-gray-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-600"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<SafeIcon iconName="mdi-light:delete" customClass="h-4 w-4" />
							<span>Clear All</span>
						</span>
					</button>
				</div>
			</div>
		</section>

		{#if error}
			<section class="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl shadow-xl border border-red-100 overflow-hidden">
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
			</section>
		{/if}
	</div>
</main>
