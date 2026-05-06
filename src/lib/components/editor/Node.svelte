<script lang="ts">
	import type { TreeNode } from '$lib/json/tree';
	import { createEventDispatcher } from 'svelte';

	export let node: TreeNode;
	export let expanded: Set<string>;

	const dispatch = createEventDispatcher<{ select: string }>();

	$: isOpen = expanded?.has(node.id) ?? false;
	$: hasChildren = !!node.children?.length;

	function toggle() {
		if (!hasChildren) return;

		if (expanded.has(node.id)) {
			expanded.delete(node.id);
		} else {
			expanded.add(node.id);
		}

		expanded = new Set(expanded);
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
				on:click={toggle}
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
			on:click={() => dispatch('select', node.path)}
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
				<svelte:self node={child} {expanded} on:select={(e) => dispatch('select', e.detail)} />
			{/each}
		</div>
	{/if}
</div>
