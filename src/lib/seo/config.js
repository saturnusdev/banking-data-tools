/**
 * Centralized SEO configuration for all routes.
 * Each route gets optimized title, description, keywords, and Open Graph data.
 * The layout reads this based on the current pathname.
 */

const SITE_URL = 'https://www.banking-tools.java-sc.com';
const DEFAULT_IMAGE = '/og-image.png';

export const DEFAULT_SEO = {
	title: 'DataCodec - Developer Payload Editors, Codecs & Banking Message Tools',
	description:
		'Free online professional data processing tools for developers and data analysts. JSON editor, ISO8583 parser, DFDL parser, Base64 decoder, YAML tools, XML editor, hex to EBCDIC converter, and more.',
	keywords:
		'JSON tools, data parser, ISO8583, DFDL, Base64 decoder, banking data, data processing, developer tools, YAML validator, XML editor, EBCDIC converter, hex converter, fixed-length parser, online tools, free developer tools',
	author: 'Hady Eka Saputra',
	image: DEFAULT_IMAGE,
	type: 'website',
	siteName: 'DataCodec',
	locale: 'en_US'
};

export const ROUTE_SEO = {
	'/': {
		title: 'DataCodec - Developer Payload Editors, Codecs & Banking Message Tools',
		description:
			'Free online professional data processing tools for developers and data analysts. JSON editor, ISO8583 parser, DFDL parser, Base64 decoder, YAML tools, XML editor, hex to EBCDIC converter, and more.',
		keywords:
			'DataCodec, developer tools, JSON editor, ISO8583 parser, DFDL parser, Base64 decoder, YAML tools, XML editor, online data tools, free developer suite',
		type: 'website'
	},
	'/json-tools': {
		title: 'JSON Tools - Advanced JSON Editor with Tree View, Diff & Validation | DataCodec',
		description:
			'Professional JSON toolset with real-time validation, auto-repair, tree view, diff, JSONPath query, YAML/CSV/XML conversion, stringify, schema generation, and mock data generation. Free online.',
		keywords:
			'JSON editor, JSON formatter, JSON validator, JSON diff, JSONPath, JSON schema, JSON to YAML, JSON to CSV, JSON tree view, JSON stringify, online JSON tools',
		type: 'website'
	},
	'/iso8583-parser': {
		title: 'ISO 8583 Parser - Decode Financial Messages Online | DataCodec',
		description:
			'Parse and decode ISO 8583 financial messages online. Extract MTI, data elements, and fields from ISO 8583 hex messages. Free ISO 8583 message parser.',
		keywords:
			'ISO 8583 parser, ISO8583 decoder, financial message parser, payment message parser, ISO 8583 online, banking message decoder, MTI parser',
		type: 'website'
	},
	'/iso8583-message-studio': {
		title: 'ISO 8583 Message Studio - Build, Decode, Validate & Simulate | DataCodec',
		description:
			'Build, decode, validate, and simulate ISO 8583 financial messages. Professional ISO 8583 message studio with hex and bitmap support. Free online tool.',
		keywords:
			'ISO 8583 studio, ISO8583 builder, ISO8583 simulator, ISO8583 validator, financial message builder, payment message simulator, ISO8583 bitmap',
		type: 'website'
	},
	'/dfdl-parser': {
		title: 'DFDL Parser - Data Format Description Language Parser | DataCodec',
		description:
			'Parse binary and fixed-length data using DFDL schemas. Upload XSD schemas and decode complex data formats online. Free DFDL parser with DSP and MBase header support.',
		keywords:
			'DFDL parser, Data Format Description Language, DFDL schema, binary data parser, fixed-length parser, EBCDIC parser, DFDL XSD, online DFDL tool, MBaseHeader, DSPHeader',
		type: 'website'
	},
	'/base64-decoder': {
		title: 'Base64 Decoder - Auto-Detect & Decode Various Data Formats | DataCodec',
		description:
			'Auto-detect and decode Base64, JSON, XML, plain text, and URL-encoded data. Free online Base64 decoder with content type detection and format extraction.',
		keywords:
			'Base64 decoder, Base64 decode online, Base64 to JSON, Base64 to XML, Base64 converter, auto-detect Base64, online Base64 tool',
		type: 'website'
	},
	'/yaml-tools': {
		title: 'YAML Tools - Validate, Lint, Convert, Merge & Diff YAML Online | DataCodec',
		description:
			'Professional YAML toolset: validate, lint, format, convert to JSON, merge multiple YAML files, and diff YAML documents. Free online YAML tools.',
		keywords:
			'YAML validator, YAML lint, YAML formatter, YAML to JSON, YAML diff, YAML merge, YAML converter, online YAML tools, YAML editor',
		type: 'website'
	},
	'/js-minify': {
		title: 'JavaScript Minifier & Beautifier - Minify/Unminify JS Online | DataCodec',
		description:
			'Minify and beautify JavaScript code with advanced options. Remove comments, compress whitespace, and optimize JS for production. Free online JS minifier.',
		keywords:
			'JavaScript minifier, JS minify, JS beautifier, JS unminify, JavaScript compressor, JS formatter, online JS minifier, code minification',
		type: 'website'
	},
	'/hex-ebcdic-converter': {
		title: 'Hex to EBCDIC Converter - Convert Hex, ASCII, EBCDIC & Base64 | DataCodec',
		description:
			'Convert between Hex, ASCII, EBCDIC, and Base64 representations. Free online hex to EBCDIC converter with multiple encoding support and real-time conversion.',
		keywords:
			'hex to EBCDIC, EBCDIC converter, hex converter, ASCII to EBCDIC, EBCDIC to ASCII, Base64 to EBCDIC, hex to ASCII, online EBCDIC converter',
		type: 'website'
	},
	'/fixed-length-parsed': {
		title: 'Fixed-Length Data Parser - Parse Fixed-Width Text Files | DataCodec',
		description:
			'Parse fixed-width text files with customizable field definitions. Define field lengths, offsets, and types to extract structured data. Free online fixed-length parser.',
		keywords:
			'fixed-length parser, fixed-width parser, fixed-length data, parse fixed-width files, column parser, COBOL data parser, fixed-length field extractor',
		type: 'website'
	},
	'/xml-editor': {
		title: 'XML Editor - Format, Validate, Convert, Diff & Tree View | DataCodec',
		description:
			'Professional XML editor with format, validate, minify, convert to JSON, diff, and tree view. Free online XML editor with syntax highlighting and auto-complete.',
		keywords:
			'XML editor, XML formatter, XML validator, XML beautifier, XML to JSON, XML diff, XML tree view, online XML editor, XML minifier',
		type: 'website'
	},
	'/idm-swagger': {
		title: 'IDM to Swagger Converter - Convert IDM Specs to OpenAPI | DataCodec',
		description:
			'Convert IDM (Interface Design Model) specifications to Swagger/OpenAPI documentation. Free online IDM to Swagger converter for API documentation.',
		keywords:
			'IDM to Swagger, IDM converter, OpenAPI converter, Swagger generator, API documentation, IDM to OpenAPI, interface design model',
		type: 'website'
	},
	'/abcs-converter': {
		title: 'ABCS Converter - Parse ABCS Binary Data with DFDL Schemas | DataCodec',
		description:
			'Parse ABCS (Application Binary Communication System) binary data using DFDL schemas. Upload schemas and decode binary segments online. Free ABCS parser.',
		keywords:
			'ABCS converter, ABCS parser, ABCS binary data, DFDL schema parser, binary data decoder, ABCS segments, online ABCS tool',
		type: 'website'
	}
};

/**
 * Get SEO metadata for a given pathname.
 * Falls back to DEFAULT_SEO for unknown routes.
 */
export function getSeoForPath(pathname) {
	const route = ROUTE_SEO[pathname] || {};
	return {
		...DEFAULT_SEO,
		...route,
		url: `${SITE_URL}${pathname}`
	};
}

export { SITE_URL, DEFAULT_IMAGE };

