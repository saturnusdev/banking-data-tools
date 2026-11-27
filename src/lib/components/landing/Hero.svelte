<script>
	/**
	 * Landing hero: privacy badge, gradient-accented headline, subtitle, and
	 * the three capability chips. All copy comes from site config.
	 */
	import SafeIcon from '#lib/SafeIcon.svelte';
	import { HERO } from '#lib/config/site.js';
</script>

<section class="dot-grid relative overflow-hidden border-b border-line">
	<div class="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
		<h1 class="font-display mx-auto max-w-5xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
			{#each HERO.title as segment}
				{#if segment.gradient}
					<span class="bg-gradient-to-r from-blue-600 via-violet-600 to-violet-500 bg-clip-text text-transparent">
						{segment.text}
					</span>
				{:else}
					<span>{segment.text}</span>
				{/if}
			{/each}
		</h1>

		<p class="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">
			{HERO.subtitle}
		</p>

		<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
			{#each HERO.chips as chip}
				<span class="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft shadow-sm">
					<SafeIcon iconName={chip.icon} customClass="h-4 w-4 text-violet-600" />
					{chip.label}
				</span>
			{/each}
		</div>
	</div>
</section>