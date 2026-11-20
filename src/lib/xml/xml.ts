/* ------------------------------------------------------------------ */
/*  xml.ts - XML Editor utilities (format, validate, convert, etc.)   */
/* ------------------------------------------------------------------ */

import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

export interface XmlField {
	name: string;
	length: number;
	align: 'left' | 'right';
	pad: string;
}

export interface XmlValidationError {
	msg: string;
	line?: number;
	col?: number;
	code?: string;
}

export interface XmlValidationResult {
	valid: boolean;
	errors: XmlValidationError[];
}

export interface RecordSet {
	records: Record<string, any>[];
	recordName: string;
}

const parserOptions = {
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	parseTagValue: true,
	parseAttributeValue: true,
	trimValues: true,
	alwaysCreateTextNode: false
};

// Preserve values exactly as text (no numeric coercion) so formatting,
// fixed-width and CSV conversions do not alter the original data.
const preserveParserOptions = {
	...parserOptions,
	parseTagValue: false,
	parseAttributeValue: false
};

const builderOptions = {
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	format: false,
	suppressEmptyNode: true
};

/* ---------------- Validation ---------------- */

export function validateXml(xml: string): XmlValidationResult {
	const result = XMLValidator.validate(xml);
	if (result === true) return { valid: true, errors: [] };
	const err = (result as any).err || {};
	return {
		valid: false,
		errors: [
			{
				msg: err.msg || 'Invalid XML',
				line: err.line,
				col: err.col,
				code: err.code
			}
		]
	};
}

function assertValid(xml: string): void {
	const check = validateXml(xml);
	if (!check.valid) {
		const e = check.errors[0];
		const where = e.line != null ? ` (line ${e.line}, col ${e.col ?? '?'})` : '';
		throw new Error(`${e.msg}${where}`);
	}
}

/* ---------------- Parse / Build ---------------- */

export function parseXml(xml: string): any {
	assertValid(xml);
	return new XMLParser(parserOptions).parse(xml);
}

export function parseXmlPreserve(xml: string): any {
	assertValid(xml);
	return new XMLParser(preserveParserOptions).parse(xml);
}

export function buildXml(obj: any, format = false): string {
	return new XMLBuilder({ ...builderOptions, format }).build(obj);
}

/* ---------------- XML <-> JSON ---------------- */

export function xmlToJson(xml: string): string {
	const obj = parseXml(xml);
	return JSON.stringify(obj, null, 2);
}

export function jsonToXml(json: string, rootName = ''): string {
	let data: any;
	try {
		data = JSON.parse(json);
	} catch (e: any) {
		throw new Error('Invalid JSON: ' + e.message);
	}
	if (data === null || typeof data !== 'object') {
		throw new Error('Root value must be an object or array');
	}
	const wrapped = rootName && rootName.trim() ? { [rootName.trim()]: data } : data;
	return buildXml(wrapped, true);
}

/* ---------------- Format / Minify ---------------- */

export function formatXml(xml: string, indent = 2): string {
	const obj = parseXmlPreserve(xml);
	return new XMLBuilder({ ...builderOptions, format: true, indentBy: ' '.repeat(indent) }).build(obj);
}

export function minifyXml(xml: string): string {
	const obj = parseXmlPreserve(xml);
	return new XMLBuilder({ ...builderOptions, format: false }).build(obj);
}

/* ---------------- Escape / Unescape ---------------- */

export function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function unescapeXml(s: string): string {
	return s
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}

/* ---------------- Record extraction ---------------- */

function isRecordObject(v: any): v is Record<string, any> {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function findRecords(obj: any): RecordSet | null {
	const queue: any[] = [obj];
	const seen = new Set<any>();
	while (queue.length) {
		const node = queue.shift();
		if (node === null || node === undefined) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		if (isRecordObject(node)) {
			for (const [k, v] of Object.entries(node)) {
				if (Array.isArray(v) && v.length > 0 && v.every(isRecordObject)) {
					return { records: v, recordName: k };
				}
				if (isRecordObject(v)) queue.push(v);
			}
		} else if (Array.isArray(node)) {
			for (const item of node) if (isRecordObject(item)) queue.push(item);
		}
	}
	return null;
}

function extractRecords(obj: any): RecordSet {
	const found = findRecords(obj);
	if (found) return found;
	// Single record: root object whose value is an object with leaf children
	for (const [k, v] of Object.entries(obj)) {
		if (isRecordObject(v)) return { records: [v], recordName: k };
	}
	return { records: [obj], recordName: 'record' };
}

function leafKeys(records: Record<string, any>[]): string[] {
	const keys = new Set<string>();
	for (const r of records) for (const k of Object.keys(r)) keys.add(k);
	return Array.from(keys);
}

/* ---------------- XML -> CSV ---------------- */

function csvEscape(v: any): string {
	let s = v === null || v === undefined ? '' : String(v);
	if (s.includes(',') || s.includes('"') || s.includes('\n')) {
		s = '"' + s.replace(/"/g, '""') + '"';
	}
	return s;
}

export function xmlToCsv(xml: string, delimiter = ','): string {
	const obj = parseXmlPreserve(xml);
	const { records } = extractRecords(obj);
	if (records.length === 0) throw new Error('No records found in XML');
	const keys = leafKeys(records);
	const rows: string[] = [];
	rows.push(keys.map((k) => csvEscape(k)).join(delimiter));
	for (const r of records) {
		rows.push(keys.map((k) => csvEscape(r[k])).join(delimiter));
	}
	return rows.join('\n');
}

/* ---------------- XML -> Fixed-Width ---------------- */

function padValue(value: any, field: XmlField): string {
	let s = value === null || value === undefined ? '' : String(value);
	if (field.align === 'right') {
		s = s.padStart(field.length, field.pad);
	} else {
		s = s.padEnd(field.length, field.pad);
	}
	return s.substring(0, field.length);
}

export function xmlToFixedWidth(xml: string, fields?: XmlField[]): { text: string; fields: XmlField[]; recordName: string } {
	const obj = parseXmlPreserve(xml);
	const { records, recordName } = extractRecords(obj);
	if (records.length === 0) throw new Error('No records found in XML');

	const keys = leafKeys(records);
	let resolvedFields: XmlField[];
	if (fields && fields.length > 0) {
		resolvedFields = fields.filter((f) => f.name.trim() && f.length > 0);
	} else {
		// Auto-detect: width = max value length across records (min 1)
		resolvedFields = keys.map((name) => {
			const values = records.map((r) => String(r[name] ?? ''));
			const width = Math.max(1, ...values.map((v) => v.length));
			const numeric = values.every((v) => v !== '' && /^-?[0-9]+([.,][0-9]+)?$/.test(v));
			return { name, length: width, align: numeric ? 'right' : 'left', pad: ' ' };
		});
	}

	const lines = records.map((r) => {
		return resolvedFields.map((f) => padValue(r[f.name], f)).join('');
	});

	return { text: lines.join('\n'), fields: resolvedFields, recordName };
}

/* ---------------- Fixed-Width -> XML ---------------- */

function buildRecordXml(records: Record<string, any>[], recordName: string, rootName: string): string {
	const root = rootName && rootName.trim() ? rootName.trim() : 'root';
	const child = records.length === 1 ? records[0] : { [recordName || 'record']: records };
	return buildXml({ [root]: child }, true);
}

export function fixedWidthToXml(
	lines: string[],
	fields: XmlField[],
	options: { recordName?: string; rootName?: string } = {}
): string {
	const valid = fields.filter((f) => f.name.trim() && f.length > 0);
	if (valid.length === 0) throw new Error('At least one valid field definition is required');
	const total = valid.reduce((sum, f) => sum + f.length, 0);

	const records = lines
		.filter((l) => l.length >= total)
		.map((line) => {
			const rec: Record<string, any> = {};
			let pos = 0;
			for (const f of valid) {
				rec[f.name] = line.substring(pos, pos + f.length).trim();
				pos += f.length;
			}
			return rec;
		});

	if (records.length === 0) throw new Error(`No line has at least ${total} characters`);

	return buildRecordXml(records, options.recordName || 'record', options.rootName || 'root');
}
