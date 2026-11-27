/**
 * Site-wide constants & static copy.
 *
 * Single source of truth for every piece of static text and configuration
 * used across the landing page and shared layout components. Edit here —
 * not inside components — to update branding, navigation, marketing copy,
 * and links.
 */

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------
export const BRAND = {
	name: 'DataCodec',
	version: 'STUDIO V2.4',
	/** Short blurb used in the footer. */
	description: 'Built half-asleep with Svelte and modern web tech.'
};

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------
export const LINKS = {
	source: 'https://github.com/hadyjsc/datacodec',
	docs: 'https://github.com/hadyjsc/datacodec/blob/main/README.md',
	author: 'https://id.linkedin.com/in/hady-eka-saputra',
	reportIssue: 'https://github.com/hadyjsc/datacodec/issues'
};

export const AUTHOR = {
	name: 'Hady Eka Saputra',
	/** Initials shown in the footer avatar. */
	initials: 'HES',
	role: 'Designed & Maintained by'
};

// ---------------------------------------------------------------------------
// Top navigation
// ---------------------------------------------------------------------------
export const NAV_LINKS = [
	{ label: 'Tools', href: '#tools' },
	{ label: 'Features', href: '#features' },
	{ label: 'Banking Hub', href: '#tools', category: 'banking', live: true },
	{ label: 'Docs', href: LINKS.docs, external: true }
];

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export const HERO = {
	/**
	 * Title is split into segments so a portion can be rendered with the
	 * gradient accent while the rest stays solid slate.
	 */
	title: [
		{ text: 'Developer Payload Editors, Codecs & ', gradient: false },
		{ text: 'Banking Message Tools', gradient: true }
	],
	subtitle:
		'High-performance workspace built for engineers handling complex binary encodings, ISO financial interchanges, schema conversions, and payload sanitization.',
	chips: [
		{ icon: 'mdi:lightning-bolt', label: 'Sub-millisecond DFDL & ISO parsing' },
		{ icon: 'mdi:lock', label: 'Zero Server Storage' },
		{ icon: 'mdi:cellphone', label: 'Offline Ready PWA' }
	]
};

// ---------------------------------------------------------------------------
// Enterprise capability section
// ---------------------------------------------------------------------------
export const ENTERPRISE = {
	eyebrow: 'ENTERPRISE CAPABILITY',
	title: 'Professional Data Processing Architecture',
	subtitle:
		'Engineered for developers, QA engineers, and payment architects requiring deterministic accuracy with sensitive telemetry and payload structures.',
	features: [
		{
			icon: 'mdi:shield-check',
			tone: 'green',
			title: 'Zero-Server Storage',
			description:
				'All conversions and decoding happen entirely in your local browser runtime via WebAssembly and Web Workers. Financial records never touch remote logging nodes.'
		},
		{
			icon: 'mdi:chip',
			tone: 'purple',
			title: 'High-Throughput Parsers',
			description:
				'Handle megabyte-sized fixed-length files, large ISO bitmapped batches, and complex XSD representations without memory throttling or DOM freezing.'
		},
		{
			icon: 'mdi:swap-horizontal-circle',
			tone: 'cyan',
			title: 'Multi-Format Interoperability',
			description:
				'Easily pivot payloads between legacy IBM EBCDIC mainframes, modern OpenAPI REST schemas, and modern JSON/YAML clouds with uniform ergonomics.'
		}
	]
};

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
export const FOOTER = {
	copyright: `© ${new Date().getFullYear()} DataCodec Open Source Suite. Released under the MIT License.`
};