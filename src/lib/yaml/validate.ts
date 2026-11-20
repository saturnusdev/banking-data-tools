import { parseYaml, isPlainObject } from './yaml';

export interface ValidationResult {
	valid: boolean;
	error?: string;
	line?: number;
	column?: number;
	data?: any;
}

export interface Summary {
	objects: number;
	arrays: number;
	scalars: number;
	keys: number;
	maxDepth: number;
	sizeBytes: number;
}

function extractPos(msg: string): { line?: number; column?: number } {
	// js-yaml reports positions both as "line N, column N" and as "(line:column)".
	const line = msg.match(/line (\d+)/);
	const column = msg.match(/column (\d+)/);
	if (line && column) {
		return { line: Number(line[1]), column: Number(column[1]) };
	}
	const pos = msg.match(/\((\d+):(\d+)\)/);
	if (pos) {
		return { line: Number(pos[1]), column: Number(pos[2]) };
	}
	return { line: undefined, column: undefined };
}

export function validateYaml(text: string): ValidationResult {
	if (!text || !text.trim()) {
		return { valid: false, error: 'YAML content is empty' };
	}
	try {
		const data = parseYaml(text);
		return { valid: true, data };
	} catch (e: any) {
		const msg = e?.message || String(e);
		const { line, column } = extractPos(msg);
		return { valid: false, error: msg, line, column };
	}
}

export function summarize(data: any): Summary {
	let objects = 0;
	let arrays = 0;
	let scalars = 0;
	let keys = 0;
	let maxDepth = 0;

	function walk(node: any, depth: number): void {
		maxDepth = Math.max(maxDepth, depth);
		if (Array.isArray(node)) {
			arrays += 1;
			node.forEach((item) => walk(item, depth + 1));
		} else if (isPlainObject(node)) {
			objects += 1;
			keys += Object.keys(node).length;
			Object.values(node).forEach((value) => walk(value, depth + 1));
		} else {
			scalars += 1;
		}
	}

	walk(data, 1);
	return {
		objects,
		arrays,
		scalars,
		keys,
		maxDepth,
		sizeBytes: JSON.stringify(data ?? null).length
	};
}
