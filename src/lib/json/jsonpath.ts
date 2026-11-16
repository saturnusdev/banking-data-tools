type Segment =
	| { type: 'root' }
	| { type: 'child'; name: string }
	| { type: 'wildcard' }
	| { type: 'index'; index: number }
	| { type: 'slice'; start?: number; end?: number; step?: number }
	| { type: 'recursive'; name?: string }
	| { type: 'filter'; expr: string };

function parsePath(path: string): Segment[] {
	const segments: Segment[] = [];
	let i = 0;

	while (i < path.length) {
		const c = path[i];

		if (c === '$') {
			segments.push({ type: 'root' });
			i++;
			continue;
		}

		if (c === '.') {
			if (path[i + 1] === '.') {
				// recursive descent: ..name or ..*
				i += 2;
				if (i < path.length && path[i] === '[') {
					segments.push({ type: 'recursive' });
					continue;
				}
				let name = '';
				while (i < path.length && /[A-Za-z0-9_$-]/.test(path[i])) {
					name += path[i];
					i++;
				}
				segments.push({ type: 'recursive', name: name || undefined });
				continue;
			}
			// .name
			i++;
			let name = '';
			while (i < path.length && /[A-Za-z0-9_$-]/.test(path[i])) {
				name += path[i];
				i++;
			}
			if (name) {
				segments.push({ type: 'child', name });
			} else if (i < path.length && path[i] === '*') {
				segments.push({ type: 'wildcard' });
				i++;
			}
			continue;
		}

		if (c === '[') {
			// find matching ]
			let depth = 1;
			let j = i + 1;
			let inString = false;
			let quote = '';
			while (j < path.length && depth > 0) {
				const ch = path[j];
				if (inString) {
					if (ch === quote && path[j - 1] !== '\\') inString = false;
				} else if (ch === '"' || ch === "'") {
					inString = true;
					quote = ch;
				} else if (ch === '[') {
					depth++;
				} else if (ch === ']') {
					depth--;
				}
				j++;
			}
			const inner = path.slice(i + 1, j - 1).trim();

			if (inner === '*') {
				segments.push({ type: 'wildcard' });
			} else if (inner.startsWith('?(')) {
				segments.push({ type: 'filter', expr: inner.slice(2, -1).trim() });
			} else if (/^["'].*["']$/.test(inner)) {
				segments.push({ type: 'child', name: inner.slice(1, -1) });
			} else if (inner.includes(':')) {
				const parts = inner.split(':').map((p) => (p.trim() === '' ? undefined : Number(p.trim())));
				segments.push({ type: 'slice', start: parts[0], end: parts[1], step: parts[2] });
			} else if (/^-?\d+$/.test(inner)) {
				segments.push({ type: 'index', index: Number(inner) });
			} else if (/^[A-Za-z0-9_$-]+$/.test(inner)) {
				segments.push({ type: 'child', name: inner });
			} else {
				throw new Error(`Unsupported JSONPath segment: [${inner}]`);
			}
			i = j;
			continue;
		}

		throw new Error(`Unexpected character in JSONPath at position ${i}: "${c}"`);
	}

	return segments;
}

function isObject(v: any): boolean {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function applyRecursive(node: any, name: string | undefined, out: any[]): void {
	if (isObject(node)) {
		Object.entries(node).forEach(([k, v]) => {
			if (name === undefined || k === name) out.push(v);
			if (isObject(v) || Array.isArray(v)) applyRecursive(v, name, out);
		});
	} else if (Array.isArray(node)) {
		node.forEach((v) => {
			if (name === undefined) {
				out.push(v);
			} else if (v && typeof v === 'object' && v[name] !== undefined) {
				out.push(v[name]);
			}
			if (isObject(v) || Array.isArray(v)) applyRecursive(v, name, out);
		});
	}
}

function getByIndex(arr: any[], index: number): any[] {
	if (index < 0) index = arr.length + index;
	return index >= 0 && index < arr.length ? [arr[index]] : [];
}

function getBySlice(arr: any[], start: number | undefined, end: number | undefined, step: number | undefined): any[] {
	const len = arr.length;
	const s = step ?? 1;
	const out: any[] = [];
	if (s === 0) return out;
	const normStart = start === undefined ? (s > 0 ? 0 : len - 1) : start < 0 ? len + start : start;
	const normEnd = end === undefined ? (s > 0 ? len : -1) : end < 0 ? len + end : end;
	if (s > 0) {
		for (let k = normStart; k < normEnd; k += s) {
			if (k >= 0 && k < len) out.push(arr[k]);
		}
	} else {
		for (let k = normStart; k > normEnd; k += s) {
			if (k >= 0 && k < len) out.push(arr[k]);
		}
	}
	return out;
}

function evalFilter(node: any, expr: string): boolean {
	const m = expr.match(/^@\s*\.?([A-Za-z0-9_$-]*)\s*(==|!=|<=|>=|<|>|=~)\s*(.+)$/);
	if (!m) return true;
	const [, prop, op, rawVal] = m;
	const left = prop ? node?.[prop] : node;
	let right: any = rawVal;
	if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
		right = rawVal.slice(1, -1);
	} else if (rawVal === 'true') {
		right = true;
	} else if (rawVal === 'false') {
		right = false;
	} else if (rawVal === 'null') {
		right = null;
	} else if (!Number.isNaN(Number(rawVal))) {
		right = Number(rawVal);
	}

	switch (op) {
		case '==':
			return left == right;
		case '!=':
			return left != right;
		case '<':
			return left < right;
		case '>':
			return left > right;
		case '<=':
			return left <= right;
		case '>=':
			return left >= right;
		case '=~':
			try {
				return new RegExp(String(right)).test(String(left ?? ''));
			} catch {
				return false;
			}
		default:
			return false;
	}
}

export function queryJsonPath(data: any, path: string): any[] {
	const segments = parsePath(path.trim() || '$');
	let current: any[] = [data];

	for (const seg of segments) {
		const next: any[] = [];

		for (const node of current) {
			switch (seg.type) {
				case 'root':
					next.push(data);
					break;
				case 'child':
					if (isObject(node) && seg.name in node) next.push(node[seg.name]);
					else if (Array.isArray(node) && /^\d+$/.test(seg.name) && Number(seg.name) < node.length)
						next.push(node[Number(seg.name)]);
					break;
				case 'wildcard':
					if (Array.isArray(node)) next.push(...node);
					else if (isObject(node)) next.push(...Object.values(node));
					break;
				case 'index':
					if (Array.isArray(node)) next.push(...getByIndex(node, seg.index));
					break;
				case 'slice':
					if (Array.isArray(node)) next.push(...getBySlice(node, seg.start, seg.end, seg.step));
					break;
				case 'recursive':
					applyRecursive(node, seg.name, next);
					break;
				case 'filter':
					if (Array.isArray(node)) {
						node.forEach((item) => {
							if (evalFilter(item, seg.expr)) next.push(item);
						});
					} else if (isObject(node)) {
						Object.values(node).forEach((item) => {
							if (evalFilter(item, seg.expr)) next.push(item);
						});
					}
					break;
			}
		}
		current = next;
	}

	return current;
}
