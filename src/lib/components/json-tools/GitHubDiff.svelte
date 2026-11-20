<script lang="ts">
	import { diffLines } from 'diff';

	let { oldText = '', newText = '', unitLabel = 'JSON' }: { oldText?: string; newText?: string; unitLabel?: string } =
		$props();

	type RowType = 'add' | 'del' | 'context';
	interface Row {
		type: RowType;
		text: string;
		oldNo: number;
		newNo: number;
	}

	// Flatten diffLines() runs into per-line rows with GitHub-style old/new line numbers.
	let rows = $derived.by(() => {
		const out: Row[] = [];
		let oldNo = 0;
		let newNo = 0;
		for (const part of diffLines(oldText, newText)) {
			const lines = part.value.replace(/\n$/, '').split('\n');
			for (const line of lines) {
				if (part.added) {
					newNo += 1;
					out.push({ type: 'add', text: line, oldNo: 0, newNo });
				} else if (part.removed) {
					oldNo += 1;
					out.push({ type: 'del', text: line, oldNo, newNo: 0 });
				} else {
					oldNo += 1;
					newNo += 1;
					out.push({ type: 'context', text: line, oldNo, newNo });
				}
			}
		}
		return out;
	});

	let addedCount = $derived(rows.filter((r) => r.type === 'add').length);
	let removedCount = $derived(rows.filter((r) => r.type === 'del').length);
	let hasChanges = $derived(addedCount > 0 || removedCount > 0);
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden">
	<div class="flex items-center justify-between bg-slate-800 px-3 py-1.5 text-xs text-gray-300">
		<span class="flex items-center gap-3">
			<span class="flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-full bg-[#1a7f37]"></span>
				Added
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-full bg-[#cf222e]"></span>
				Removed
			</span>
		</span>
		<span>{addedCount} added · {removedCount} removed</span>
	</div>
	{#if rows.length === 0}
		<div class="px-4 py-8 text-center text-sm text-gray-400">Click Compare to see the diff.</div>
	{:else if !hasChanges}
		<div class="px-4 py-8 text-center text-sm text-gray-400">
			No differences — the two {unitLabel} documents are identical.
		</div>
	{:else}
		<div class="max-h-[20rem] overflow-auto text-[12px] leading-5 font-mono">
			{#each rows as row}
				<div
					class="flex items-stretch {row.type === 'add'
						? 'bg-[#e6ffec]'
						: row.type === 'del'
							? 'bg-[#ffebe9]'
							: ''}"
				>
					<span class="w-10 shrink-0 select-none text-right pr-2 text-gray-400">{row.oldNo || ''}</span>
					<span class="w-10 shrink-0 select-none text-right pr-2 text-gray-400">{row.newNo || ''}</span>
					<span
						class="w-5 shrink-0 select-none text-center font-bold {row.type === 'add'
							? 'text-[#1a7f37]'
							: row.type === 'del'
								? 'text-[#cf222e]'
								: 'text-gray-400'}"
					>
						{row.type === 'add' ? '+' : row.type === 'del' ? '-' : ''}
					</span>
					<span
						class="whitespace-pre pr-3 {row.type === 'add'
							? 'text-[#1a7f37]'
							: row.type === 'del'
								? 'text-[#cf222e]'
								: 'text-gray-600'}"
					>
						{row.text || ' '}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
