<script>
	/**
	 * Generic pill / badge. Reusable for the hero privacy badge, card
	 * category tags, version badges, and status chips.
	 *
	 * `tone` picks a pre-tuned colour scheme; pass `class` to override.
	 */
	import SafeIcon from '#lib/SafeIcon.svelte';

	let { label, icon = '', tone = 'neutral', class: klass = '' } = $props();

	const tones = {
		neutral: 'bg-white/20 text-white ring-white/30',
		brand: 'bg-blue-50 text-blue-700 ring-blue-200',
		version: 'bg-violet-50 text-violet-700 ring-violet-200',
		privacy: 'bg-white text-violet-700 ring-violet-200 shadow-sm'
	};

	const cls = $derived(tones[tone] ?? tones.neutral);
</script>

<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 {cls} {klass}">
	{#if icon}
		<SafeIcon iconName={icon} customClass="h-3.5 w-3.5" />
	{/if}
	{#if label}
		{label}
	{/if}
</span>