<script>
	/**
	 * Enterprise-capability card. Renders an icon tile, title, and
	 * description. Driven entirely by a feature object from site config.
	 */
	import SafeIcon from '#lib/SafeIcon.svelte';

	let { feature } = $props();

	const tiles = {
		green: 'bg-emerald-50 text-emerald-600',
		purple: 'bg-violet-50 text-violet-600',
		cyan: 'bg-cyan-50 text-cyan-600',
		blue: 'bg-blue-50 text-blue-600'
	};

	const tileCls = $derived(tiles[feature.tone] ?? tiles.blue);
</script>

<div class="rounded-xl border border-line bg-white p-6 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_12px_24px_-4px_rgba(15,23,42,0.08)]">
	<span class="flex h-11 w-11 items-center justify-center rounded-lg {tileCls}">
		<SafeIcon iconName={feature.icon} customClass="h-6 w-6" />
	</span>
	<h3 class="font-display mt-4 text-lg font-bold text-ink">{feature.title}</h3>
	<p class="mt-2 text-sm leading-relaxed text-ink-soft">{feature.description}</p>
</div>