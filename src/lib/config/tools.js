/**
 * Tool registry & categorization.
 *
 * The single source of truth for every tool card rendered on the landing
 * page. Adding a tool here automatically makes it searchable, filterable,
 * and renders a card — no component changes required.
 */

/**
 * Accent colour tokens. Each key maps to the text-colour classes used for a
 * card's "Launch Tool" link so it matches that card's gradient. Centralising
 * them here keeps hover states consistent and avoids scattering class strings.
 */
export const ACCENTS = {
	blue: 'text-blue-600 group-hover:text-blue-700',
	green: 'text-emerald-600 group-hover:text-emerald-700',
	teal: 'text-teal-600 group-hover:text-teal-700',
	purple: 'text-violet-600 group-hover:text-violet-700',
	orange: 'text-orange-600 group-hover:text-orange-700',
	pink: 'text-pink-600 group-hover:text-pink-700',
	magenta: 'text-fuchsia-600 group-hover:text-fuchsia-700'
};

/**
 * Filter categories. `id` is matched against each tool's `category` field;
 * `label` is rendered on the filter chips. 'all' is prepended in the UI.
 */
export const CATEGORIES = [
	{ id: 'banking', label: 'Banking & Financial' },
	{ id: 'encoders', label: 'Encoders & Decoders' },
	{ id: 'formats', label: 'Formats & Specs' },
	{ id: 'code', label: 'Code Utilities' }
];

/** Sentinel used by the "All Tools" filter chip. */
export const ALL_CATEGORY = 'all';

/**
 * The full tool catalog. Order determines grid placement (row-major,
 * 4-per-row on desktop).
 */
export const TOOLS = [
	{
		id: 'fixed-length',
		title: 'Fixed-Length Data Parser',
		description:
			'Parse fixed-width text files with customizable field definitions, offsets, and row-level validation.',
		icon: 'mdi-light:format-list-bulleted',
		gradient: 'from-blue-600 to-cyan-500',
		tag: 'SPECS',
		category: 'formats',
		meta: 'Schema Offset',
		accent: 'blue',
		link: '/fixed-length-parsed'
	},
	{
		id: 'json-tools',
		title: 'JSON Tools',
		description:
			'Advanced JSON editor with interactive tree view, side-by-side diff capabilities, and syntax formatting.',
		icon: 'codex:curly-brackets',
		gradient: 'from-emerald-500 to-green-600',
		tag: 'UTILITY',
		category: 'code',
		meta: 'Tree & diff',
		accent: 'green',
		link: '/json-tools'
	},
	{
		id: 'excel-to-openapi',
		title: 'Excel to OpenAPI',
		description:
			'Dynamically map any Excel sheet to OpenAPI/Swagger with custom headers, parameter columns, and row selectors.',
		icon: 'material-symbols:api',
		gradient: 'from-teal-500 to-emerald-600',
		tag: 'SPECS',
		category: 'formats',
		meta: 'OAS 3.0 / 3.1',
		accent: 'teal',
		link: '/excel-to-openapi'
	},
	{
		id: 'iso8583',
		title: 'Message ISO 8583 Studio',
		description:
			'Build, decode, validate, and simulate ISO 8583 financial messages with primary/secondary bitmap dissection.',
		icon: 'mdi:credit-card-outline',
		gradient: 'from-blue-600 to-indigo-500',
		tag: 'BANKING',
		category: 'banking',
		meta: 'MTI / Bitmap Engine',
		accent: 'blue',
		link: '/iso8583-message-studio'
	},
	{
		id: 'dfdl-parser',
		title: 'DFDL Parser',
		description:
			'Data Format Description Language parser for complex commercial, telecom, and defense binary data streams.',
		icon: 'mdi:text-box-search-outline',
		gradient: 'from-violet-600 to-purple-500',
		tag: 'SPECS',
		category: 'formats',
		meta: 'DFDL 1.0',
		accent: 'purple',
		link: '/dfdl-parser'
	},
	{
		id: 'js-minify',
		title: 'JS Minify/Unminify',
		description:
			'Minify and beautify JavaScript payloads with advanced AST optimization, dead code removal, and sourcemap tools.',
		icon: 'mdi:language-javascript',
		gradient: 'from-amber-500 to-orange-600',
		tag: 'UTILITY',
		category: 'code',
		meta: 'Terser / Prettier',
		accent: 'orange',
		link: '/js-minify'
	},
	{
		id: 'hex-ebcdic',
		title: 'Hex to EBCDIC Converter',
		description:
			'Convert between Hexadecimal, ASCII, EBCDIC (CP037/CP500), and Base64 codec representations seamlessly.',
		icon: 'mdi:hexagon-multiple-outline',
		gradient: 'from-pink-500 to-rose-500',
		tag: 'CODEC',
		category: 'encoders',
		meta: 'Mainframe Codepage',
		accent: 'pink',
		link: '/hex-ebcdic-converter'
	},
	{
		id: 'xml-editor',
		title: 'XML Editor',
		description:
			'Format, validate, and convert XML payloads to JSON, fixed-width records, CSV tables, with automated entity escaping.',
		icon: 'mdi:file-xml-box',
		gradient: 'from-orange-500 to-amber-500',
		tag: 'UTILITY',
		category: 'formats',
		meta: 'XML Schema / XSLT',
		accent: 'orange',
		link: '/xml-editor'
	},
	{
		id: 'base64-decoder',
		title: 'Base64 Auto-Detect & Decoder',
		description:
			'Automatically detect and decode raw Base64, Base64URL, binary streams, gzip buffers, and data URIs.',
		icon: 'mdi-light:lock-open',
		gradient: 'from-fuchsia-500 to-pink-500',
		tag: 'CODEC',
		category: 'encoders',
		meta: 'MIME Sniffer',
		accent: 'magenta',
		link: '/base64-decoder'
	},
	{
		id: 'yaml-tools',
		title: 'YAML Tools',
		description:
			'Validate, lint, format, merge, diff, and filter multi-document YAML manifests and Kubernetes specifications.',
		icon: 'mdi:file-code',
		gradient: 'from-emerald-500 to-teal-600',
		tag: 'UTILITY',
		category: 'formats',
		meta: 'Multi-doc / Linter',
		accent: 'green',
		link: '/yaml-tools'
	},
	{
		id: 'abcs-converter',
		title: 'ABCS Converter',
		description:
			'Convert legacy ABCS binary segments to readable JSON structures using dynamic DFDL XSD definitions.',
		icon: 'mdi:file-document-edit-outline',
		gradient: 'from-blue-600 to-cyan-500',
		tag: 'BANKING',
		category: 'banking',
		meta: 'DFDL XSD Engine',
		accent: 'blue',
		link: '/abcs-converter'
	}
];

/**
 * Filter the catalog by a free-text query and/or category id.
 *
 * @param {{search?: string, category?: string}} options
 * @returns {typeof TOOLS}
 */
export function filterTools({ search = '', category = ALL_CATEGORY } = {}) {
	const q = search.trim().toLowerCase();
	return TOOLS.filter((tool) => {
		const matchesCategory = category === ALL_CATEGORY || tool.category === category;
		if (!matchesCategory) return false;
		if (!q) return true;
		return (
			tool.title.toLowerCase().includes(q) ||
			tool.description.toLowerCase().includes(q) ||
			tool.tag.toLowerCase().includes(q) ||
			tool.meta.toLowerCase().includes(q)
		);
	});
}