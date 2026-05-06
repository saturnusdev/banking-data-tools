<script lang="ts">
	import { onMount } from 'svelte';
    import Icon from "@iconify/svelte";
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
	</div>
</main>
