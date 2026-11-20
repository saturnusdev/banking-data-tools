import { isPlainObject } from './yaml';

export type FilterMode = 'keep-key' | 'remove-key' | 'keep-path' | 'remove-path';

function containsKey(node: any, keyName: string): boolean {
	if (Array.isArray(node)) return node.some((item) => containsKey(item, keyName));
	if (isPlainObject(node)) {
		for (const [key, value] of Object.entries(node)) {
			if (key === keyName) return true;
			if (containsKey(value, keyName)) return true;
		}
	}
	return false;
}

// Keep/remove every node whose key name matches, recursively. In keep mode,
// branches that do not contain the key are pruned.
function transformByKey(node: any, keyName: string, keep: boolean): any {
	if (Array.isArray(node)) {
		return node
			.map((item) => transformByKey(item, keyName, keep))
			.filter((item) => item !== undefined);
	}
	if (isPlainObject(node)) {
		const out: any = {};
		for (const [key, value] of Object.entries(node)) {
			if (key === keyName) {
				if (keep) out[key] = value;
			} else if (!keep) {
				out[key] = transformByKey(value, keyName, false);
			} else if (containsKey(value, keyName)) {
				out[key] = transformByKey(value, keyName, true);
			}
		}
		return out;
	}
	return node;
}

// Rebuild an object containing only the selected path (drops siblings).
function selectByPath(node: any, parts: string[], index: number): any | undefined {
	if (index >= parts.length) return node;
	const key = parts[index];

	if (Array.isArray(node)) {
		const idx = /^\d+$/.test(key) ? Number(key) : -1;
		if (idx < 0 || idx >= node.length) return undefined;
		const sub = selectByPath(node[idx], parts, index + 1);
		if (sub === undefined) return undefined;
		const copy = [...node];
		copy[idx] = sub;
		return copy;
	}
	if (isPlainObject(node)) {
		if (!(key in node)) return undefined;
		const sub = selectByPath(node[key], parts, index + 1);
		if (sub === undefined) return undefined;
		return { [key]: sub };
	}
	return undefined;
}

// Remove the subtree at a dot-notation path (supports array indices).
function transformByPath(node: any, parts: string[], index: number): any {
	if (index >= parts.length) return node;
	const key = parts[index];
	const isLast = index === parts.length - 1;

	if (Array.isArray(node)) {
		if (/^\d+$/.test(key)) {
			const idx = Number(key);
			if (idx >= node.length) return node;
			const copy = [...node];
			if (isLast) {
				copy.splice(idx, 1);
				return copy;
			}
			copy[idx] = transformByPath(node[idx], parts, index + 1);
			return copy;
		}
		// Path continues into each item
		return node.map((item) => transformByPath(item, parts, index));
	}
	if (isPlainObject(node)) {
		if (!(key in node)) return node;
		const out: any = { ...node };
		if (isLast) {
			delete out[key];
			return out;
		}
		out[key] = transformByPath(node[key], parts, index + 1);
		return out;
	}
	return node;
}

export function filterYaml(data: any, mode: FilterMode, target: string): any {
	const key = target.trim();
	if (!key) return data;
	if (mode === 'keep-key') return transformByKey(data, key, true);
	if (mode === 'remove-key') return transformByKey(data, key, false);
	const parts = key
		.split('.')
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length === 0) return data;
	if (mode === 'keep-path') return selectByPath(data, parts, 0) ?? data;
	return transformByPath(data, parts, 0);
}
