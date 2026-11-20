import { isPlainObject } from './yaml';

export type MergeArrayMode = 'replace' | 'concat';

// Recursive deep merge: objects merge key-by-key, arrays are replaced or
// concatenated (per arrayMode), scalars from `override` win.
export function deepMerge(base: any, override: any, arrayMode: MergeArrayMode = 'replace'): any {
	if (Array.isArray(base) && Array.isArray(override)) {
		return arrayMode === 'concat' ? [...base, ...override] : override;
	}
	if (isPlainObject(base) && isPlainObject(override)) {
		const result: any = { ...base };
		for (const key of Object.keys(override)) {
			result[key] = key in base ? deepMerge(base[key], override[key], arrayMode) : override[key];
		}
		return result;
	}
	return override;
}
