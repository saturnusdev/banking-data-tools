<script>
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import SafeIcon from '$lib/SafeIcon.svelte';
	import { performanceMonitor } from '$lib/performance';
	import { onMount } from 'svelte';

	// Monitor page load performance
	onMount(() => {
		performanceMonitor.observePageLoad();
	});

	// Sample JSON data array
	const products = [
		{
			id: 1,
			title: 'Fixed-Length Data Parser',
			description: 'Parse fixed-width text files with customizable field definitions',
			icon: 'mdi-light:format-align-left',
			color: 'from-blue-500 to-cyan-500',
            link: '/fixed-length-parsed'
		},
		{
			id: 2,
			title: 'JSON Tools',
			description: 'Advanced JSON editor with tree view and diff capabilities',
			icon: 'codex:curly-brackets',
			color: 'from-green-500 to-emerald-500',
            link: '/json-tools'
		},
		{
			id: 3,
			title: 'JSON Stringify',
			description: 'Convert and format JSON strings with precision',
			icon: 'proicons:text',
			color: 'from-purple-500 to-indigo-500',
            link: '/json-stringify'
		},
		{
			id: 4,
			title: 'IDM to Swagger',
			description: 'Convert IDM specifications to Swagger/OpenAPI documentation',
			icon: 'material-symbols:api',
			color: 'from-orange-500 to-red-500',
            link: '/idm-swagger'
		},
		{
			id: 5,
			title: 'ISO8583 Parser',
			description: 'Parse and analyze ISO8583 financial transaction messages',
			icon: 'mdi-light:credit-card',
			color: 'from-teal-500 to-cyan-500',
            link: '/iso8583-parser'
		},
		{
			id: 6,
			title: 'DFDL Parser',
			description: 'Data Format Description Language parser for complex data',
			icon: 'mdi:text-box-search-outline',
			color: 'from-indigo-500 to-purple-500',
            link: '/dfdl-parser'
		},
		{
			id: 7,
			title: 'JS Minify/Unminify',
			description: 'Minify and beautify JavaScript code with advanced options',
			icon: 'mdi:language-javascript',
			color: 'from-yellow-500 to-orange-500',
            link: '/js-minify'
		},
		{
			id: 8,
			title: 'Hex to EBCDIC Converter',
			description: 'Convert between hexadecimal and EBCDIC character encoding',
			icon: 'mdi:hexagon-multiple-outline',
			color: 'from-pink-500 to-rose-500',
            link: '/hex-ebcdic-converter'
		},
		{
			id: 9,
			title: 'ISO8583:1987 ITM Banking',
			description: 'Specialized ISO8583 parser for ITM banking systems',
			icon: 'mdi-light:bank',
			color: 'from-emerald-500 to-teal-500',
            link: '/iso8583-1987-itm'
		},
		{
			id: 10,
			title: 'Base64 Auto-Detect & Decoder',
			description: 'Automatically detect and decode various data formats',
			icon: 'mdi-light:lock-open',
			color: 'from-purple-500 to-pink-500',
            link: '/base64-decoder'
		}
	];

    function handleCardClick(product) {
        goto(product.link)
    }
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="bg-white shadow-lg border-b border-purple-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
			<div class="text-center">
				<div class="flex justify-center mb-6">
					<div class="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-4">
						<SafeIcon icon="mdi-light:bank-circle" class="h-12 w-12 text-white" />
					</div>
				</div>
				<h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
					Banking Data Tools
				</h1>
				<p class="text-xl text-gray-600 max-w-3xl mx-auto">
					Professional data processing tools for developers and data analysts
				</p>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7md px-4 sm:px-6 lg:px-8 py-12">
		<!-- Tools Grid -->
		<div class="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each products as product (product.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div 
					class="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer"
					on:click={() => handleCardClick(product)}
				>
					<!-- Gradient Header -->
					<div class="bg-gradient-to-r {product.color} p-6 relative overflow-hidden">
						<div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
						<div class="relative z-10">
							<SafeIcon iconName={product.icon} customClass="h-10 w-10 text-white mb-3" />
							<h3 class="text-xl font-bold text-white">{product.title}</h3>
						</div>
					</div>
					
					<!-- Content -->
					<div class="p-6">
						<p class="text-gray-600 text-sm leading-relaxed mb-4">
							{product.description}
						</p>
						<div class="flex items-center text-purple-600 font-medium text-sm group-hover:text-purple-700 transition-colors">
							<span>Launch Tool</span>
							<SafeIcon iconName="mdi-light:arrow-right" customClass="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer Section -->
		<footer class="mt-20 text-center">
			<div class="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-100">
				<h2 class="text-2xl font-bold text-gray-800 mb-4">Professional Data Processing</h2>
				<p class="text-gray-600 max-w-2xl mx-auto">
					Our comprehensive suite of data tools provides everything you need for data parsing, 
					format conversion, and code optimization. Built with modern web technologies 
					for maximum performance and usability. Powered by Hady Eka Saputra
				</p>
			</div>
		</footer>
	</div>
</main>