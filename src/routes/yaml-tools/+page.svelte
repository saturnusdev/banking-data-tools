<script lang="ts">
	import SafeIcon from '#lib/SafeIcon.svelte';
	import YamlToolTabs from '#lib/components/yaml-tools/YamlToolTabs.svelte';
	import { page } from '$app/state';

	let yamlTabs: YamlToolTabs;

	// Page-specific SEO metadata
	const pageSeo = $derived({
		title: 'YAML Tools - Validate, Lint, Convert, Merge & Diff | Banking Data Tools',
		description:
			'Professional YAML toolset with real-time validation, linting, conversion to JSON/CSV/XML, minify/pretty, deep merge, diff, key-value extraction, and filtering.',
		keywords:
			'YAML editor, YAML validator, YAML linter, YAML formatter, YAML minify, YAML to JSON, JSON to YAML, YAML merge, YAML diff, YAML key values, YAML filter, online YAML tools',
		url: `https://www.banking-tools.java-sc.com${page.url.pathname}`,
		type: 'website'
	});
</script>

<svelte:head>
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
			"name": "YAML Tools",
			"description": "Validate, lint, convert, format, merge, diff, extract key-values, and filter YAML documents",
			"url": "https://www.banking-tools.java-sc.com/yaml-tools",
			"applicationCategory": "DeveloperApplication",
			"operatingSystem": "Any",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "IDR"
			},
			"featureList": [
				"YAML validation",
				"YAML linting",
				"YAML to JSON / CSV / XML conversion",
				"YAML minify and pretty-print",
				"YAML deep merge",
				"YAML diff comparison",
				"YAML key-value extraction",
				"YAML filtering"
			]
		}
	</script>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
	<header class="border-b border-green-100 bg-white shadow-lg">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-green-600 transition-all hover:scale-110 hover:bg-green-100"
						onclick={() => (location.href = '/')}
					>
						<SafeIcon
							iconName="mdi-light:arrow-left"
							customClass="h-6 w-6 transition-transform group-hover:-translate-x-1"
						/>
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 p-3">
							<SafeIcon iconName="mdi-light:file-code" customClass="h-8 w-8 text-white" />
						</div>
						<div>
							<h1
								class="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent"
							>
								YAML Tools
							</h1>
							<p class="mt-1 text-gray-600">
								Validate, lint, convert, format, merge, diff, extract key-values, and filter YAML
								documents
							</p>
						</div>
					</div>
				</div>
				<button
					onclick={() => yamlTabs?.loadSample()}
					class="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
				>
					<SafeIcon iconName="mdi:flask-outline" customClass="h-4 w-4" />
					Load Sample
				</button>
			</div>
		</div>
	</header>

	<YamlToolTabs bind:this={yamlTabs} />
</main>
