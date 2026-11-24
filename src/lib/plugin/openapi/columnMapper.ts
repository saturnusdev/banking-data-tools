import { COLUMN_ROLES, type ColumnMap, type ColumnRole } from './types';

const ROLE_PATTERNS: Record<ColumnRole, RegExp> = {
	type: /type|datatype|data\s*type|tipe/i,
	format: /format/i,
	description: /desc|keterangan|note/i,
	path: /path|\$\./i,
	required: /required|mandatory|wajib/i,
	example: /example|sample|contoh/i,
	definition: /definition|schema|structure|struktur/i,
	name: /field|name|propert|attribute|kolom/i
};

/** Order matters: more specific roles claim columns before the generic `name` role. */
const DETECTION_ORDER: ColumnRole[] = [
	'type',
	'format',
	'description',
	'path',
	'required',
	'example',
	'definition',
	'name'
];

/** Convert an arbitrary header label into a camelCase property name. */
export function toCamelCase(str: string) {
	return String(str ?? '')
		.replace(/[^a-zA-Z0-9]/g, ' ')
		.split(' ')
		.filter((word) => word)
		.map((word, index) =>
			index === 0
				? word.toLowerCase()
				: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
		)
		.join('');
}

/** PascalCase identifier used for nested model names. */
export function normalizeName(name: string) {
	return String(name ?? '')
		.split(/[^a-zA-Z0-9]/)
		.filter(Boolean)
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join('');
}

/**
 * Guess the column -> role mapping from the chosen header row.
 * Each column can only be claimed once; unmapped roles stay null.
 */
export function autoMapColumns(headerRow: any[]): ColumnMap {
	const map = {} as ColumnMap;
	for (const role of COLUMN_ROLES) map[role] = null;

	const claimed = new Set<number>();
	for (const role of DETECTION_ORDER) {
		for (let i = 0; i < headerRow.length; i++) {
			if (claimed.has(i)) continue;
			const header = String(headerRow[i] ?? '').trim();
			if (!header) continue;
			if (ROLE_PATTERNS[role].test(header)) {
				map[role] = i;
				claimed.add(i);
				break;
			}
		}
	}
	return map;
}

/** Human readable label for a column index using the header row. */
export function columnLabel(headerRow: any[], index: number | null): string {
	if (index === null || index === undefined) return '—';
	const value = headerRow[index];
	const label = String(value ?? '').trim();
	return label || `Column ${index + 1}`;
}
