<script lang="ts">
	import { onMount } from 'svelte';
    import Icon from "@iconify/svelte";
	import SafeIcon from '$lib/SafeIcon.svelte';
    import Toolbar from '$lib/components/editor/Toolbar.svelte';
    import JsonTree from '$lib/components/editor/JsonTree.svelte';
    import DiffPanel from '$lib/components/editor/DiffPanel.svelte';

    import { createJsonEditor } from '$lib/plugin/monaco/monaco';
    import { buildTree, type TreeNode } from '$lib/json/tree';
    import { parseJsonInWorker } from '$lib/json/worker';
	import { page } from '$app/stores';

	// Page-specific SEO metadata
	const pageSeo = $derived({
		title: 'JSON Tools - Advanced JSON Editor with Tree View | Banking Data Tools',
		description: 'Professional JSON editor with real-time validation, auto-repair, tree view, and diff capabilities. Format, validate, and repair JSON files with ease.',
		keywords: 'JSON editor, JSON validator, JSON formatter, JSON repair, JSON tree view, JSON diff, JSON tools, online JSON editor',
		url: `https://www.banking-tools.java-sc.com${$page.url.pathname}`,
		type: 'website'
	});

	let editorEl: HTMLDivElement;
	let editor: any;

	let tree: TreeNode[] = [];
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

</script>

<svelte:head>
	<!-- Page-specific SEO Meta Tags -->
	<title>{pageSeo.title}</title>
	<meta name="description" content={pageSeo.description} />
	<meta name="keywords" content={pageSeo.keywords} />
	
	<!-- Open Graph Meta Tags -->
	<meta property="og:title" content={pageSeo.title} />
	<meta property="og:description" content={pageSeo.description} />
	<meta property="og:url" content={pageSeo.url} />
	<meta property="og:type" content={pageSeo.type} />
	
	<!-- Twitter Card Meta Tags -->
	<meta name="twitter:title" content={pageSeo.title} />
	<meta name="twitter:description" content={pageSeo.description} />
	
	<!-- Canonical URL -->
	<link rel="canonical" href={pageSeo.url} />
	
	<!-- Page-specific Structured Data -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "JSON Tools",
			"description": "Professional JSON editor with real-time validation, auto-repair, tree view, and diff capabilities",
			"url": "https://www.banking-tools.java-sc.com/json-tools",
			"applicationCategory": "DeveloperApplication",
			"operatingSystem": "Any",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "IDR"
			},
			"featureList": [
				"Real-time JSON validation",
				"Automatic JSON repair",
				"Interactive tree view",
				"JSON diff comparison",
				"Code formatting",
				"Syntax highlighting"
			],
			"screenshot": "https://www.banking-tools.java-sc.com/og-json-tools.png"
		}
	</script>
</svelte:head>

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
						<SafeIcon iconName="mdi-light:arrow-left" customClass="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 p-3">
							<SafeIcon iconName="mdi-light:code-json" customClass="h-8 w-8 text-white" />
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
						<SafeIcon iconName="mdi-light:code-braces" customClass="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">JSON Editor</h2>
					</div>
				</div>
			</div>
			<div class="flex flex-col bg-gray-50 border border-gray-200 rounded-lg" style="height: 40rem;">
				<div class="bg-white border-b border-gray-200 p-3">
					<Toolbar
						{editor}
						on:toggleTree={() => (showTree = !showTree)}
						on:showDiff={(e) => (diffData = e.detail)}
						on:showSuccess={(e) => {
							success = e.detail;
							error = '';
							setTimeout(() => { success = ''; }, 5000);
						}}
						on:showError={(e) => {
							error = e.detail;
							success = '';
							setTimeout(() => { error = ''; }, 5000);
						}}
						on:contentChanged={() => {
							// Trigger the editor's change event to update the tree
							editor.getModel().setValue(editor.getValue());
						}}
					/>
				</div>
		
				<div class="flex flex-1 overflow-hidden bg-white">
					{#if showTree}
						<div class="w-64 border-r border-gray-200 bg-gray-50">
							<JsonTree {tree} on:select={(e) => reveal(e.detail)} />
						</div>
					{/if}
		
					<div bind:this={editorEl} class="flex-1 bg-white"></div>
				</div>
		
				{#if diffData}
					<DiffPanel {diffData} on:close={() => (diffData = null)} />
				{/if}
		
				{#if error}
					<div class="bg-red-50 border-l-4 border-red-400 p-3 text-red-800">
						<div class="flex items-center space-x-2">
							<SafeIcon iconName="mdi-light:alert" customClass="h-5 w-5" />
							<span class="text-sm">{error}</span>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>
