<script>
	/**
	 * Centered section heading with an eyebrow label, title, and subtitle.
	 * Reused by the tools section and the enterprise-capability section.
	 */
	let { eyebrow = '', title = '', subtitle = '' } = $props();
</script>

<div class="mx-auto max-w-3xl text-center">
	{#if eyebrow}
		<p class="font-display text-sm font-bold tracking-widest text-violet-600">{eyebrow}</p>
	{/if}
	{#if title}
		<h2 class="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
			{title}
		</h2>
	{/if}
	{#if subtitle}
		<p class="mt-4 text-lg leading-relaxed text-ink-soft">
			{subtitle}
		</p>
	{/if}
</div>