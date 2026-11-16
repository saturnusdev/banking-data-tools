/**
 * ABCS Segment -> JSON converter.
 *
 * Parses a binary file containing ABCS (Application Control Block Service) segments
 * using a DFDL-annotated XSD schema, producing a JSON infoset equivalent to:
 *
 *   daffodil parse \
 *     --schema abcs.xsd \
 *     --root RMQK1 \
 *     --infoset-type json \
 *     --output response.json \
 *     response-k1.bin
 *
 * The parser reads DFDL properties (`dfdl:length`, `dfdl:encoding`,
 * `dfdl:byteOrder`, `dfdl:initiator`, ...) either as direct attributes on
 * `xs:element` or inside `xs:annotation/xs:appinfo` DFDL elements.
 */

/* ------------------------------------------------------------------ */
/* EBCDIC (CP037) -> ASCII conversion table                            */
/* ------------------------------------------------------------------ */

const EBCDIC_MAP = (() => {
	const map = new Array(256);
	for (let i = 0; i < 256; i++) map[i] = '\uFFFD'; // replacement char by default

	const set = (hex, ch) => {
		map[parseInt(hex, 16)] = ch;
	};

	// Control / blanks
	set('00', '\u0000');
	set('05', '\t');
	set('15', '\n');
	set('25', '\n');
	set('37', '\u0017');

	// Space & punctuation
	set('40', ' ');
	set('4A', '\u00A2'); // cent
	set('4B', '.');
	set('4C', '<');
	set('4D', '(');
	set('4E', '+');
	set('4F', '|');
	set('50', '&');
	set('5A', '!');
	set('5B', '$');
	set('5C', '*');
	set('5D', ')');
	set('5E', ';');
	set('5F', '\u00AC'); // not sign
	set('60', '-');
	set('61', '/');
	set('6A', '\u00A6'); // broken bar
	set('6B', ',');
	set('6C', '%');
	set('6D', '_');
	set('6E', '>');
	set('6F', '?');
	set('79', '`');
	set('7A', ':');
	set('7B', '#');
	set('7C', '@');
	set('7D', "'");
	set('7E', '=');
	set('7F', '"');

	// Lowercase
	set('81', 'a');
	set('82', 'b');
	set('83', 'c');
	set('84', 'd');
	set('85', 'e');
	set('86', 'f');
	set('87', 'g');
	set('88', 'h');
	set('89', 'i');
	set('91', 'j');
	set('92', 'k');
	set('93', 'l');
	set('94', 'm');
	set('95', 'n');
	set('96', 'o');
	set('97', 'p');
	set('98', 'q');
	set('99', 'r');
	set('A2', 's');
	set('A3', 't');
	set('A4', 'u');
	set('A5', 'v');
	set('A6', 'w');
	set('A7', 'x');
	set('A8', 'y');
	set('A9', 'z');

	// Uppercase
	set('C1', 'A');
	set('C2', 'B');
	set('C3', 'C');
	set('C4', 'D');
	set('C5', 'E');
	set('C6', 'F');
	set('C7', 'G');
	set('C8', 'H');
	set('C9', 'I');
	set('D1', 'J');
	set('D2', 'K');
	set('D3', 'L');
	set('D4', 'M');
	set('D5', 'N');
	set('D6', 'O');
	set('D7', 'P');
	set('D8', 'Q');
	set('D9', 'R');
	set('E2', 'S');
	set('E3', 'T');
	set('E4', 'U');
	set('E5', 'V');
	set('E6', 'W');
	set('E7', 'X');
	set('E8', 'Y');
	set('E9', 'Z');

	// Digits
	set('F0', '0');
	set('F1', '1');
	set('F2', '2');
	set('F3', '3');
	set('F4', '4');
	set('F5', '5');
	set('F6', '6');
	set('F7', '7');
	set('F8', '8');
	set('F9', '9');

	// Remaining CP037 control & symbol code points (complete the table)
	set('01', '\x01'); set('02', '\x02'); set('03', '\x03'); set('04', '\x9C');
	set('06', '\x86'); set('07', '\x7F'); set('08', '\x97'); set('09', '\x8D');
	set('0A', '\x8E'); set('0B', '\x0B'); set('0C', '\x0C'); set('0D', '\x0D');
	set('0E', '\x0E'); set('0F', '\x0F'); set('10', '\x10'); set('11', '\x11');
	set('12', '\x12'); set('13', '\x13'); set('14', '\x9D'); set('16', '\x08');
	set('17', '\x87'); set('18', '\x18'); set('19', '\x19'); set('1A', '\x92');
	set('1B', '\x8F'); set('1C', '\x1C'); set('1D', '\x1D'); set('1E', '\x1E');
	set('1F', '\x1F'); set('20', '\x80'); set('21', '\x81'); set('22', '\x82');
	set('23', '\x83'); set('24', '\x84'); set('26', '\x17'); set('27', '\x1B');
	set('28', '\x88'); set('29', '\x89'); set('2A', '\x8A'); set('2B', '\x8B');
	set('2C', '\x8C'); set('2D', '\x05'); set('2E', '\x06'); set('2F', '\x07');
	set('30', '\x90'); set('31', '\x91'); set('32', '\x16'); set('33', '\x93');
	set('34', '\x94'); set('35', '\x95'); set('36', '\x96'); set('38', '\x98');
	set('39', '\x99'); set('3A', '\x9A'); set('3B', '\x9B'); set('3C', '\x14');
	set('3D', '\x15'); set('3E', '\x9E'); set('3F', '\x1A'); set('41', '\xA0');
	set('42', '\xE2'); set('43', '\xE4'); set('44', '\xE0'); set('45', '\xE1');
	set('46', '\xE3'); set('47', '\xE5'); set('48', '\xE7'); set('49', '\xF1');
	set('51', '\xE9'); set('52', '\xEA'); set('53', '\xEB'); set('54', '\xE8');
	set('55', '\xED'); set('56', '\xEE'); set('57', '\xEF'); set('58', '\xEC');
	set('59', '\xDF'); set('62', '\xC2'); set('63', '\xC4'); set('64', '\xC0');
	set('65', '\xC1'); set('66', '\xC3'); set('67', '\xC5'); set('68', '\xC7');
	set('69', '\xD1'); set('70', '\xF8'); set('71', '\xC9'); set('72', '\xCA');
	set('73', '\xCB'); set('74', '\xC8'); set('75', '\xCD'); set('76', '\xCE');
	set('77', '\xCF'); set('78', '\xCC'); set('80', '\xD8'); set('8A', '\xAB');
	set('8B', '\xBB'); set('8C', '\xF0'); set('8D', '\xFD'); set('8E', '\xFE');
	set('8F', '\xB1'); set('90', '\xB0'); set('9A', '\xAA'); set('9B', '\xBA');
	set('9C', '\xE6'); set('9D', '\xB8'); set('9E', '\xC6'); set('9F', '\xA4');
	set('A0', '\xB5'); set('A1', '\x7E'); set('AA', '\xA1'); set('AB', '\xBF');
	set('AC', '\xD0'); set('AD', '\xDD'); set('AE', '\xDE'); set('AF', '\xAE');
	set('B0', '\x5E'); set('B1', '\xA3'); set('B2', '\xA5'); set('B3', '\xB7');
	set('B4', '\xA9'); set('B5', '\xA7'); set('B6', '\xB6'); set('B7', '\xBC');
	set('B8', '\xBD'); set('B9', '\xBE'); set('BA', '\x5B'); set('BB', '\x5D');
	set('BC', '\xAF'); set('BD', '\xA8'); set('BE', '\xB4'); set('BF', '\xD7');
	set('C0', '\x7B'); set('CA', '\xAD'); set('CB', '\xF4'); set('CC', '\xF6');
	set('CD', '\xF2'); set('CE', '\xF3'); set('CF', '\xF5'); set('D0', '\x7D');
	set('DA', '\xB9'); set('DB', '\xFB'); set('DC', '\xFC'); set('DD', '\xFA');
	set('DE', '\xF9'); set('DF', '\xFF'); set('E0', '\x5C'); set('E1', '\xF7');
	set('EA', '\xB2'); set('EB', '\xD4'); set('EC', '\xD6'); set('ED', '\xD2');
	set('EE', '\xD3'); set('EF', '\xD5'); set('FA', '\xB3'); set('FB', '\xDB');
	set('FC', '\xDC'); set('FD', '\xD9'); set('FE', '\xDA'); set('FF', '\x9F');

	return map;
})();


/** Convert a Uint8Array of EBCDIC bytes into an ASCII string. */
export function ebcdicBytesToString(bytes) {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		out += EBCDIC_MAP[bytes[i]];
	}
	return out;
}

/** True if the character is a printable ASCII char (or whitespace). */
function isPrintableChar(ch) {
	if (ch === '\uFFFD') return false;
	const code = ch.charCodeAt(0);
	return (code >= 0x20 && code <= 0x7e) || ch === '\t' || ch === '\n' || ch === '\r';
}

/* Reverse map: ASCII char -> EBCDIC byte (first occurrence wins). */
const ASCII_TO_EBCDIC = (() => {
	const rev = {};
	for (let b = 0; b < 256; b++) {
		const ch = EBCDIC_MAP[b];
		if (ch !== '\uFFFD' && !(ch in rev)) rev[ch] = b;
	}
	return rev;
})();

/** Encode a string into bytes using the given encoding ('ASCII' or 'EBCDIC'). */
export function encodeString(str, encoding) {
	const enc = String(encoding || 'ASCII').toUpperCase();
	const isEbcdic = enc === 'EBCDIC' || enc === 'EBCDIC-CP037' || enc === 'IBM037' || enc === 'CP037';
	const out = [];
	for (const ch of str) {
		if (isEbcdic) {
			const b = ASCII_TO_EBCDIC[ch];
			if (b !== undefined) {
				out.push(b);
			} else {
				const code = ch.charCodeAt(0);
				out.push(code <= 0xff ? code : 0x20);
			}
		} else {
			const code = ch.charCodeAt(0);
			out.push(code <= 0xff ? code : 0x20);
		}
	}
	return new Uint8Array(out);
}

/** Find every occurrence of a byte pattern within a byte array. */
function findAllOccurrences(haystack, needle) {
	const positions = [];
	if (!needle || needle.length === 0 || haystack.length < needle.length) return positions;
	outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) continue outer;
		}
		positions.push(i);
	}
	return positions;
}

/**
 * Detect whether a binary buffer is best decoded as ASCII or EBCDIC by
 * comparing how many bytes are printable under each interpretation.
 * @returns {'ASCII' | 'EBCDIC'}
 */
export function detectTextEncoding(bytes) {
	if (!bytes || bytes.length === 0) return 'ASCII';
	let ebcdicGood = 0;
	let asciiGood = 0;
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		if (isPrintableChar(EBCDIC_MAP[b])) ebcdicGood++;
		if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e)) asciiGood++;
	}
	const ebcdicScore = ebcdicGood / bytes.length;
	const asciiScore = asciiGood / bytes.length;
	// Prefer ASCII when it is clearly more printable; default to EBCDIC on ties
	return asciiScore > ebcdicScore ? 'ASCII' : 'EBCDIC';
}

/** Convert a Uint8Array into a hex string. */
export function bytesToHex(bytes) {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		out += bytes[i].toString(16).padStart(2, '0').toUpperCase();
	}
	return out;
}

/** Convert a hex string into a Uint8Array. */
export function hexToBytes(hex) {
	const clean = hex.replace(/\s+/g, '').replace(/^0x/i, '');
	const even = clean.length % 2 === 0 ? clean : '0' + clean;
	const bytes = new Uint8Array(even.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(even.substr(i * 2, 2), 16);
	}
	return bytes;
}

/** Decode base64 string into a Uint8Array (handles the `X'...'` wrapper). */
export function base64ToBytes(b64) {
	let cleaned = b64.trim();
	// Strip X'...' wrapper used by IBM/ESB payloads.
	const xMatch = cleaned.match(/^X?'([0-9A-Fa-f\s]+)'$/);
	if (xMatch) {
		return hexToBytes(xMatch[1]);
	}
	cleaned = cleaned.replace(/\s+/g, '');
	const binary = atob(cleaned);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/* ------------------------------------------------------------------ */
/* XML helpers (namespace agnostic via localName)                      */
/* ------------------------------------------------------------------ */

function getAttr(el, localName) {
	if (!el || !el.attributes) return null;
	for (const attr of el.attributes) {
		const name = attr.localName || attr.name.split(':').pop();
		if (name === localName) return attr.value;
	}
	return null;
}

function childByLocalName(el, localName) {
	if (!el) return null;
	for (const child of el.children || []) {
		const name = child.localName || child.nodeName.split(':').pop();
		if (name === localName) return child;
	}
	return null;
}

function childrenByLocalName(el, localName) {
	const result = [];
	if (!el) return result;
	for (const child of el.children || []) {
		const name = child.localName || child.nodeName.split(':').pop();
		if (name === localName) result.push(child);
	}
	return result;
}


/**
 * Collect DFDL properties from an XSD element. Looks both at direct
 * `dfdl:*` attributes and at the `xs:annotation/xs:appinfo/dfdl:*` children.
 */
function collectDfdlProps(el) {
	const props = {};

	// Direct attributes on the element (both standard and dfdl:*)
	for (const attr of el.attributes || []) {
		const local = attr.localName || attr.name.split(':').pop();
		props[local] = attr.value;
	}

	// Appinfo DFDL properties (authoritative over direct attributes)
	const annotation = childByLocalName(el, 'annotation');
	if (annotation) {
		for (const appinfo of childrenByLocalName(annotation, 'appinfo')) {
			for (const dfdlEl of appinfo.children || []) {
				const dfdlName = dfdlEl.localName || dfdlEl.nodeName.split(':').pop();
				const propsObj = {};
				for (const attr of dfdlEl.attributes || []) {
					const local = attr.localName || attr.name.split(':').pop();
					propsObj[local] = attr.value;
				}
				Object.assign(props, propsObj);
				props._dfdlElement = dfdlName;
			}
		}
	}

	return props;
}

/**
 * Find the segment initiator (e.g. `..K1`) for a root element by scanning the
 * element, its annotation, its complexType and its sequence/children.
 * @returns {string|null}
 */
function collectInitiator(el, typeRegistry) {
	if (!el) return null;

	const own = collectDfdlProps(el);
	if (own.initiator) return own.initiator;
	if (own.init) return own.init;

	// Inline complexType
	const complex = childByLocalName(el, 'complexType');
	if (complex) {
		const fromComplex = collectInitiatorFromComplex(complex);
		if (fromComplex) return fromComplex;
	}

	// Named type reference
	const typeName = getAttr(el, 'type');
	if (typeName && typeRegistry && typeRegistry[typeName]) {
		const fromType = collectInitiatorFromComplex(typeRegistry[typeName]);
		if (fromType) return fromType;
	}

	return null;
}

function collectInitiatorFromComplex(complexType) {
	if (!complexType) return null;
	const cp = collectDfdlProps(complexType);
	if (cp.initiator) return cp.initiator;
	if (cp.init) return cp.init;

	for (const group of ['sequence', 'choice', 'all']) {
		for (const g of childrenByLocalName(complexType, group)) {
			const gp = collectDfdlProps(g);
			if (gp.initiator) return gp.initiator;
			if (gp.init) return gp.init;
			for (const c of childrenByLocalName(g, 'element')) {
				const cprops = collectDfdlProps(c);
				if (cprops.initiator) return cprops.initiator;
				if (cprops.init) return cprops.init;
			}
		}
	}
	return null;
}

function isNumericType(typeName) {
	const t = String(typeName || '').replace(/^xs:/, '');
	return ['decimal', 'integer', 'nonNegativeInteger', 'positiveInteger', 'long', 'int', 'short', 'byte',
		'unsignedLong', 'unsignedInt', 'unsignedShort', 'unsignedByte', 'float', 'double'].includes(t);
}

function isBinaryType(typeName) {
	const t = String(typeName || '').replace(/^xs:/, '').toLowerCase();
	return (
		t === 'hexbinary' ||
		t === 'base64binary' ||
		t === 'hexb' ||
		t.includes('hex') ||
		t.includes('binary') ||
		t.includes('filler__')
	);
}

/** IBM/DFDL packed-decimal (COMP-3 / BCD) detection — e.g. SIBS-Packed-Decimal__int. */
function isPackedDecimal(node) {
	const t = String(node.typeName || node.builtinType || '').toLowerCase();
	if (t.includes('packed') || t.includes('comp-3') || t.includes('bcd')) return true;
	const rep = String((node.dfdl && (node.dfdl.representation || node.dfdl.binaryNumberRep)) || '')
		.toLowerCase();
	return rep.includes('packed');
}

/**
 * Decode an IBM packed-decimal (COMP-3) value: 2 BCD digits per byte, with the
 * low nibble of the final byte holding the sign (C/F/A/E = +, D/B = -).
 */
function decodePackedDecimal(bytes) {
	if (!bytes || bytes.length === 0) return 0;
	let sign = 1;
	let digits = '';
	const last = bytes.length - 1;
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		const hi = (b >> 4) & 0xf;
		const lo = b & 0xf;
		if (i === last) {
			// low nibble is the sign
			if (lo === 0xd || lo === 0xb) sign = -1;
			digits += String(hi);
		} else {
			digits += String(hi) + String(lo);
		}
	}
	const num = parseInt(digits.replace(/^0+/, '') || '0', 10);
	return Number.isFinite(num) ? num * sign : 0;
}


function buildNode(el, typeRegistry) {
	const dfdl = collectDfdlProps(el);
	const name = getAttr(el, 'name');
	const typeName = getAttr(el, 'type');

	const node = {
		kind: 'element',
		name: name,
		typeName: typeName ? typeName.replace(/^xs:/, '') : null,
		dfdl,
		minOccurs: parseInt(getAttr(el, 'minOccurs') || '1', 10),
		maxOccurs: getAttr(el, 'maxOccurs') || null,
		children: [],
		hasComplex: false
	};

	// Inline complexType
	const inlineComplex = childByLocalName(el, 'complexType');
	if (inlineComplex) {
		node.hasComplex = true;
		node.children = buildComplexChildren(inlineComplex, typeRegistry);
		return node;
	}

	// Named complexType reference
	if (typeName && typeRegistry[typeName]) {
		node.hasComplex = true;
		node.children = buildComplexChildren(typeRegistry[typeName], typeRegistry);
		return node;
	}

	// Otherwise a simple type
	node.builtinType = typeName || 'string';
	return node;
}

function buildComplexChildren(complexType, typeRegistry) {
	const children = [];

	const localNameOf = (el) => el.localName || (el.nodeName || '').split(':').pop();

	// Walk a model group's children in document order, recursing into xsd:sequence /
	// xsd:choice / xsd:all regardless of nesting (e.g. choice inside sequence), so the
	// decode step can honour choice (first branch only) while keeping fields aligned.
	const collectGroup = (container) => {
		for (const child of container.children || []) {
			const local = localNameOf(child);
			if (local === 'element') {
				const built = buildNode(child, typeRegistry);
				built.group = 'sequence';
				children.push(built);
			} else if (local === 'choice') {
				for (const elem of childrenByLocalName(child, 'element')) {
					const built = buildNode(elem, typeRegistry);
					built.group = 'choice';
					children.push(built);
				}
				for (const innerSeq of childrenByLocalName(child, 'sequence')) {
					collectGroup(innerSeq);
				}
			} else if (local === 'all') {
				for (const elem of childrenByLocalName(child, 'element')) {
					const built = buildNode(elem, typeRegistry);
					built.group = 'sequence';
					children.push(built);
				}
			} else if (local === 'sequence') {
				collectGroup(child);
			}
		}
	};

	collectGroup(complexType);
	return children;
}

/**
 * Parse an XSD schema document into a usable schema object.
 * @param {string} xmlText raw XSD text
 * @returns {{rootTypes: object, typeRegistry: object, schemaEl: object}}
 */
export function parseAbcsSchema(xmlText) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlText, 'text/xml');

	if (doc.getElementsByTagName('parsererror').length > 0) {
		throw new Error('Invalid XML format in schema file');
	}

	const schemaEl = doc.documentElement;
	const typeRegistry = {};
	const rootTypes = {};

	// Register named complexType definitions
	const allElements = doc.getElementsByTagName('*');
	for (const el of allElements) {
		const local = el.localName || el.nodeName.split(':').pop();
		if (local === 'complexType') {
			const name = getAttr(el, 'name');
			if (name) typeRegistry[name] = el;
		}
	}

	// Register top-level elements
	for (const el of allElements) {
		const local = el.localName || el.nodeName.split(':').pop();
		if (local === 'element' && el.parentNode === schemaEl) {
			const name = getAttr(el, 'name');
			if (name) rootTypes[name] = el;
		}
	}

	return { rootTypes, typeRegistry, schemaEl };
}

/**
 * Build a decoded schema node tree for a specific root element.
 */
export function buildSchemaTree(schema, rootName) {
	if (!schema || !schema.rootTypes) {
		throw new Error('No schema loaded');
	}
	const rootEl = schema.rootTypes[rootName];
	if (!rootEl) {
		const available = Object.keys(schema.rootTypes);
		throw new Error(
			`Root element "${rootName}" not found in schema. Available roots: ${
				available.length ? available.join(', ') : '(none)'
			}`
		);
	}
	const root = buildNode(rootEl, schema.typeRegistry);
	// Attach the root element's DFDL initiator (e.g. "..K1") so it is consumed
	// before the first field in single-root mode too (not just segments mode).
	const initiator = collectInitiator(rootEl, schema.typeRegistry);
	if (initiator) {
		root.dfdl = { ...(root.dfdl || {}), initiator };
	}
	return root;
}


/* ------------------------------------------------------------------ */
/* Binary decoding                                                     */
/* ------------------------------------------------------------------ */

function getLength(node) {
	const dfdl = node.dfdl || {};
	if (dfdl.length != null) return parseInt(dfdl.length, 10);
	return null;
}

function getOccursCount(node) {
	const dfdl = node.dfdl || {};
	if (dfdl.occursCount != null) return parseInt(dfdl.occursCount, 10);
	if (node.maxOccurs && node.maxOccurs !== 'unbounded') return parseInt(node.maxOccurs, 10);
	return 1;
}

function getByteOrder(node, inherited, defaultOrder) {
	const dfdl = node.dfdl || {};
	return (dfdl.byteOrder || inherited || defaultOrder || 'bigEndian').toLowerCase();
}

function getEncoding(node, inherited, defaultEncoding) {
	const dfdl = node.dfdl || {};
	if (dfdl.encoding) return dfdl.encoding;
	return inherited || defaultEncoding || 'ASCII';
}

function decodeString(bytes, encoding) {
	const enc = String(encoding || 'ASCII').toUpperCase();
	if (enc === 'EBCDIC' || enc === 'EBCDIC-CP037' || enc === 'IBM037' || enc === 'CP037') {
		return ebcdicBytesToString(bytes);
	}
	try {
		const decoder = new TextDecoder(enc === 'ASCII' ? 'windows-1252' : enc);
		return decoder.decode(bytes);
	} catch (e) {
		let out = '';
		for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
		return out;
	}
}

/** Bytes per character for a given encoding (used to convert dfdl:lengthUnits='characters'). */
function bytesPerCharacter(encoding) {
	const enc = String(encoding || '').toUpperCase();
	if (enc.startsWith('UTF-16') || enc === 'UTF16') return 2;
	if (enc.startsWith('UTF-32') || enc === 'UTF32') return 4;
	// Single-byte encodings (EBCDIC, ASCII, ISO-8859-*, windows-125x, UTF-8 for BMP ASCII subset)
	return 1;
}

/** Apply dfdl:trimKind / dfdl:trimValue to decoded text, like Daffodil (default trimKind='none'). */
function applyTrim(text, dfdl) {
	const kind = (dfdl && dfdl.trimKind) || 'none';
	if (kind === 'none') return text;
	const trimValue = (dfdl && dfdl.trimValue) || ' ';
	let result = text;
	if (kind === 'trimLeading' || kind === 'trimBoth') {
		while (result.startsWith(trimValue)) result = result.slice(trimValue.length);
	}
	if (kind === 'trimTrailing' || kind === 'trimBoth') {
		while (result.endsWith(trimValue)) result = result.slice(0, -trimValue.length);
	}
	return result;
}

function decodeNumber(bytes, node, byteOrder) {
	let value = 0;
	if (byteOrder === 'littleEndian') {
		for (let i = bytes.length - 1; i >= 0; i--) {
			value = value * 256 + bytes[i];
		}
	} else {
		for (let i = 0; i < bytes.length; i++) {
			value = value * 256 + bytes[i];
		}
	}
	return value;
}

function alignOffset(offset, alignment) {
	if (!alignment || alignment <= 1) return offset;
	const remainder = offset % alignment;
	return remainder === 0 ? offset : offset + (alignment - remainder);
}


/**
 * Decode one occurrence of an element node.
 */
function decodeOne(node, bytes, startOffset, ctx) {
	let offset = startOffset;
	const dfdl = node.dfdl || {};

	// Apply alignment before reading this element
	const alignment = dfdl.alignment ? parseInt(dfdl.alignment, 10) : 0;
	offset = alignOffset(offset, alignment);

	// Effective encoding: auto-detect overrides, else own/inherited property
	const effectiveEncoding = ctx.autoDetect
		? ctx.detectedEncoding
		: getEncoding(node, ctx.inheritedEncoding, ctx.defaultEncoding);
	const effectiveByteOrder = getByteOrder(node, ctx.inheritedByteOrder, ctx.defaultByteOrder);

	// Complex type: recurse into children, propagating encoding/byte order
	if (node.hasComplex) {
		const childCtx = {
			...ctx,
			inheritedEncoding: effectiveEncoding,
			inheritedByteOrder: effectiveByteOrder
		};
		// Consume a segment/field initiator if present on this element
		const init = dfdl.initiator || dfdl.init;
		if (init) {
			const initBytes = encodeString(init, effectiveEncoding);
			let match = true;
			for (let i = 0; i < initBytes.length; i++) {
				if (bytes[offset + i] !== initBytes[i]) {
					match = false;
					break;
				}
			}
			if (match) offset += initBytes.length;
		}
		const obj = {};
		// xsd:choice: only the first matching branch is decoded (Daffodil tries branches in
		// document order and picks the first that parses); skip the remaining siblings of a
		// contiguous choice group so the following fields stay aligned.
		let inChoice = false;
		for (const child of node.children) {
			if (child.group === 'choice') {
				if (inChoice) continue;
				inChoice = true;
			} else {
				inChoice = false;
			}
			const decoded = decodeNode(child, bytes, offset, childCtx);
			obj[child.name] = decoded.value;
			offset = decoded.nextOffset;
		}
		return { value: obj, nextOffset: offset };
	}

	// Simple type.
	// A field-level initiator is consumed BEFORE the value (Daffodil semantics), so it is
	// not counted toward dfdl:length.
	let valueOffset = offset;
	const initiator = dfdl.initiator;
	if (initiator) {
		const initBytes = encodeString(initiator, effectiveEncoding);
		let matches = true;
		for (let i = 0; i < initBytes.length; i++) {
			if (bytes[valueOffset + i] !== initBytes[i]) { matches = false; break; }
		}
		if (matches) valueOffset += initBytes.length;
	}

	let length = getLength(node);
	if (length == null) {
		const term = dfdl.terminator || dfdl.term;
		if (term) {
			const termBytes = bytesToHex(encodeString(term, effectiveEncoding));
			const hexSlice = bytesToHex(bytes.subarray(valueOffset));
			const idx = hexSlice.indexOf(termBytes);
			length = idx >= 0 ? idx / 2 : bytes.length - valueOffset;
		} else {
			length = bytes.length - valueOffset;
		}
	}

	// Honor dfdl:lengthUnits: 'bytes' (default), 'characters' (multiply by encoding width),
	// or 'bits' (round up to whole bytes) — matching DFDL/Daffodil semantics.
	const lengthUnits = dfdl.lengthUnits || 'bytes';
	const byteLength =
		lengthUnits === 'characters'
			? length * bytesPerCharacter(effectiveEncoding)
			: lengthUnits === 'bits'
				? Math.ceil(length / 8)
				: length;

	let raw = bytes.subarray(valueOffset, valueOffset + byteLength);
	let valueBytes = raw;
	offset = valueOffset + byteLength;

	// Strip terminator (encoded with the field's effective encoding, like Daffodil)
	const terminator = dfdl.terminator || dfdl.term;
	if (terminator) {
		const termBytes = encodeString(terminator, effectiveEncoding);
		if (valueBytes.length >= termBytes.length) {
			let matches = true;
			for (let i = 0; i < termBytes.length; i++) {
				if (valueBytes[valueBytes.length - termBytes.length + i] !== termBytes[i]) {
					matches = false;
					break;
				}
			}
			if (matches) valueBytes = valueBytes.subarray(0, valueBytes.length - termBytes.length);
		}
	}

	// Decode value
	let value;
	if (isBinaryType(node.typeName)) {
		value = bytesToHex(valueBytes);
	} else if (isPackedDecimal(node)) {
		value = decodePackedDecimal(valueBytes);
	} else if (isNumericType(node.typeName)) {
		const rep = dfdl.representation || dfdl.binaryNumberRep || 'text';
		if (rep === 'binary') {
			value = decodeNumber(valueBytes, node, effectiveByteOrder);
		} else {
			const text = decodeString(valueBytes, effectiveEncoding);
			value = applyTrim(text, dfdl);
		}
	} else {
		value = applyTrim(decodeString(valueBytes, effectiveEncoding), dfdl);
	}

	return { value, nextOffset: offset, raw: raw, valueBytes: valueBytes };
}

function decodeNode(node, bytes, offset, ctx) {
	const count = getOccursCount(node);
	if (count > 1 || node.maxOccurs === 'unbounded') {
		const arr = [];
		let localOffset = offset;
		if (node.maxOccurs === 'unbounded' && !node.hasComplex) {
			let guard = 0;
			while (localOffset < bytes.length && guard < 10000) {
				const prev = localOffset;
				const decoded = decodeOne(node, bytes, localOffset, ctx);
				if (decoded.nextOffset <= prev) break;
				arr.push(decoded.value);
				localOffset = decoded.nextOffset;
				guard++;
			}
		} else {
			for (let i = 0; i < count; i++) {
				const decoded = decodeOne(node, bytes, localOffset, ctx);
				arr.push(decoded.value);
				localOffset = decoded.nextOffset;
			}
		}
		return { value: arr, repeated: true, nextOffset: localOffset };
	}
	return decodeOne(node, bytes, offset, ctx);
}


/**
 * Parse a binary buffer against a schema tree, producing a JSON infoset.
 *
 * @param {object} schemaTree - result of buildSchemaTree()
 * @param {Uint8Array} bytes - binary data
 * @param {object} options - { rootName, defaultEncoding, stripPad }
 * @returns {{ json: object, raw: object, debug: object }}
 */
export function parseAbcsBinary(schemaTree, bytes, options = {}) {
	const requestedEncoding = options.defaultEncoding || 'AUTO';
	const autoDetect = String(requestedEncoding).toUpperCase() === 'AUTO';
	const detectedEncoding = autoDetect ? detectTextEncoding(bytes) : requestedEncoding;

	const ctx = {
		defaultEncoding: autoDetect ? detectedEncoding : requestedEncoding,
		defaultByteOrder: options.defaultByteOrder || 'bigEndian',
		autoDetect: autoDetect,
		detectedEncoding: detectedEncoding
	};

	const result = decodeNode(schemaTree, bytes, 0, ctx);

	const json = {};
	json[schemaTree.name] = result.value;

	const strip = options.stripPad !== false;
	const jsonClean = JSON.parse(JSON.stringify(json, (key, value) => {
		if (typeof value === 'string' && strip) {
			return value.replace(/\u0000+$/g, '').trimEnd();
		}
		return value;
	}));

	const debug = {
		totalBytes: bytes.length,
		consumedBytes: result.nextOffset,
		hexDump: bytesToHex(bytes),
		detectedEncoding: detectedEncoding,
		decodedView: decodeString(bytes, detectedEncoding),
		ebcdicView: ebcdicBytesToString(bytes)
	};

	const fields = flattenWithSchema(jsonClean, schemaTree);

	return { json: jsonClean, raw: json, debug, fields };
}

/* ------------------------------------------------------------------ */
/* Multi-segment parsing                                               */
/* ------------------------------------------------------------------ */

/**
 * Locate every segment boundary in a binary buffer.
 *
 * Segments are identified by their DFDL initiator (e.g. `..K1`) taken from the
 * schema root elements. When no initiator is defined in the schema, a fallback
 * scans the decoded text for `..XX` markers and matches each code to a root
 * element whose name ends with that code (e.g. RMQK1 -> K1).
 *
 * @returns {Array<{position:number, rootName:string, initiator:string, initBytes:Uint8Array}>}
 */
export function scanSegments(schema, bytes, detectedEncoding) {
	const found = [];

	// Primary: use schema-declared initiators
	for (const [rootName, rootEl] of Object.entries(schema.rootTypes || {})) {
		const initiator = collectInitiator(rootEl, schema.typeRegistry);
		if (!initiator) continue;
		const initBytes = encodeString(initiator, detectedEncoding);
		for (const p of findAllOccurrences(bytes, initBytes)) {
			found.push({ position: p, rootName, initiator, initBytes });
		}
	}

	// Fallback: detect `..XX` markers and match by root-name suffix
	if (found.length === 0) {
		const decoded = decodeString(bytes, detectedEncoding);
		const regex = /\.\.([A-Za-z0-9]{2})/g;
		let m;
		while ((m = regex.exec(decoded))) {
			const code = m[1].toUpperCase();
			let rootName = null;
			for (const rn of Object.keys(schema.rootTypes || {})) {
				if (rn.toUpperCase().endsWith(code)) {
					rootName = rn;
					break;
				}
			}
			if (rootName) {
				found.push({
					position: m.index,
					rootName,
					initiator: m[0],
					initBytes: encodeString(m[0], detectedEncoding)
				});
			}
		}
	}

	found.sort((a, b) => a.position - b.position);
	return found;
}

/**
 * Parse a buffer that contains one or more ABCS segments.
 *
 * Splits the buffer at each segment initiator (from the schema root elements),
 * then parses each segment with its own root element. Returns one entry per
 * segment, plus the bytes that precede the first segment (the preamble).
 */
export function parseAbcsSegments(schema, bytes, options = {}) {
	const requestedEncoding = options.defaultEncoding || 'AUTO';
	const autoDetect = String(requestedEncoding).toUpperCase() === 'AUTO';
	const detectedEncoding = autoDetect ? detectTextEncoding(bytes) : requestedEncoding;

	const boundaries = scanSegments(schema, bytes, detectedEncoding);

	const segments = [];
	for (let i = 0; i < boundaries.length; i++) {
		const start = boundaries[i].position;
		const end = i + 1 < boundaries.length ? boundaries[i + 1].position : bytes.length;
		const segmentBytes = bytes.subarray(start, end);

		// Build the schema tree for this segment's root and attach its initiator
		// so the root node consumes it before parsing the fields.
		const tree = buildSchemaTree(schema, boundaries[i].rootName);
		tree.dfdl = { ...(tree.dfdl || {}), initiator: boundaries[i].initiator };

		const parsed = parseAbcsBinary(tree, segmentBytes, {
			defaultEncoding: detectedEncoding,
			defaultByteOrder: options.defaultByteOrder || 'bigEndian',
			stripPad: options.stripPad !== false
		});

		segments.push({
			rootName: boundaries[i].rootName,
			initiator: boundaries[i].initiator,
			offset: start,
			length: end - start,
			json: parsed.json,
			fields: parsed.fields,
			debug: parsed.debug
		});
	}

	const preamble = boundaries.length > 0 ? bytes.subarray(0, boundaries[0].position) : bytes;

	return {
		segments,
		detectedEncoding,
		totalBytes: bytes.length,
		preambleLength: preamble.length,
		preamble: decodeString(preamble, detectedEncoding)
	};
}

/* ------------------------------------------------------------------ */
/* Utility exports used by the page                                    */
/* ------------------------------------------------------------------ */

/** Flatten a parsed JSON tree into a list of { path, value } entries. */
export function flattenJson(obj, prefix = '') {
	const entries = [];
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value !== null && typeof value === 'object') {
			if (Array.isArray(value)) {
				value.forEach((item, i) => {
					if (item !== null && typeof item === 'object') {
						entries.push(...flattenJson(item, `${path}[${i}]`));
					} else {
						entries.push({ path: `${path}[${i}]`, value: String(item) });
					}
				});
			} else {
				entries.push(...flattenJson(value, path));
			}
		} else {
			entries.push({ path, value: value === null ? 'null' : String(value) });
		}
	}
	return entries;
}

/**
 * Flatten a parsed JSON tree into { path, value, xsdLength, valueLength } entries,
 * driving the traversal from the schema tree so each field reports its XSD-defined
 * dfdl:length (character length declared in the uploaded XSD) alongside the value.
 */
export function flattenWithSchema(json, schemaTree) {
	const entries = [];
	if (!json || !schemaTree || !schemaTree.name) return entries;
	const rootJson = json[schemaTree.name];
	if (rootJson === null || typeof rootJson !== 'object') return entries;

	const walk = (obj, children, prefix) => {
		for (const child of children || []) {
			const path = prefix ? `${prefix}.${child.name}` : child.name;
			const value = obj ? obj[child.name] : undefined;

			if (child.hasComplex) {
				if (Array.isArray(value)) {
					value.forEach((item, i) => walk(item, child.children, `${path}[${i}]`));
				} else if (value && typeof value === 'object') {
					walk(value, child.children, path);
				}
				continue;
			}

			const xsdLength =
				child.dfdl && child.dfdl.length != null ? parseInt(child.dfdl.length, 10) : null;

			const push = (item, suffix) => {
				const s = item === null || item === undefined ? '' : String(item);
				entries.push({ path: `${path}${suffix}`, value: s, xsdLength, valueLength: s.length });
			};

			if (Array.isArray(value)) {
				value.forEach((item, i) => push(item, `[${i}]`));
			} else {
				push(value, '');
			}
		}
	};

	walk(rootJson, schemaTree.children, schemaTree.name);
	return entries;
}

