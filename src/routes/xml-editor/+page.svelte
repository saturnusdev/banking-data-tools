<script>
	import Icon from '@iconify/svelte';
	import { page } from '$app/state';
	import XmlToolTabs from '#lib/components/xml-tools/XmlToolTabs.svelte';

	const pageSeo = $derived({
		title: 'XML Editor - Format, Validate, Convert, Diff & Tree View | Banking Data Tools',
		description:
			'Professional XML toolset with formatter, validator, XML to JSON, XML to fixed-width, XML to CSV, entity escape/unescape, GitHub-style XML diff, and interactive XML tree view.',
		keywords:
			'XML editor, XML formatter, XML validator, XML to JSON, JSON to XML, XML to fixed-width, fixed-width to XML, XML to CSV, XML escape, XML diff, XML tree view, XML tools, online XML tools',
		url: `https://www.banking-tools.java-sc.com${page.url.pathname}`,
		type: 'website'
	});
</script>

<svelte:head>
	<title>{pageSeo.title}</title>
	<meta name="description" content={pageSeo.description} />
	<meta name="keywords" content={pageSeo.keywords} />
	<meta property="og:title" content={pageSeo.title} />
	<meta property="og:description" content={pageSeo.description} />
	<meta property="og:url" content={pageSeo.url} />
	<meta property="og:type" content={pageSeo.type} />
	<meta name="twitter:title" content={pageSeo.title} />
	<meta name="twitter:description" content={pageSeo.description} />
	<link rel="canonical" href={pageSeo.url} />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="bg-white shadow-lg border-b border-orange-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center space-x-4">
				<button
					class="group rounded-full p-2 text-orange-600 transition-all hover:bg-orange-100 hover:scale-110"
					onclick={() => (location.href = '/')}
				>
					<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
				</button>
				<div class="flex items-center space-x-3">
					<div class="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 p-3">
						<Icon icon="mdi:file-xml-box" class="h-8 w-8 text-white" />
					</div>
					<div>
						<h1 class="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							XML Editor
						</h1>
						<p class="text-gray-600 mt-1">
							Format, validate, and convert XML — JSON, fixed-width, CSV, and entity escaping
						</p>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
		<XmlToolTabs />
	</div>
</main>
