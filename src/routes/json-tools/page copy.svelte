<!-- <script lang="ts">
	import { onMount } from 'svelte';
	import { createJsonEditor } from '$lib/plugin/monaco/monaco';
	import { beautifyJson } from '$lib/json/beautify';
	import { validateJson } from '$lib/json/validate';
	import { filterByKey } from '$lib/json/filter';
	import { mapByKey } from '$lib/json/map';
    import { buildTree } from '$lib/json/tree';
    import { parseJsonInWorker } from '$lib/json/worker';

    import Toolbar from './Toolbar.svelte';
    import JsonTree from './JsonTree.svelte';
    import DiffPanel from './DiffPanel.svelte';

	let editorEl: HTMLDivElement | null = null;
	let editor: any = null;
	let error = '';
	let filterKey = '';
	let filterValue = '';
	let mapKey = '';

	onMount(async () => {
		if (!editorEl) return;

		editor = await createJsonEditor(editorEl);
	});

	function beautify() {
		if (!editor) {
			error = 'Editor not ready';
			return;
		}

		try {
			editor.setValue(beautifyJson(editor.getValue()));
			error = '';
		} catch (e: any) {
			error = e.message;
		}
	}

	function filterJson() {
        if (!editor) {
			error = 'Editor not ready';
			return;
		}

		try {
			const json = JSON.parse(editor.getValue());
			const result = filterByKey(json, filterKey, filterValue || undefined);
			editor.setValue(JSON.stringify(result, null, 2));
		} catch (e: any) {
			error = e.message;
		}
	}

	function mapJson() {
        if (!editor) {
			error = 'Editor not ready';
			return;
		}

		try {
			const json = JSON.parse(editor.getValue());
			const result = mapByKey(json, mapKey);
			editor.setValue(JSON.stringify(result, null, 2));
		} catch (e: any) {
			error = e.message;
		}
	}

    function revealPath(editor: any, path: string) {
        if (!editor) {
			error = 'Editor not ready';
			return;
		}

        const model = editor.getModel();
        if (!model) return;

        const text = model.getValue();
        const index = text.indexOf(`"${path.split('.').pop()}"`);
        if (index < 0) return;

        const pos = model.getPositionAt(index);
        editor.revealPositionInCenter(pos);
        editor.setPosition(pos);
    }

</script>

<div class="flex h-screen flex-col bg-gray-900 text-white">
	<div class="flex gap-2 bg-gray-800 p-3">
		<button
			class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
			on:click={beautify} disabled={!editor}>Beautify</button
		>

		<input class="input" placeholder="Filter key" bind:value={filterKey} />
		<input class="input" placeholder="Value (optional)" bind:value={filterValue} />
		<button
			class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
			on:click={filterJson}>Filter</button
		>

		<input class="input" placeholder="Map key" bind:value={mapKey} />
		<button
			class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
			on:click={mapJson}>Map</button
		>
	</div>

	{#if error}
		<div class="bg-red-600 p-2 text-sm">{error}</div>
	{/if}

	<div bind:this={editorEl} class="flex-1"></div>
</div> -->
