/**
 * User-defined conversion rules for the ABCS converter.
 *
 * Every bank/vendor-specific naming standard — how to recognise each header
 * layer, which field declares its length, and which signature markers bound it —
 * lives HERE, persisted in the user's browser (localStorage) and NEVER in the
 * committed source. This keeps copyright-sensitive vendor naming conventions out
 * of the published codebase.
 *
 * Defaults are intentionally empty. The user describes their own conventions
 * (e.g. "the transport header root starts with XXXXXXX and its length field is
 * FOOLEN"; "the application header root starts with YYYXXXX and ends at a field
 * whose value is *ZZZ"). The converter reads these rules to know how to proceed.
 */

const RULES_KEY = 'abcs-conversion-rules';

/**
 * @typedef {Object} HeaderLayer
 * @property {string} id           - stable identifier
 * @property {string} label        - display name (user-defined)
 * @property {string} sourceFile   - optional uploaded schema this layer is linked to
 * @property {string} rootPattern  - root/element name prefix that identifies this layer
 * @property {string} lengthField  - field whose value declares this layer's byte length
 * @property {string} signatureField - optional field that must be present/valid
 * @property {string} signatureValue  - optional expected value of signatureField
 */

/**
 * @typedef {Object} ConversionRules
 * @property {HeaderLayer[]} headerLayers - ordered header layers (outermost first)
 * @property {string} bodyRootPattern     - optional root prefix identifying the body
 */

/** Empty defaults — no vendor naming is baked into the source. */
export const DEFAULT_RULES = {
	headerLayers: [
		{ id: 'layer-1', label: 'Transport Header', sourceFile: '', rootPattern: '', lengthField: '', signatureField: '', signatureValue: '' },
		{ id: 'layer-2', label: 'Application Header', sourceFile: '', rootPattern: '', lengthField: '', signatureField: '', signatureValue: '' }
	],
	bodyRootPattern: ''
};

/** @returns {ConversionRules} rules merged over defaults (from localStorage). */
export function loadRules() {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_RULES);
	try {
		const raw = localStorage.getItem(RULES_KEY);
		if (!raw) return structuredClone(DEFAULT_RULES);
		const parsed = JSON.parse(raw);
		return normalizeRules(parsed);
	} catch {
		return structuredClone(DEFAULT_RULES);
	}
}

/** Persist rules to localStorage. */
export function saveRules(rules) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(RULES_KEY, JSON.stringify(normalizeRules(rules)));
}

/** Coerce arbitrary input into a well-formed rules object. */
export function normalizeRules(input) {
	const src = input && typeof input === 'object' ? input : {};
	const layers = Array.isArray(src.headerLayers) ? src.headerLayers : [];
	return {
		headerLayers: layers.map((l, i) => ({
			id: String(l?.id || `layer-${i + 1}`),
			label: String(l?.label || `Header Layer ${i + 1}`),
			sourceFile: String(l?.sourceFile ?? ''),
			rootPattern: String(l?.rootPattern ?? ''),
			lengthField: String(l?.lengthField ?? ''),
			signatureField: String(l?.signatureField ?? ''),
			signatureValue: String(l?.signatureValue ?? '')
		})),
		bodyRootPattern: String(src.bodyRootPattern ?? '')
	};
}

/**
 * Match a root/element name against a user pattern.
 * Empty pattern matches nothing (the user must define their convention).
 * Matching is a case-insensitive "starts with" on the prefix, or a plain
 * "contains" when the user wraps the pattern in `*...*`.
 *
 * @param {string} name
 * @param {string} pattern
 * @returns {boolean}
 */
export function matchesPattern(name, pattern) {
	const p = String(pattern || '').trim();
	if (!p) return false;
	const n = String(name || '');
	if (p.startsWith('*') && p.endsWith('*') && p.length > 1) {
		return n.toLowerCase().includes(p.slice(1, -1).toLowerCase());
	}
	return n.toLowerCase().startsWith(p.toLowerCase());
}