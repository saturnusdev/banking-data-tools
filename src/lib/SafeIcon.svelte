<!-- Safe Icon wrapper to prevent node.remove errors -->
<script>
	import Icon from '@iconify/svelte';
	
	export let iconName = '';
	export let customClass = '';
	
	let hasError = false;
	
	// Handle icon loading errors
	function handleIconError() {
		hasError = true;
		console.warn('Icon failed to load, using fallback');
	}
	
	$: safeClass = `${customClass} ${hasError ? 'opacity-50' : ''}`;
</script>

{#if hasError}
	<!-- Fallback emoji when icon fails -->
	<div class={safeClass}>
		<slot>
			<span class="inline-block">⚙️</span>
		</slot>
	</div>
{:else}
	<!-- Try to load icon -->
	<div class={safeClass}>
		<Icon icon={iconName} class={customClass} on:error={handleIconError} />
	</div>
{/if}
