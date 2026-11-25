<script>
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getSeoForPath } from '#lib/seo/config.js';

	let { children } = $props();

	// Route-aware SEO metadata — automatically uses optimized meta per page
	const seoMeta = $derived(getSeoForPath(page.url.pathname));

	// Global error handling for Iconify/Svelte issues
	function handleIconifyError(event) {
		if (event.target && event.target.nodeType === 1) {
			console.warn('Iconify DOM manipulation prevented:', event);
		}
	}

	// Initialize Iconify error handling and unregister service workers
	onMount(() => {
		// Unregister any existing service workers
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then(function (registrations) {
				for (let registration of registrations) {
					registration
						.unregister()
						.then(function (boolean) {
							console.log('🗑️ Service Worker unregistered:', boolean);
						})
						.catch(function (error) {
							console.log('❌ Failed to unregister service worker:', error);
						});
				}
			});
		}

		// Prevent Iconify DOM manipulation errors
		if (typeof window !== 'undefined') {
			window.addEventListener('error', handleIconifyError, true);

			// Override remove method to prevent errors
			const originalRemove = Node.prototype.remove;
			Node.prototype.remove = function () {
				if (this.parentNode) {
					try {
						return originalRemove.call(this);
					} catch (e) {
						console.warn('Node.remove error caught:', e);
						return null;
					}
				}
				return null;
			};
		}
	});
</script>

<svelte:head>
	<!-- Basic Meta Tags -->
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="theme-color" content="#8b5cf6" />

	<!-- SEO Meta Tags -->
	<title>{seoMeta.title}</title>
	<meta name="description" content={seoMeta.description} />
	<meta name="keywords" content={seoMeta.keywords} />
	<meta name="author" content={seoMeta.author} />
	<meta name="robots" content="index, follow" />
	<meta name="language" content="English" />

	<!-- Open Graph Meta Tags -->
	<meta property="og:title" content={seoMeta.title} />
	<meta property="og:description" content={seoMeta.description} />
	<meta property="og:image" content={seoMeta.image} />
	<meta property="og:url" content={seoMeta.url} />
	<meta property="og:type" content={seoMeta.type} />
	<meta property="og:site_name" content="DataCodec - Developer Payload Editors, Codecs & Banking Message Tools" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter Card Meta Tags -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seoMeta.title} />
	<meta name="twitter:description" content={seoMeta.description} />
	<meta name="twitter:image" content={seoMeta.image} />
	<meta name="twitter:creator" content="@yourusername" />

	<!-- Additional SEO Tags -->
	<link rel="canonical" href={seoMeta.url} />
	<link rel="icon" href="/favicon.svg" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="format-detection" content="telephone=no" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="DataCodec - Developer Payload Editors, Codecs & Banking Message Tools" />

	<!-- Structured Data (JSON-LD) — route-aware -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebApplication",
			"name": {seoMeta.title},
			"description": {seoMeta.description},
			"url": {seoMeta.url},
			"author": {
				"@type": "Person",
				"name": "Hady Eka Saputra"
			},
			"applicationCategory": "DeveloperApplication",
			"operatingSystem": "Any",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "USD"
			},
			"featureList": [
				"JSON Editor with Tree View",
				"ISO8583 Parser",
				"DFDL Parser",
				"Base64 Decoder",
				"YAML Tools (validate, lint, convert, merge, diff)",
				"JavaScript Minifier",
				"Hex to EBCDIC Converter",
				"Fixed-Length Data Parser",
				"XML Editor",
				"ABCS Converter",
				"Excel to OpenAPI Generator"
			]
		}
	</script>
	<!-- Breadcrumb structured data -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			"itemListElement": [
				{
					"@type": "ListItem",
					"position": 1,
					"name": "Home",
					"item": "https://www.banking-tools.java-sc.com/"
				},
				{
					"@type": "ListItem",
					"position": 2,
					"name": {seoMeta.title},
					"item": {seoMeta.url}
				}
			]
		}
	</script>
</svelte:head>
{@render children()}
