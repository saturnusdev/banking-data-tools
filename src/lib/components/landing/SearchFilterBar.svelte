<script>
	/**
	 * Search input + category filter chips for the tool catalog.
	 *
	 * `search` and `category` are bindable so the parent owns the state while
	 * this component stays presentational. `count`/`total` drive the result badge.
	 */
	import SafeIcon from '#lib/SafeIcon.svelte';
	import { CATEGORIES, ALL_CATEGORY } from '#lib/config/tools.js';

	let {
		search = $bindable(''),
		category = $bindable(ALL_CATEGORY),
		count = 0,
		total = 0
	} = $props();

	/** Chip options: "All" first, then the real categories. */
	const options = [{ id: ALL_CATEGORY, label: 'All Tools' }, ...CATEGORIES];
</script>

<div class="border-b border-line bg-white">
	<div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
		<!-- Search field -->
		<div class="relative w-full lg:max-w-sm">
			<SafeIcon
				iconName="mdi:magnify"
				customClass="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
			/>
			<input
				id="tool-search"
				type="search"
				bind:value={search}
				placeholder="Search ISO 8583, EBCDIC, Base64, JSON..."
				class="w-full rounded-lg border border-line bg-white py-2.5 pl-11 pr-20 text-sm text-ink placeholder:text-ink-soft/70 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
			/>
			<span class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-canvas px-2 py-0.5 font-mono text-xs text-ink-soft">
				{count} / {total}
			</span>
		</div>

		<!-- Category filters -->
		<div class="flex flex-wrap items-center gap-2">
			{#each options as opt}
				<button
					type="button"
					onclick={() => (category = opt.id)}
					class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all {category ===
					opt.id
						? 'border-violet-600 bg-violet-600 text-white shadow-sm'
						: 'border-line bg-white text-ink-soft hover:border-slate-300 hover:text-ink'}"
					aria-pressed={category === opt.id}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>
</div>