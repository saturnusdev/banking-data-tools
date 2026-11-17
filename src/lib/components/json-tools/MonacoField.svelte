<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createJsonEditor } from '#lib/plugin/monaco/monaco';

	let {
		value = $bindable(''),
		readonly = false,
		language = 'json',
		height = '14rem'
	}: { value?: string; readonly?: boolean; language?: string; height?: string } = $props();

	let el: HTMLDivElement;
	let editor: any;
	let ready = $state(false);

	onMount(async () => {
		editor = await createJsonEditor(el, value, language);
		editor.updateOptions({ readOnly: readonly });

		editor.onDidChangeModelContent(() => {
			if (ready && !readonly) value = editor.getValue();
		});

		ready = true;
	});

	onDestroy(() => {
		if (editor) editor.dispose();
	});

	// Sync external value changes (e.g. programmatic output) into the editor.
	$effect(() => {
		if (ready && editor && editor.getValue() !== value) {
			editor.setValue(value);
		}
	});
</script>

<div
	bind:this={el}
	class="w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
	style="height: {height};"
></div>
