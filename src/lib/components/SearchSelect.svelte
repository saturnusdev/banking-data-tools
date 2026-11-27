<script>
	/**
	 * Searchable dropdown (combobox). A styled trigger shows the current
	 * selection; opening it reveals a filter box plus a filtered list, so large
	 * option sets (e.g. many schema root elements) stay easy to navigate.
	 *
	 * Fully keyboard accessible: ArrowUp/Down to move, Enter to select,
	 * Escape to close. Click-outside closes it.
	 *
	 * @type {{ value: string, options: {value:string,label:string}[], placeholder?: string,
	 *         searchPlaceholder?: string, emptyMessage?: string, disabled?: boolean, id?: string }}
	 */
	let {
		value = $bindable(''),
		options = [],
		placeholder = 'Select…',
		searchPlaceholder = 'Type to search…',
		emptyMessage = 'No matches',
		disabled = false,
		id = ''
	} = $props();

	let open = $state(false);
	let query = $state('');
	let highlighted = $state(0);
	let rootEl = $state(null);
	let searchEl = $state(null);

	// Options filtered by the current query (label or value, case-insensitive).
	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter(
			(o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)
		);
	});

	// The label of the currently-selected value (for the trigger).
	const selectedLabel = $derived(
		options.find((o) => String(o.value) === String(value))?.label ?? ''
	);

	// Keep the highlighted row in range as the filtered list changes.
	$effect(() => {
		if (highlighted >= filtered.length) highlighted = Math.max(0, filtered.length - 1);
	});

	function openPanel() {
		if (disabled) return;
		open = true;
		query = '';
		highlighted = 0;
		// Focus the search box once it renders.
		queueMicrotask(() => searchEl?.focus());
	}

	function closePanel() {
		open = false;
	}

	function choose(option) {
		value = option.value;
		open = false;
	}

	function onKeydown(e) {
		if (!open) {
			if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
				e.preventDefault();
				openPanel();
			}
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			closePanel();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(highlighted + 1, filtered.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const opt = filtered[highlighted];
			if (opt) choose(opt);
		}
	}

	function onDocumentClick(e) {
		if (rootEl && !rootEl.contains(e.target)) closePanel();
	}

	$effect(() => {
		document.addEventListener('mousedown', onDocumentClick);
		return () => document.removeEventListener('mousedown', onDocumentClick);
	});
</script>

<div bind:this={rootEl} class="relative">
	<!-- Trigger -->
	<button
		type="button"
		{id}
		disabled={disabled}
		onclick={open ? closePanel : openPanel}
		onkeydown={onKeydown}
		aria-haspopup="listbox"
		aria-expanded={open}
		class="w-full flex items-center justify-between gap-2 px-4 py-3 border-2 rounded-xl text-left font-mono transition-all focus:outline-none {disabled
			? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
			: open
				? 'border-indigo-400 bg-white ring-4 ring-indigo-100 text-ink'
				: 'border-gray-200 bg-white text-ink hover:border-indigo-300'}"
	>
		<span class="truncate {selectedLabel ? '' : 'text-gray-400'}">
			{selectedLabel || placeholder}
		</span>
		<svg
			class="h-5 w-5 shrink-0 text-gray-400 transition-transform {open ? 'rotate-180' : ''}"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	<!-- Panel -->
	{#if open}
		<div
			class="absolute z-30 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
			role="listbox"
		>
			<div class="p-2 border-b border-gray-100">
				<input
					bind:this={searchEl}
					type="text"
					bind:value={query}
					{searchPlaceholder}
					class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
				/>
			</div>
			<ul class="max-h-60 overflow-y-auto py-1">
				{#each filtered as opt, i (opt.value)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={String(opt.value) === String(value)}
							onclick={() => choose(opt)}
							onmousemove={() => (highlighted = i)}
							class="w-full text-left px-4 py-2 font-mono text-sm transition-colors {i ===
							highlighted
								? 'bg-indigo-50 text-indigo-700'
								: 'text-ink hover:bg-canvas'} {String(opt.value) === String(value)
								? 'font-semibold'
								: ''}"
						>
							{opt.label}
						</button>
					</li>
				{/each}
				{#if filtered.length === 0}
					<li class="px-4 py-3 text-sm text-gray-400">{emptyMessage}</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>