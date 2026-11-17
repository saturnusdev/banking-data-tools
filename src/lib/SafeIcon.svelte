<!-- Safe Icon wrapper to prevent node.remove errors -->
<script>
	import Icon from '@iconify/svelte';
	
	let { iconName = '', customClass = '', children = null } = $props();
	
	let hasError = $state(false);
	
	// Handle icon loading errors
	function handleIconError() {
		hasError = true;
		console.warn('Icon failed to load, using fallback');
	}
	
	let safeClass = $derived(`${customClass} ${hasError ? 'opacity-50' : ''}`);
</script>

{#if hasError}
	<!-- Fallback emoji when icon fails -->
	<div class={safeClass}>
		{#if children}
			{@render children()}
		{:else}
			<span class="inline-block">⚙️</span>
		{/if}
	</div>
{:else}
	<!-- Try to load icon -->
	<div class={safeClass}>
		<Icon icon={iconName} class={customClass} onerror={handleIconError} />
	</div>
{/if}
