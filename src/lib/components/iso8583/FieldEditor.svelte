<script>
	import { validateField } from '#lib/plugin/iso8583/fields';

	let {
		fields,
		values,
		onchange
	} = $props();

	// fields: FieldMeta[], values: reactive object (index -> string), onchange: fn(index, value)
	let search = $state('');
	let showEmptyOnly = $state(false);

	const visibleFields = $derived(
		fields.filter((f) => {
			if (showEmptyOnly && values[f.index]) return false;
			if (!search.trim()) return true;
			const q = search.trim().toLowerCase();
			return (
				String(f.index).includes(q) ||
				f.name.toLowerCase().includes(q) ||
				f.type.toLowerCase().includes(q)
			);
		})
	);

	function setValue(index, value) {
		values[index] = value;
		onchange?.(index, value);
	}

	function clearAll() {
		for (const f of fields) {
			values[f.index] = '';
		}
		onchange?.(-1, '');
	}
</script>

<div class="space-y-4">
	<!-- Toolbar -->
	<div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
		<div class="flex-1 max-w-sm">
			<input
				type="text"
				bind:value={search}
				placeholder="Search field index, name, or type..."
				class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none"
			/>
		</div>
		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
				<input type="checkbox" bind:checked={showEmptyOnly} class="rounded border-gray-300 text-teal-600 focus:ring-teal-400" />
				Only non-empty
			</label>
			<button
				onclick={clearAll}
				class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 transition-colors"
			>
				Clear All
			</button>
		</div>
	</div>

	<!-- Table -->
	<div class="overflow-x-auto rounded-xl border border-gray-200">
		<table class="w-full text-sm">
			<thead>
				<tr class="bg-gradient-to-r from-teal-50 to-cyan-50 text-left">
					<th class="px-3 py-2 font-semibold text-teal-700">DE</th>
					<th class="px-3 py-2 font-semibold text-teal-700">Type</th>
					<th class="px-3 py-2 font-semibold text-teal-700">Length</th>
					<th class="px-3 py-2 font-semibold text-teal-700">Field Name</th>
					<th class="px-3 py-2 font-semibold text-teal-700">Value</th>
				</tr>
			</thead>
			<tbody>
				{#each visibleFields as field (field.index)}
					{@const issues = values[field.index] ? validateField(field, values[field.index]) : []}
					<tr class="border-t border-gray-100 hover:bg-teal-50/50 transition-colors">
						<td class="px-3 py-1.5 font-mono font-semibold text-teal-600">{field.index}</td>
						<td class="px-3 py-1.5">
							<span class="inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
								{field.type}
								{#if field.lengthType !== 'fixed'}<span class="text-purple-600">/{field.lengthType}</span>{/if}
							</span>
						</td>
						<td class="px-3 py-1.5 font-mono text-xs text-gray-500">{field.maxLength}</td>
						<td class="px-3 py-1.5 text-gray-700">{field.name}</td>
						<td class="px-3 py-1.5">
							<input
								type="text"
								value={values[field.index] ?? ''}
								oninput={(e) => setValue(field.index, e.currentTarget.value)}
								placeholder={field.type === 'b' ? 'Hex bytes...' : 'Value...'}
								class="w-full min-w-40 rounded border px-2 py-1 font-mono text-xs focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none {issues.length ? 'border-rose-300 bg-rose-50' : 'border-gray-200'}"
							/>
							{#if issues.length}
								<p class="mt-0.5 text-[10px] text-rose-500">{issues[0]}</p>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
