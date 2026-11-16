function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function validXmlName(name: string): string {
	// Replace characters invalid in XML names with an underscore
	return name.replace(/[^A-Za-z0-9_.-]/g, '_');
}

export function jsonToXml(json: string, rootName = 'root'): string {
	const data = JSON.parse(json);
	const lines: string[] = [];
	const indent = (n: number) => '  '.repeat(n);

	function write(name: string, value: any, depth: number): void {
		const tag = validXmlName(name);
		if (value === null || value === undefined) {
			lines.push(`${indent(depth)}<${tag}/>`);
			return;
		}
		if (Array.isArray(value)) {
			value.forEach((item) => write(tag, item, depth));
			return;
		}
		if (typeof value === 'object') {
			lines.push(`${indent(depth)}<${tag}>`);
			Object.entries(value).forEach(([k, v]) => write(k, v, depth + 1));
			lines.push(`${indent(depth)}</${tag}>`);
			return;
		}
		lines.push(`${indent(depth)}<${tag}>${escapeXml(String(value))}</${tag}>`);
	}

	if (typeof data !== 'object' || data === null) {
		throw new Error('Root value must be an object or array');
	}

	lines.push('<?xml version="1.0" encoding="UTF-8"?>');
	if (Array.isArray(data)) {
		lines.push(`<${validXmlName(rootName)}>`);
		data.forEach((item) => write('item', item, 1));
		lines.push(`</${validXmlName(rootName)}>`);
	} else {
		write(rootName, data, 0);
	}
	return lines.join('\n');
}

function coerceXml(s: string): any {
	if (s === 'true') return true;
	if (s === 'false') return false;
	if (s === 'null') return null;
	const n = Number(s);
	if (s !== '' && !Number.isNaN(n) && /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(s)) return n;
	return s;
}

function parseElement(el: Element): any {
	const children = Array.from(el.children);
	const attrs: Record<string, any> = {};
	Array.from(el.attributes).forEach((a) => {
		attrs[a.name] = coerceXml(a.value);
	});

	const childMap: Record<string, any[]> = {};
	children.forEach((c) => {
		const name = c.tagName;
		(childMap[name] = childMap[name] || []).push(parseElement(c));
	});

	const text = (el.textContent || '').trim();
	const obj: Record<string, any> = {};

	if (children.length > 0) {
		Object.entries(childMap).forEach(([name, arr]) => {
			obj[name] = arr.length === 1 ? arr[0] : arr;
		});
	} else if (text !== '') {
		obj['#text'] = coerceXml(text);
	}

	if (Object.keys(attrs).length) obj['@attributes'] = attrs;
	return obj;
}

export function xmlToJson(xml: string): string {
	if (typeof DOMParser === 'undefined') {
		throw new Error('XML parsing is only available in the browser');
	}
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'application/xml');
	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error('Invalid XML: ' + (parseError.textContent || 'parse error'));
	}
	const root = doc.documentElement;
	const result = parseElement(root);
	return JSON.stringify(result, null, 2);
}
