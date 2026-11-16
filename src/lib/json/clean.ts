export interface CleanOptions {
	removeEmptyObjects?: boolean;
	removeEmptyArrays?: boolean;
	removeNulls?: boolean;
	removeEmptyStrings?: boolean;
	sortKeys?: boolean;
	dedupeArrays?: boolean;
	trimStrings?: boolean;
}

export function cleanJson(data: any, opts: CleanOptions = {}): any {
	if (Array.isArray(data)) {
		let arr = data.map((item) => cleanJson(item, opts));
		if (opts.dedupeArrays) {
			const seen = new Set<string>();
			arr = arr.filter((item) => {
				const key = JSON.stringify(item);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}
		return arr;
	}

	if (data && typeof data === 'object') {
		const out: Record<string, any> = {};
		for (const [k, v] of Object.entries(data)) {
			const cleaned = cleanJson(v, opts);
			if (cleaned === null && opts.removeNulls) continue;
			if (cleaned === '' && opts.removeEmptyStrings) continue;
			if (Array.isArray(cleaned) && cleaned.length === 0 && opts.removeEmptyArrays) continue;
			if (
				cleaned &&
				typeof cleaned === 'object' &&
				!Array.isArray(cleaned) &&
				Object.keys(cleaned).length === 0 &&
				opts.removeEmptyObjects
			)
				continue;
			out[k] = cleaned;
		}
		const keys = Object.keys(out);
		if (opts.sortKeys) {
			return Object.fromEntries(keys.sort().map((k) => [k, out[k]]));
		}
		return out;
	}

	if (typeof data === 'string' && opts.trimStrings) return data.trim();
	return data;
}
