<script>
	/**
	 * Tool card — the single reusable component for every entry in the
	 * catalog. Renders the gradient header (icon + category tag), the
	 * description, and the footer (meta + "Launch Tool →" link).
	 *
	 * Everything is driven by the `tool` object from #lib/config/tools.js,
	 * so new tools need no component changes.
	 */
	import { goto } from '$app/navigation';
	import SafeIcon from '#lib/SafeIcon.svelte';
	import Pill from './Pill.svelte';
	import { ACCENTS } from '#lib/config/tools.js';

	let { tool } = $props();

	function launch() {
		goto(tool.link);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	onclick={launch}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && launch()}
	tabindex="0"
	role="link"
	aria-label="Launch {tool.title}"
	class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_4px_12px_-2px_rgba(15,23,42,0.04),0_2px_4px_-2px_rgba(15,23,42,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-4px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
>
	<!-- Gradient header -->
	<div class="relative overflow-hidden bg-gradient-to-br {tool.gradient} p-5">
		<div class="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10"></div>
		<div class="relative z-10 flex items-start justify-between gap-3">
			<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
				<SafeIcon iconName={tool.icon} customClass="h-5 w-5 text-white" />
			</span>
			<Pill label={tool.tag} tone="neutral" class="shrink-0 uppercase tracking-wide" />
		</div>
		<h3 class="font-display relative z-10 mt-4 text-lg font-bold text-white">{tool.title}</h3>
	</div>

	<!-- Body -->
	<div class="flex flex-1 flex-col p-5">
		<p class="flex-1 text-sm leading-relaxed text-ink-soft">{tool.description}</p>
		<div class="mt-5 flex items-center justify-between border-t border-line pt-4">
			<span class="font-mono text-xs text-ink-soft/80">{tool.meta}</span>
			<span class="flex items-center gap-1 text-sm font-semibold transition-colors {ACCENTS[tool.accent]}">
				Launch Tool
				<SafeIcon
					iconName="mdi-light:arrow-right"
					customClass="h-4 w-4 transition-transform group-hover:translate-x-1"
				/>
			</span>
		</div>
	</div>
</div>