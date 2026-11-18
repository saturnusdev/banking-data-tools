/* ------------------------------------------------------------------ */
/*  unpacker.ts - Byte-oriented ISO 8583 message decoder                */
/* ------------------------------------------------------------------ */

import { fieldMeta, parseMti, type FieldMeta } from './fields';
import { bytesToHex, bytesToAscii, bytesToEbcdic } from './codec';

export type MessageEncoding = 'ascii' | 'ebcdic';

export interface UnpackedField {
	index: number;
	meta: FieldMeta;
	/** display value: ASCII text for text fields, hex string for binary fields */
	value: string;
	valueType: 'ascii' | 'hex';
	/** bytes actually consumed from the message */
	byteLength: number;
	/** hex representation of the raw bytes of this field */
	rawHex: string;
	/** raw byte array of this field */
	raw: Uint8Array;
}

export interface UnpackedMessage {
	mti: string;
	mtiInfo: ReturnType<typeof parseMti>;
	encoding: MessageEncoding;
	hasPrimary: boolean;
	hasSecondary: boolean;
	hasTertiary: boolean;
	bitmapHex: string;
	bitmapBytes: Uint8Array;
	bitmapBits: string;
	fieldIndices: number[];
	fields: UnpackedField[];
	dataElementOffset: number;
	messageLength: number;
	/** total bytes consumed by parsed fields */
	parsedLength: number;
	errors: string[];
	/** leftover bytes after last parsed field */
	trailing: string;
}

const BITMAP_FIELD_COUNT = 64;

function isBitSet(bytes: Uint8Array, bitIndex: number): boolean {
	const byteIndex = Math.floor((bitIndex - 1) / 8);
	const bitPos = (bitIndex - 1) % 8;
	const mask = 0x80 >> bitPos;
	return (bytes[byteIndex] & mask) !== 0;
}

function bitmapToString(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		for (let b = 7; b >= 0; b--) out += (bytes[i] & (1 << b)) ? '1' : '0';
	}
	return out;
}

function decodeMti(bytes: Uint8Array, encoding: MessageEncoding): string {
	let mti = '';
	for (let i = 0; i < 4; i++) {
		const b = bytes[i];
		if (encoding === 'ebcdic') {
			mti += String.fromCharCode(b >= 0xf0 && b <= 0xf9 ? b - 0xf0 + 48 : 63);
		} else {
			mti += b >= 0x30 && b <= 0x39 ? String.fromCharCode(b) : String.fromCharCode(63);
		}
	}
	return mti;
}

/** Decode a length prefix (ASCII or EBCDIC digits) to an integer */
function decodeLengthPrefix(bytes: Uint8Array, count: number, encoding: MessageEncoding): number {
	let str = '';
	for (let i = 0; i < count; i++) {
		const b = bytes[i];
		if (encoding === 'ebcdic') {
			str += String.fromCharCode(b >= 0xf0 && b <= 0xf9 ? b - 0xf0 + 48 : 63);
		} else {
			str += String.fromCharCode(b >= 0x30 && b <= 0x39 ? b : 63);
		}
	}
	const val = parseInt(str, 10);
	return Number.isFinite(val) ? val : -1;
}

function decodeFieldText(bytes: Uint8Array, encoding: MessageEncoding): string {
	return encoding === 'ebcdic' ? bytesToEbcdic(bytes) : bytesToAscii(bytes);
}

/**
 * Unpack / decode an ISO 8583 message from raw bytes.
 */
export function unpackMessage(bytes: Uint8Array): UnpackedMessage {
	const errors: string[] = [];

	if (!bytes || bytes.length < 4) {
		throw new Error('Message too short: missing MTI');
	}

	// Detect encoding from MTI first byte
	const encoding: MessageEncoding = bytes[0] >= 0xf0 ? 'ebcdic' : 'ascii';
	const mti = decodeMti(bytes, encoding);
	const mtiInfo = parseMti(mti);

	// Primary bitmap starts at byte 4
	if (bytes.length < 12) {
		throw new Error('Message too short: missing primary bitmap');
	}
	const bitmapStart = 4;
	let bitmapCount = 1;
	const hasPrimary = true;

	const primary = bytes.subarray(bitmapStart, bitmapStart + 8);
	const hasSecondary = isBitSet(primary, 1);

	let hasTertiary = false;
	if (hasSecondary) {
		if (bytes.length < bitmapStart + 16) {
			errors.push('Message too short: missing secondary bitmap');
		} else {
			const secondary = bytes.subarray(bitmapStart + 8, bitmapStart + 16);
			hasTertiary = isBitSet(secondary, 1);
			bitmapCount = hasTertiary ? 3 : 2;
		}
	}

	const bitmapBytes = bytes.subarray(bitmapStart, bitmapStart + bitmapCount * 8);
	const bitmapHex = bytesToHex(bitmapBytes);
	const bitmapBits = bitmapToString(bitmapBytes);

	// Field indices from bitmap (skip bitmap indicator positions 1 and 65)
	const fieldIndices: number[] = [];
	for (let i = 1; i <= bitmapCount * BITMAP_FIELD_COUNT; i++) {
		if (i === 1 || i === 65) continue;
		if (isBitSet(bitmapBytes, i)) fieldIndices.push(i);
	}

	const dataElementOffset = bitmapStart + bitmapCount * 8;
	let offset = dataElementOffset;
	const fields: UnpackedField[] = [];

	for (const index of fieldIndices) {
		const meta = fieldMeta(index);
		if (!meta) {
			errors.push(`Unknown field ${index}`);
			continue;
		}

		if (offset >= bytes.length) {
			errors.push(`Truncated message: expected field ${index}`);
			break;
		}

		let valueBytes: Uint8Array | null = null;
		let byteLength = 0;

		if (meta.isVar) {
			const prefixBytes = bytes.subarray(offset, offset + meta.lengthDigits);
			if (prefixBytes.length < meta.lengthDigits) {
				errors.push(`Truncated length prefix for field ${index}`);
				break;
			}
			const length = decodeLengthPrefix(prefixBytes, meta.lengthDigits, encoding);
			offset += meta.lengthDigits;
			if (length < 0) {
				errors.push(`Invalid length prefix for field ${index}`);
				break;
			}
			byteLength = length;
			if (offset + byteLength > bytes.length) {
				errors.push(`Field ${index} length (${byteLength}) exceeds remaining message`);
				byteLength = bytes.length - offset;
			}
			valueBytes = bytes.subarray(offset, offset + byteLength);
			offset += byteLength;
		} else {
			byteLength = meta.byteLength;
			if (offset + byteLength > bytes.length) {
				errors.push(`Field ${index} exceeds remaining message`);
				byteLength = bytes.length - offset;
			}
			valueBytes = bytes.subarray(offset, offset + byteLength);
			offset += byteLength;
		}

		if (!valueBytes) continue;

		const isBinary = meta.type === 'b';
		fields.push({
			index,
			meta,
			value: isBinary ? bytesToHex(valueBytes) : decodeFieldText(valueBytes, encoding),
			valueType: isBinary ? 'hex' : 'ascii',
			byteLength,
			rawHex: bytesToHex(valueBytes),
			raw: valueBytes
		});
	}

	const trailing = offset < bytes.length ? bytesToHex(bytes.subarray(offset)) : '';

	return {
		mti,
		mtiInfo,
		encoding,
		hasPrimary,
		hasSecondary,
		hasTertiary,
		bitmapHex,
		bitmapBytes,
		bitmapBits,
		fieldIndices,
		fields,
		dataElementOffset,
		messageLength: bytes.length,
		parsedLength: offset,
		errors,
		trailing
	};
}
