<script lang="ts">
	import type { TreeNode } from '$lib/json/tree';
	import Node from './Node.svelte';
  import { collectNodeIds } from '$lib/json/tree';
	import { createEventDispatcher } from 'svelte';

	export let tree: TreeNode[] = [];
	let expanded = new Set<string>();

	const dispatch = createEventDispatcher<{ select: string }>();

	let allNodeIds: string[] = [];

	// Recalculate when tree changes
	$: allNodeIds = collectNodeIds(tree);

	function expandAll() {
		expanded = new Set(allNodeIds);
	}

	function collapseAll() {
		expanded = new Set(); // 🔥 reassign
	}
</script>
<div class="flex flex-col h-full bg-gray-100 ">
  <div class="flex gap-2 p-2 bg-gray-100 border-b border-gray-700">
    <button
      type="button"
      class="px-2 py-1 text-xs bg-orange-700 rounded"
      on:click={expandAll}
    >
      Expand all
    </button>
  
    <button
      type="button"
      class="px-2 py-1 text-xs bg-green-700 rounded"
      on:click={collapseAll}
    >
      Collapse all
    </button>
  </div>

  <div class="flex-1 overflow-auto">
    <div class="text-md w-72 bg-gray-100 p-2">
      {#each tree as node}
        <Node {node} {expanded} on:select={(e) => dispatch('select', e.detail)} />
      {/each}
    </div>
  </div>
</div>
