<script lang="ts">
	import type { XmlTreeNode } from '#lib/xml/tree';
	import { collectXmlNodeIds } from '#lib/xml/tree';
	import { SvelteSet } from 'svelte/reactivity';
	import XmlNode from './XmlNode.svelte';

	let { tree = [], onselect }: { tree?: XmlTreeNode[]; onselect?: (path: string) => void } = $props();

	// `SvelteSet` (not a plain `Set`) so that per-node `add()`/`delete()` mutations
	// in XmlNode are reactive. A `$state(new Set())` is not proxied by Svelte, so
	// mutating it in place would not update the tree (only reassignment works).
	let expanded = $state(new SvelteSet<string>());
	let allNodeIds = $derived(collectXmlNodeIds(tree));

	function expandAll() {
		expanded = new SvelteSet(allNodeIds);
	}

	function collapseAll() {
		expanded = new SvelteSet();
	}
</script>

<div class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
	<div class="flex items-center gap-2 border-b border-gray-200 bg-gray-100 p-2">
		<button
			type="button"
			class="rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700"
			onclick={expandAll}
		>
			Expand all
		</button>
		<button
			type="button"
			class="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
			onclick={collapseAll}
		>
			Collapse all
		</button>
		<span class="ml-auto text-xs text-gray-500">{tree.length} root node(s)</span>
	</div>

	<div class="max-h-96 flex-1 overflow-auto p-2">
		{#if tree.length === 0}
			<div class="p-4 text-center text-sm text-gray-400">
				No nodes — click Build Tree after entering XML to view its structure.
			</div>
		{:else}
			{#each tree as node}
				<XmlNode {node} {expanded} {onselect} />
			{/each}
		{/if}
	</div>
</div>
