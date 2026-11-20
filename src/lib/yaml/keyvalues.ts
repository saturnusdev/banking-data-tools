import { isPlainObject } from './yaml';

export interface KeyValueEntry {
	path: string;
	key: string;
	value: string;
	type: string;
}

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stringifyValue(value: any): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

// Flatten a parsed YAML document into leaf/container key-value entries with
// dot-notation paths. `search` filters by path or key name (case-insensitive).
export function extractKeyValues(data: any, search = ''): KeyValueEntry[] {
	const entries: KeyValueEntry[] = [];
	const pattern = search.trim() ? new RegExp(escapeRegExp(search.trim()), 'i') : null;

	function walk(node: any, path: string): void {
		if (Array.isArray(node)) {
			node.forEach((item, index) => {
				const itemPath = `${path}[${index}]`;
				const isObj = isPlainObject(item);
				const isArr = Array.isArray(item);
				const matches = !pattern || pattern.test(itemPath);
				if (matches) {
					entries.push({
						path: itemPath,
						key: `[${index}]`,
						value: stringifyValue(item),
						type: isArr ? 'array' : isObj ? 'object' : typeof item
					});
				}
				if (isObj || isArr) walk(item, itemPath);
			});
		} else if (isPlainObject(node)) {
			for (const [key, value] of Object.entries(node)) {
				const currentPath = path ? `${path}.${key}` : key;
				const isObj = isPlainObject(value);
				const isArr = Array.isArray(value);
				const matches = !pattern || pattern.test(currentPath) || pattern.test(key);
				if (matches) {
					entries.push({
						path: currentPath,
						key,
						value: stringifyValue(value),
						type: isArr ? 'array' : isObj ? 'object' : typeof value
					});
				}
				if (isObj || isArr) walk(value, currentPath);
			}
		}
	}

	walk(data, '');
	return entries;
}
