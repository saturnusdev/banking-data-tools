<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

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
	<link rel="icon" href="/favicon.svg" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="theme-color" content="#8b5cf6" />
</svelte:head>
{@render children()}
