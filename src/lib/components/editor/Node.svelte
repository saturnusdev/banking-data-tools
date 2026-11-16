<script lang="ts">
	import type { TreeNode } from '#lib/json/tree';
	import Node from './Node.svelte';

	let { node, expanded, onselect } = $props();

	let isOpen = $derived(expanded?.has(node.id) ?? false);
	let hasChildren = $derived(!!node.children?.length);

	function toggle() {
		if (!hasChildren) return;

		if (expanded.has(node.id)) {
			expanded.delete(node.id);
		} else {
			expanded.add(node.id);
		}
	}

	function typeColor(type: string) {
		return {
			object: 'text-purple-400',
			array: 'text-indigo-400',
			string: 'text-green-400',
			number: 'text-blue-400',
			boolean: 'text-yellow-400',
			null: 'text-black-400'
		}[type];
	}
</script>

<div class="ml-2 select-none">
	<div class="flex items-center gap-1 rounded px-1 hover:bg-gray-200">
		{#if hasChildren}
			<!-- Expand / collapse button -->
			<button
				type="button"
				class="w-4 text-center text-black focus:outline-none"
				aria-label={isOpen ? 'Collapse node' : 'Expand node'}
				onclick={toggle}
			>
				{isOpen ? '▾' : '▸'}
			</button>
		{:else}
			<span class="w-4"></span>
		{/if}

		<!-- Node selection button -->
		<button
			type="button"
			class="flex items-center gap-2 text-left focus:outline-none"
			onclick={() => onselect?.(node.path)}
		>
			<span class="text-black">{node.key}</span>
			<span class={`text-xs ${typeColor(node.type)}`}>
				{node.type}
			</span>
		</button>
	</div>

	{#if isOpen && hasChildren}
		<div class="ml-4">
			{#each node.children as child}
				<Node node={child} {expanded} onselect={onselect} />
			{/each}
		</div>
	{/if}
</div>
