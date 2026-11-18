/* ------------------------------------------------------------------ */
/*  packer.ts - Byte-oriented ISO 8583 message builder / packer         */
/* ------------------------------------------------------------------ */

import { fieldMeta, type FieldMeta } from './fields';
import {
	bytesToHex,
	bytesToAscii,
	bytesToEbcdic,
	asciiToBytes,
	asciiToEbcdicBytes,
	hexToBytes
} from './codec';
import type { MessageEncoding } from './unpacker';

export interface FieldValueInput {
	index: number;
	value: string;
}

export interface BuildResult {
	bytes: Uint8Array;
	hex: string;
	ascii: string;
	ebcdic: string;
	errors: string[];
}

/** Pad a fixed-length text field value */
function padValue(value: string, meta: FieldMeta): string {
	if (value.length >= meta.maxLength) return value;
	if (meta.type === 'n') return value.padStart(meta.maxLength, '0');
	return value.padEnd(meta.maxLength, ' ');
}

function encodeFieldValue(value: string, meta: FieldMeta, encoding: MessageEncoding): Uint8Array {
	if (meta.type === 'b') {
		return hexToBytes(value.replace(/\s+/g, ''));
	}
	if (encoding === 'ebcdic') return asciiToEbcdicBytes(value);
	return asciiToBytes(value);
}

function encodeLengthPrefix(length: number, digits: number, encoding: MessageEncoding): Uint8Array {
	const str = String(length).padStart(digits, '0');
	return encodeFieldValue(str, { type: 'n', maxLength: digits } as FieldMeta, encoding);
}

/**
 * Build / pack an ISO 8583 message from an MTI and field values.
 */
export function buildMessage(
	mti: string,
	inputs: FieldValueInput[],
	encoding: MessageEncoding = 'ascii'
): BuildResult {
	const errors: string[] = [];

	if (!/^\d{4}$/.test(mti)) {
		errors.push('MTI must be exactly 4 digits');
	}

	const present = new Map<number, string>();
	for (const input of inputs) {
		const idx = input.index;
		if (idx < 2 || idx > 128 || idx === 65) {
			errors.push(`Invalid field index: ${idx}`);
			continue;
		}
		if (input.value !== '' && input.value != null) {
			present.set(idx, input.value);
		}
	}

	// Determine bitmap count needed
	let bitmapCount = 1;
	for (const idx of present.keys()) {
		if (idx > 64) bitmapCount = Math.max(bitmapCount, 2);
		if (idx > 128) bitmapCount = Math.max(bitmapCount, 3);
	}

	const bitmapBytes = new Uint8Array(bitmapCount * 8);
	const setBit = (bitIndex: number) => {
		const byteIndex = Math.floor((bitIndex - 1) / 8);
		const bitPos = (bitIndex - 1) % 8;
		bitmapBytes[byteIndex] |= 0x80 >> bitPos;
	};

	if (bitmapCount >= 2) setBit(1); // secondary bitmap present
	if (bitmapCount >= 3) setBit(65); // tertiary bitmap present
	for (const idx of present.keys()) setBit(idx);

	// Assemble bytes
	const chunks: Uint8Array[] = [];
	chunks.push(encodeFieldValue(mti, { type: 'n', maxLength: 4 } as FieldMeta, encoding));
	chunks.push(bitmapBytes);

	for (const [idx, value] of [...present.entries()].sort((a, b) => a[0] - b[0])) {
		const meta = fieldMeta(idx);
		if (!meta) continue;

		if (meta.isVar) {
			let valueBytes = encodeFieldValue(value, meta, encoding);
			// For binary variable fields value is hex string -> byte length
			const length = meta.type === 'b' ? valueBytes.length : valueBytes.length;
			if (length > meta.maxLength) {
				errors.push(`Field ${idx} length (${length}) exceeds max (${meta.maxLength})`);
				valueBytes = valueBytes.subarray(0, meta.maxLength);
			}
			chunks.push(encodeLengthPrefix(valueBytes.length, meta.lengthDigits, encoding));
			chunks.push(valueBytes);
		} else if (meta.isAdd) {
			const padded = meta.type === 'b' ? value : padValue(value, meta);
			chunks.push(encodeFieldValue(padded, meta, encoding));
		} else {
			const padded = meta.type === 'b' ? value : padValue(value, meta);
			chunks.push(encodeFieldValue(padded, meta, encoding));
		}
	}

	// Concat
	let total = 0;
	for (const c of chunks) total += c.length;
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		bytes.set(c, offset);
		offset += c.length;
	}

	return {
		bytes,
		hex: bytesToHex(bytes),
		ascii: bytesToAscii(bytes),
		ebcdic: bytesToEbcdic(bytes),
		errors
	};
}
