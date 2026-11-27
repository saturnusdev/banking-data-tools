<script>
	/**
	 * Reusable brand mark + wordmark. Used in the navbar and footer so the
	 * logo is defined in exactly one place.
	 */
	import logo from '#lib/assets/icon.png';
	import { BRAND } from '#lib/config/site.js';

	let { href = '/', size = 'md' } = $props();

	const sizes = {
		sm: { box: 'h-8 w-8', text: 'text-lg' },
		md: { box: 'h-9 w-9', text: 'text-xl' }
	};

	const s = $derived(sizes[size] ?? sizes.md);
</script>

<a href={href} class="group flex items-center gap-2.5">
	<img
		src={logo}
		alt="{BRAND.name} logo"
		class="{s.box} rounded-lg object-contain transition-transform group-hover:scale-105"
	/>
	<span class="font-display {s.text} font-bold tracking-tight text-ink">
		Data<span class="text-blue-600">Codec</span>
	</span>
</a>