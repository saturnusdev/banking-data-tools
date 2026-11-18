/* ------------------------------------------------------------------ */
/*  fields.ts - Enhanced ISO 8583 Data Element (DE 2-128) metadata      */
/* ------------------------------------------------------------------ */

import { ISO8583_FIELDS } from './iso8583Fields';

export type FieldType = 'n' | 'a' | 'an' | 'ans' | 'b' | 'z';
export type LengthType = 'fixed' | 'LLVAR' | 'LLLVAR';

export interface FieldMeta {
	index: number;
	type: FieldType;
	maxLength: number;
	name: string;
	isVar: boolean;
	isAdd: boolean;
	lengthType: LengthType;
	/** number of ASCII digits used for the variable-length prefix */
	lengthDigits: number;
	/** byte length for binary fields (maxLength / 8), otherwise maxLength */
	byteLength: number;
}

function computeLengthType(maxLength: number, isVar: boolean): LengthType {
	if (!isVar) return 'fixed';
	if (maxLength <= 99) return 'LLVAR';
	return 'LLLVAR';
}

function computeLengthDigits(maxLength: number, isVar: boolean): number {
	if (!isVar) return 0;
	return String(maxLength).length;
}

function computeByteLength(type: FieldType, maxLength: number): number {
	if (type === 'b') return Math.floor(maxLength / 8);
	return maxLength;
}

export function fieldMeta(index: number): FieldMeta | null {
	const raw = ISO8583_FIELDS[String(index)];
	if (!raw) return null;
	const [type, maxLength, name, isVar, isAdd] = raw as [FieldType, number, string, boolean, boolean];
	return {
		index,
		type,
		maxLength,
		name,
		isVar: !!isVar,
		isAdd: !!isAdd,
		lengthType: computeLengthType(maxLength, !!isVar),
		lengthDigits: computeLengthDigits(maxLength, !!isVar),
		byteLength: computeByteLength(type, maxLength)
	};
}

/** All field metadata for DE 2..128 (excluding bitmap fields 1/65) */
export const ALL_FIELDS: FieldMeta[] = (() => {
	const out: FieldMeta[] = [];
	for (let i = 2; i <= 128; i++) {
		const meta = fieldMeta(i);
		if (meta) out.push(meta);
	}
	return out;
})();

/** Fields that are not bitmap positions */
export const EDITABLE_FIELDS: FieldMeta[] = ALL_FIELDS.filter((f) => f.index !== 65);

export const MTI_VERSION_ARRAY: Record<string, string> = {
	'0': '1987', '1': '1993', '2': '2003', '9': 'Private usage'
};
export const MTI_CLASS_ARRAY: Record<string, string> = {
	'1': 'Authorization message', '2': 'Financial message', '3': 'File actions message',
	'4': 'Reversal message', '5': 'Reconciliation message', '6': 'Administrative message',
	'7': 'Fee collection message', '8': 'Network management message', '9': 'Reserved by ISO'
};
export const MTI_FUNCTION_ARRAY: Record<string, string> = {
	'0': 'Request', '1': 'Request response', '2': 'Advice', '3': 'Advice response',
	'4': 'Notification', '8': 'Response acknowledgement', '9': 'Negative acknowledgement'
};
export const MTI_ORIGIN_ARRAY: Record<string, string> = {
	'0': 'Acquirer', '1': 'Acquirer repeat', '2': 'Issuer', '3': 'Issuer repeat',
	'4': 'Other', '5': 'Other repeat'
};

export function parseMti(mti: string) {
	const versionID = mti[0] || '';
	const classID = mti[1] || '';
	const functionID = mti[2] || '';
	const originID = mti[3] || '';
	return {
		mti,
		versionID,
		version: MTI_VERSION_ARRAY[versionID] || 'Unknown',
		classID,
		messageClass: MTI_CLASS_ARRAY[classID] || 'Unknown',
		functionID,
		messageFunction: MTI_FUNCTION_ARRAY[functionID] || 'Unknown',
		originID,
		messageOrigin: MTI_ORIGIN_ARRAY[originID] || 'Unknown'
	};
}

/** Validate a field value against its metadata; returns array of issues */
export function validateField(meta: FieldMeta, value: string): string[] {
	const issues: string[] = [];
	if (!value) return issues;

	if (meta.type === 'b') {
		const clean = value.replace(/\s+/g, '');
		if (clean.length % 2 !== 0) issues.push('Binary field must contain an even number of hex characters');
		if (!/^[0-9A-Fa-f]*$/.test(clean)) issues.push('Binary field must contain only hex characters');
		if (clean.length / 2 > meta.byteLength) issues.push(`Value exceeds max length (${meta.byteLength} bytes)`);
		return issues;
	}

	if (meta.type === 'n' && !/^[0-9]*$/.test(value)) issues.push('Numeric field must contain only digits');
	if ((meta.type === 'a' || meta.type === 'an') && !/^[A-Za-z0-9 ]*$/.test(value)) {
		issues.push('Alpha-numeric field contains invalid characters');
	}
	if (meta.type === 'ans' && !/^[A-Za-z0-9 \-/.,():]*$/.test(value)) {
		issues.push('Field contains unsupported characters');
	}
	if (value.length > meta.maxLength) issues.push(`Value exceeds max length (${meta.maxLength})`);
	return issues;
}
