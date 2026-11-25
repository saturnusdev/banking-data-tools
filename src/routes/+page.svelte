<script>
	import { goto } from '$app/navigation';
	import SafeIcon from '#lib/SafeIcon.svelte';
	import { performanceMonitor } from '#lib/performance';
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
			id: 4,
			title: 'Excel to OpenAPI',
			description: 'Dynamically map any Excel sheet to OpenAPI/Swagger with header, column, and row selection',
			icon: 'material-symbols:api',
			color: 'from-emerald-500 to-teal-500',
			link: '/excel-to-openapi'
		},
		{
			id: 5,
			title: 'Message ISO 8583 Studio',
			description: 'Build, decode, validate, and simulate ISO 8583 financial messages',
			icon: 'mdi:credit-card-outline',
			color: 'from-teal-500 to-cyan-500',
			link: '/iso8583-message-studio'
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
			description: 'Convert between Hex, ASCII, EBCDIC, and Base64 codec representations',
			icon: 'mdi:hexagon-multiple-outline',
			color: 'from-pink-500 to-rose-500',
			link: '/hex-ebcdic-converter'
		},
		{
			id: 9,
			title: 'XML Editor',
			description:
				'Format, validate, and convert XML to JSON, fixed-width, CSV, and entity escaping',
			icon: 'mdi:file-xml-box',
			color: 'from-orange-500 to-amber-500',
			link: '/xml-editor'
		},
		{
			id: 10,
			title: 'Base64 Auto-Detect & Decoder',
			description: 'Automatically detect and decode various data formats',
			icon: 'mdi-light:lock-open',
			color: 'from-purple-500 to-pink-500',
			link: '/base64-decoder'
		},
		{
			id: 11,
			title: 'YAML Tools',
			description: 'Validate, lint, convert, format, merge, diff, and filter YAML documents',
			icon: 'mdi:file-code',
			color: 'from-green-500 to-emerald-500',
			link: '/yaml-tools'
		},
		{
			id: 12,
			title: 'ABCS Converter',
			description: 'Convert ABCS binary segments to JSON using a DFDL XSD schema',
			icon: 'mdi:file-document-edit-outline',
			color: 'from-indigo-500 to-cyan-500',
			link: '/abcs-converter'
		}
	];

	function handleCardClick(product) {
		goto(product.link);
	}
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="border-b border-purple-100 bg-white shadow-lg">
		<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<div class="text-center">
				<h1
					class="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent"
				>
					DataCodec
				</h1>
				<p class="mx-auto max-w-3xl text-xl text-gray-600">
					Developer Payload Editors, Codecs & Banking Message Tools
				</p>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="max-w-7md mx-auto px-4 py-12 sm:px-6 lg:px-8">
		<!-- Tools Grid -->
		<div class="grid grid-cols-4 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each products as product (product.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl"
					onclick={() => handleCardClick(product)}
				>
					<!-- Gradient Header -->
					<div class="bg-gradient-to-r {product.color} relative overflow-hidden p-6">
						<div
							class="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-white/10"
						></div>
						<div class="relative z-10">
							<SafeIcon iconName={product.icon} customClass="h-10 w-10 text-white mb-3" />
							<h3 class="text-xl font-bold text-white">{product.title}</h3>
						</div>
					</div>

					<!-- Content -->
					<div class="p-6">
						<p class="mb-4 text-sm leading-relaxed text-gray-600">
							{product.description}
						</p>
						<div
							class="flex items-center text-sm font-medium text-purple-600 transition-colors group-hover:text-purple-700"
						>
							<span>Launch Tool</span>
							<SafeIcon
								iconName="mdi-light:arrow-right"
								customClass="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform"
							/>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer Section -->
		<footer class="mt-20 text-center">
			<div class="rounded-2xl border border-purple-100 bg-white/50 p-8 backdrop-blur-sm">
				<h2 class="mb-4 text-2xl font-bold text-gray-800">Professional Data Processing</h2>
				<p class="mx-auto max-w-2xl text-gray-600">
					Our comprehensive suite of data tools provides everything you need for data parsing,
					format conversion, and code optimization. Built with modern web technologies for maximum
					performance and usability. Powered by <a
						href="https://id.linkedin.com/in/hady-eka-saputra"
						target="_blank"
						class="text-purple-600 hover:text-purple-700">Hady Eka Saputra</a
					>
				</p>
			</div>
		</footer>
	</div>
</main>
