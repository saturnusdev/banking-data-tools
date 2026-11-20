<script lang="ts">
	import type { XmlTreeNode } from '#lib/xml/tree';
	import XmlNode from './XmlNode.svelte';

	let { node, expanded, onselect }: { node: XmlTreeNode; expanded: Set<string>; onselect?: (path: string) => void } =
		$props();

	let children = $derived(node.children ?? []);
	let attributes = $derived(children.filter((c) => c.type === 'attribute'));
	let content = $derived(children.filter((c) => c.type !== 'attribute'));
	let isOpen = $derived(expanded?.has(node.id) ?? false);
	let hasChildren = $derived(content.length > 0);

	function toggle() {
		if (!hasChildren) return;
		if (expanded.has(node.id)) {
			expanded.delete(node.id);
		} else {
			expanded.add(node.id);
		}
	}
</script>

<div class="ml-2 select-none font-mono text-[13px] leading-5">
	<div class="flex items-center gap-1 rounded px-1 hover:bg-sky-50">
		{#if hasChildren}
			<button
				type="button"
				class="w-4 shrink-0 text-center text-gray-500 focus:outline-none"
				aria-label={isOpen ? 'Collapse node' : 'Expand node'}
				onclick={toggle}
			>
				{isOpen ? '▾' : '▸'}
			</button>
		{:else}
			<span class="w-4 shrink-0"></span>
		{/if}

		<button
			type="button"
			class="flex items-center gap-1 text-left focus:outline-none"
			onclick={() => onselect?.(node.path)}
		>
			{#if node.type === 'element'}
				<span class="font-semibold text-blue-700">&lt;{node.key}</span>
				{#each attributes as attr}
					<span class="text-purple-600">
						{attr.key.slice(1)}=<span class="text-amber-700">&quot;{attr.value}&quot;</span>
					</span>
				{/each}
				{#if hasChildren || node.value}
					<span class="font-semibold text-blue-700">&gt;</span>
				{:else}
					<span class="font-semibold text-blue-700">/&gt;</span>
				{/if}
				{#if !hasChildren && node.value}
					<span class="text-green-700">{node.value}</span>
					<span class="font-semibold text-blue-700">&lt;/{node.key}&gt;</span>
				{/if}
			{:else if node.type === 'attribute'}
				<span class="text-purple-600">
					{node.key.slice(1)}=<span class="text-amber-700">&quot;{node.value}&quot;</span>
				</span>
			{:else if node.type === 'comment'}
				<span class="text-gray-400">&lt;!--{node.value}--&gt;</span>
			{:else if node.type === 'cdata'}
				<span class="text-orange-600">&lt;![CDATA[{node.value}]]&gt;</span>
			{:else if node.type === 'declaration' || node.type === 'pi'}
				<span class="text-gray-500">&lt;?{node.value}?&gt;</span>
			{:else}
				<span class="text-green-700">{node.value}</span>
			{/if}
		</button>
	</div>

	{#if isOpen && hasChildren}
		<div class="ml-4">
			{#each content as child}
				<XmlNode node={child} {expanded} {onselect} />
			{/each}
			{#if node.type === 'element'}
				<div class="flex items-center gap-1">
					<span class="w-4 shrink-0"></span>
					<span class="font-semibold text-blue-700">&lt;/{node.key}&gt;</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
