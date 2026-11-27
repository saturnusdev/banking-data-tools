<script>
	/**
	 * Site footer: brand + description, author card, and a copyright bar.
	 * All copy comes from site config.
	 */
	import BrandLogo from './BrandLogo.svelte';
	import { FOOTER, AUTHOR, BRAND, LINKS } from '#lib/config/site.js';
</script>

<footer class="border-t border-line bg-white">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
			<div class="max-w-md">
				<BrandLogo size="sm" />
				<p class="mt-4 text-sm leading-relaxed text-ink-soft">{BRAND.description}</p>
			</div>

			<!-- Author card -->
			<a
				href={LINKS.author}
				target="_blank"
				rel="noreferrer"
				class="flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
			>
				<span class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-bold text-white">
					{AUTHOR.initials}
				</span>
				<span>
					<span class="block text-xs text-ink-soft">{AUTHOR.role}</span>
					<span class="block font-display text-sm font-bold text-ink">{AUTHOR.name}</span>
				</span>
			</a>
		</div>

		<div class="mt-10 border-t border-line pt-6">
			<p class="text-center text-sm text-ink-soft">{FOOTER.copyright}</p>
		</div>
	</div>
</footer>