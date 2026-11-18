/* ------------------------------------------------------------------ */
/*  compare.ts - Compare two ISO 8583 financial messages                */
/* ------------------------------------------------------------------ */

import type { UnpackedMessage, UnpackedField } from './unpacker';

export interface CompareRow {
	index: number;
	name: string;
	typeA: string;
	typeB: string;
	valueA: string;
	valueB: string;
	equal: boolean;
	/** 'both' | 'onlyA' | 'onlyB' */
	present: 'both' | 'onlyA' | 'onlyB';
}

export interface CompareResult {
	rows: CompareRow[];
	equalCount: number;
	differentCount: number;
	onlyACount: number;
	onlyBCount: number;
	identical: boolean;
	mtiEqual: boolean;
	mtiA: string;
	mtiB: string;
}

function mapFields(msg: UnpackedMessage): Map<number, UnpackedField> {
	const map = new Map<number, UnpackedField>();
	for (const f of msg.fields) map.set(f.index, f);
	return map;
}

/**
 * Compare two unpacked ISO 8583 messages field by field.
 */
export function compareMessages(a: UnpackedMessage, b: UnpackedMessage): CompareResult {
	const mapA = mapFields(a);
	const mapB = mapFields(b);

	const indices = new Set<number>([...mapA.keys(), ...mapB.keys()]);
	const sorted = [...indices].sort((x, y) => x - y);

	const rows: CompareRow[] = [];
	for (const index of sorted) {
		const fa = mapA.get(index);
		const fb = mapB.get(index);
		const present = fa && fb ? 'both' : fa ? 'onlyA' : 'onlyB';

		const valueA = fa ? fa.value : '';
		const valueB = fb ? fb.value : '';

		rows.push({
			index,
			name: fa ? fa.meta.name : fb ? fb.meta.name : '',
			typeA: fa ? fa.meta.type : '',
			typeB: fb ? fb.meta.type : '',
			valueA,
			valueB,
			equal: fa && fb ? valueA === valueB : false,
			present
		});
	}

	const equalCount = rows.filter((r) => r.present === 'both' && r.equal).length;
	const differentCount = rows.filter((r) => r.present === 'both' && !r.equal).length;
	const onlyACount = rows.filter((r) => r.present === 'onlyA').length;
	const onlyBCount = rows.filter((r) => r.present === 'onlyB').length;
	const mtiEqual = a.mti === b.mti;

	return {
		rows,
		equalCount,
		differentCount,
		onlyACount,
		onlyBCount,
		identical: mtiEqual && differentCount === 0 && onlyACount === 0 && onlyBCount === 0,
		mtiEqual,
		mtiA: a.mti,
		mtiB: b.mti
	};
}
