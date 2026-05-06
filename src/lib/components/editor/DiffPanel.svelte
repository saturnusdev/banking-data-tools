<script lang="ts">
	import { onMount } from 'svelte';
	import { createDiffEditor } from '$lib/plugin/monaco/diff';
	import { createEventDispatcher } from 'svelte';

	export let diffData;
	let el: HTMLDivElement;
	const dispatch = createEventDispatcher();

	onMount(() => {
		createDiffEditor(el, diffData.original, diffData.modified);
	});
</script>

<div class="absolute inset-0 bg-black/80">
	<div class="absolute inset-10 bg-gray-900">
		<div class="flex justify-between bg-gray-800 p-2">
			<span>Diff View</span>
			<button class="cursor-pointer" on:click={() => dispatch('close')}>Close</button>
		</div>
		<div bind:this={el} class="h-full"></div>
	</div>
</div>
