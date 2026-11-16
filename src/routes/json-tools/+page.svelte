<script lang="ts">
	import { onMount } from 'svelte';
    import Icon from "@iconify/svelte";
	import SafeIcon from '#lib/SafeIcon.svelte';
    import Toolbar from '#lib/components/editor/Toolbar.svelte';
    import JsonTree from '#lib/components/editor/JsonTree.svelte';
    import DiffPanel from '#lib/components/editor/DiffPanel.svelte';
    import JsonToolTabs from '#lib/components/json-tools/JsonToolTabs.svelte';

    import { createJsonEditor } from '#lib/plugin/monaco/monaco';
    import { buildTree, type TreeNode } from '#lib/json/tree';
    import { parseJsonInWorker } from '#lib/json/worker';
	import { page } from '$app/state';

	// Page-specific SEO metadata
	const pageSeo = $derived({
		title: 'JSON Tools - Advanced JSON Editor with Tree View | Banking Data Tools',
		description: 'Professional JSON toolset with real-time validation, auto-repair, tree view, diff, JSONPath query, YAML/CSV/XML conversion, schema generation, and mock data generation.',
		keywords: 'JSON editor, JSON validator, JSON formatter, JSON repair, JSON tree view, JSON diff, JSON to YAML, JSON to CSV, JSON to XML, JSONPath, JSON schema generator, mock data generator, JSON minify, JSON tools, online JSON tools',
		url: `https://www.banking-tools.java-sc.com${page.url.pathname}`,
		type: 'website'
	});

	let editorEl: HTMLDivElement;
	let editor = $state<any>();

	let tree = $state<TreeNode[]>([]);
	let showTree = $state(true);
	let diffData = $state<{ original: string; modified: string } | null>(null);
	let error = $state('');
	let success = $state('');
	let rawJsonText = $state('');
	let showValidationSection = $state(false);

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
						onclick={() => {location.href = "/"}}
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
								Advanced JSON editor with formatter, validator, converter, JSONPath, schema, and diff tools
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
		<!-- More JSON Tools (Formatter, Validator, Converter, Query, Schema, Mock, Paginate, Clean) -->
		<JsonToolTabs />
	</div>
</main>
