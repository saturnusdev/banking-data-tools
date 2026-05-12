<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	// SEO metadata
	const seoMeta = $derived({
		title: 'Banking Data Tools - Professional Data Processing Suite',
		description: 'Professional data processing tools for developers and data analysts. JSON tools, ISO8583 parser, DFDL parser, Base64 decoder, and more.',
		keywords: 'JSON tools, data parser, ISO8583, DFDL, Base64 decoder, banking data, data processing, developer tools',
		author: 'Hady Eka Saputra',
		image: '/og-image.png',
		url: `https://www.banking-tools.java-sc.com${$page.url.pathname}`,
		type: 'website'
	});

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
			navigator.serviceWorker.getRegistrations().then(function(registrations) {
				for(let registration of registrations) {
					registration.unregister().then(function(boolean) {
						console.log('🗑️ Service Worker unregistered:', boolean);
					}).catch(function(error) {
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
			Node.prototype.remove = function() {
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
	<meta property="og:site_name" content="Banking Data Tools" />
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
	<meta name="apple-mobile-web-app-title" content="Banking Data Tools" />
	
	<!-- Structured Data (JSON-LD) -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebApplication",
			"name": "Banking Data Tools",
			"description": "Professional data processing tools for developers and data analysts",
			"url": "https://www.banking-tools.java-sc.com",
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
				"YAML to JSON Converter",
				"JavaScript Minifier",
				"Hex to EBCDIC Converter",
				"Fixed-Length Data Parser"
			]
		}
	</script>
</svelte:head>
{@render children()}
