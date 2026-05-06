<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { filterByKey } from '$lib/json/filter';
	// import { registerJsonSchema } from '$lib/plugin/monaco/schema';
	// import { schemas } from '$lib/json/schemas';

	export let editor: any;
	const dispatch = createEventDispatcher();

	let filterKey = '';
	let filterValue = '';
	let schemaKey = '';

	async function beautify() {
		editor.getAction('editor.action.formatDocument').run();
	}

	async function applyFilter() {
		const original = editor.getValue();
		const parsed = JSON.parse(original);
		const result = filterByKey(parsed, filterKey, filterValue || undefined);

		dispatch('showDiff', {
			original,
			modified: JSON.stringify(result, null, 2)
		});
	}

	async function applySchema() {
		// if (!schemaKey) return;
		// await registerJsonSchema(`schema://${schemaKey}`, schemas[schemaKey]);
	}
</script>

<div class="flex gap-2 bg-gray-800 p-2 text-sm">
	<input class="rounded bg-gray-700 px-2 py-1" placeholder="Filter key" bind:value={filterKey} />
	<input class="rounded bg-gray-700 px-2 py-1" placeholder="Value" bind:value={filterValue} />
	<button class="rounded bg-blue-600 px-2 py-1 cursor-pointer" on:click={applyFilter}>Filter</button>

	<select class="rounded bg-gray-700 px-2 py-1" bind:value={schemaKey} on:change={applySchema}>
		<option value="">Schema</option>
		<option value="user">User</option>
		<option value="order">Order</option>
	</select>
</div>