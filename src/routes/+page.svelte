<script>
	import { onMount } from 'svelte';
	import SafeIcon from '#lib/SafeIcon.svelte';
	import Navbar from '#lib/components/landing/Navbar.svelte';
	import Hero from '#lib/components/landing/Hero.svelte';
	import SearchFilterBar from '#lib/components/landing/SearchFilterBar.svelte';
	import ToolCard from '#lib/components/landing/ToolCard.svelte';
	import SectionHeading from '#lib/components/landing/SectionHeading.svelte';
	import FeatureCard from '#lib/components/landing/FeatureCard.svelte';
	import Footer from '#lib/components/landing/Footer.svelte';
	import { performanceMonitor } from '#lib/performance';
	import { TOOLS, ALL_CATEGORY, filterTools } from '#lib/config/tools.js';
	import { ENTERPRISE } from '#lib/config/site.js';

	// Catalog filter state — owned here, shared down via bindable props.
	let search = $state('');
	let category = $state(ALL_CATEGORY);

	// Reactively filtered tool list.
	const filtered = $derived(filterTools({ search, category }));

	onMount(() => {
		performanceMonitor.observePageLoad();

		// ⌘K / Ctrl+K focuses the tool search from anywhere on the page.
		function onKeydown(e) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				focusSearch();
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	/** Scroll to the catalog and focus its search field. */
	function focusSearch() {
		document.querySelector('#tools')?.scrollIntoView({ behavior: 'smooth' });
		// Wait for the smooth scroll to settle before focusing.
		setTimeout(() => document.getElementById('tool-search')?.focus({ preventScroll: true }), 350);
	}

	/** Navbar "Banking Hub" (and similar) links pre-select a category. */
	function handleCategory(id) {
		category = id;
	}
</script>

<div class="min-h-screen bg-canvas">
	<Navbar onCategory={handleCategory} />
	<Hero />

	<!-- Tools catalog -->
	<main id="tools" class="scroll-mt-16">
		<SearchFilterBar bind:search bind:category count={filtered.length} total={TOOLS.length} />

		<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center rounded-xl border border-line bg-white py-20 text-center">
					<SafeIcon iconName="mdi-light:magnify-remove-outline" customClass="h-10 w-10 text-ink-soft/50" />
					<p class="font-display mt-4 text-lg font-bold text-ink">No tools found</p>
					<p class="mt-1 text-sm text-ink-soft">Try a different keyword or clear the filters.</p>
					<button
						type="button"
						onclick={() => {
							search = '';
							category = ALL_CATEGORY;
						}}
						class="mt-5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-slate-300"
					>
						Reset filters
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each filtered as tool (tool.id)}
						<ToolCard {tool} />
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<!-- Enterprise capability -->
	<section id="features" class="scroll-mt-16 border-t border-line bg-white">
		<div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
			<SectionHeading eyebrow={ENTERPRISE.eyebrow} title={ENTERPRISE.title} subtitle={ENTERPRISE.subtitle} />
			<div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
				{#each ENTERPRISE.features as feature}
					<FeatureCard {feature} />
				{/each}
			</div>
		</div>
	</section>

	<Footer />
</div>