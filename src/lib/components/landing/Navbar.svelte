<script>
	/**
	 * Sticky top navigation. Renders the brand, primary links, and the source
	 * link. `onCategory` keeps this decoupled from page state — it fires when a
	 * nav link that filters by category (e.g. Banking Hub) is clicked.
	 */
	import SafeIcon from '#lib/SafeIcon.svelte';
	import BrandLogo from './BrandLogo.svelte';
	import Pill from './Pill.svelte';
	import { BRAND, NAV_LINKS, LINKS } from '#lib/config/site.js';

	let { onCategory = () => {} } = $props();

	let mobileOpen = $state(false);

	function handleLinkClick(link, event) {
		// Let external links behave normally.
		if (link.external) return;
		event.preventDefault();
		mobileOpen = false;
		if (link.category) {
			onCategory(link.category);
		}
		// Smooth-scroll to the anchored section.
		const el = document.querySelector(link.href);
		el?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<header class="sticky top-0 z-50 border-b border-line bg-white/80 backdrop-blur-md">
	<nav class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
		<div class="flex items-center gap-3">
			<BrandLogo />
			<span class="hidden sm:inline-block">
				<Pill label={BRAND.version} tone="version" class="font-mono tracking-wide" />
			</span>
		</div>

		<!-- Desktop links -->
		<ul class="hidden items-center gap-1 md:flex">
			{#each NAV_LINKS as link}
				<li>
					<a
						href={link.href}
						target={link.external ? '_blank' : undefined}
						rel={link.external ? 'noreferrer' : undefined}
						onclick={(e) => handleLinkClick(link, e)}
						class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
					>
						{link.label}
						{#if link.live}
							<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>

		<div class="flex items-center gap-2">
			<a
				href={LINKS.source}
				target="_blank"
				rel="noreferrer"
				class="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:text-ink"
				aria-label="Source repository"
			>
				<SafeIcon iconName="mdi:github" customClass="h-5 w-5" />
			</a>

			<!-- Mobile menu toggle -->
			<button
				type="button"
				onclick={() => (mobileOpen = !mobileOpen)}
				class="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-soft md:hidden"
				aria-label="Toggle menu"
				aria-expanded={mobileOpen}
			>
				<SafeIcon iconName={mobileOpen ? 'mdi-light:close' : 'mdi-light:menu'} customClass="h-5 w-5" />
			</button>
		</div>
	</nav>

	<!-- Mobile dropdown -->
	{#if mobileOpen}
		<div class="border-t border-line bg-white md:hidden">
			<ul class="mx-auto max-w-7xl space-y-1 px-4 py-3">
				{#each NAV_LINKS as link}
					<li>
						<a
							href={link.href}
							target={link.external ? '_blank' : undefined}
							rel={link.external ? 'noreferrer' : undefined}
							onclick={(e) => handleLinkClick(link, e)}
							class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink"
						>
							{link.label}
							{#if link.live}
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</header>