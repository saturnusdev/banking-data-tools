/* ------------------------------------------------------------------ */
/*  legacy.ts - ISO 8583 parser using the PREVIOUS (hybrid) logic       */
/*  Hybrid message format: MTI text + hex bitmap + ASCII data elements */
/* ------------------------------------------------------------------ */

import { parseISO8583 } from './parseISO8583';
import { fieldMeta } from './fields';
import {
	bytesToHex,
	bytesToAscii,
	asciiToBytes,
	hexToBytes,
	looksLikeHex
} from './codec';
import { buildMessage, type FieldValueInput } from './packer';
import type { UnpackedField } from './unpacker';

export interface LegacyMessage {
	mti: string;
	mtiInfo: {
		mti: string;
		versionID: string;
		version: string;
		classID: string;
		messageClass: string;
		functionID: string;
		messageFunction: string;
		originID: string;
		messageOrigin: string;
	};
	encoding: 'ascii';
	hasPrimary: boolean;
	hasSecondary: boolean;
	hasTertiary: boolean;
	bitmapHex: string;
	bitmapBits: string;
	fieldIndices: number[];
	fields: UnpackedField[];
	dataElementOffset: number;
	messageLength: number;
	parsedLength: number;
	errors: string[];
	trailing: string;
}

/** Convert hybrid (display) message bytes to wire bytes */
export function hybridToWireBytes(hybrid: string): Uint8Array {
	const clean = hybrid; // data may contain spaces - do not strip
	const mti = clean.substr(0, 4);
	const b1 = clean.substr(4, 16);
	if (b1.length < 16) throw new Error('Missing primary bitmap');
	let bitmapHex = b1;
	let dataStart = 20;
	if ((parseInt(b1.substr(0, 2), 16) & 0x80) !== 0) {
		const b2 = clean.substr(20, 16);
		bitmapHex += b2;
		dataStart = 36;
		if (b2.length >= 2 && (parseInt(b2.substr(0, 2), 16) & 0x80) !== 0) {
			bitmapHex += clean.substr(36, 16);
			dataStart = 52;
		}
	}
	const data = clean.substr(dataStart);
	const mtiHex = bytesToHex(asciiToBytes(mti));
	return hexToBytes(mtiHex + bitmapHex + bytesToHex(asciiToBytes(data)));
}

/** Convert wire bytes to hybrid (display) message string */
export function wireBytesToHybrid(bytes: Uint8Array): string {
	if (!bytes || bytes.length < 12) throw new Error('Message too short');
	const mti = bytesToAscii(bytes.subarray(0, 4));
	let bitmapCount = 1;
	if ((bytes[4] & 0x80) !== 0) {
		bitmapCount = 2;
		if (bytes.length >= 20 && (bytes[12] & 0x80) !== 0) bitmapCount = 3;
	}
	const bitmapEnd = 4 + bitmapCount * 8;
	const bitmapHex = bytesToHex(bytes.subarray(4, bitmapEnd));
	const data = bytesToAscii(bytes.subarray(bitmapEnd));
	return mti + bitmapHex + data;
}

function mapLegacy(parsed: any, bytes: Uint8Array): LegacyMessage {
	const bitmapHex: string = parsed.bitmap || '';
	const bitmapBits: string = (() => {
		let bits = '';
		for (let i = 0; i < bitmapHex.length; i += 2) {
			const dec = parseInt(bitmapHex.substr(i, 2), 16);
			for (let b = 7; b >= 0; b--) bits += dec & (1 << b) ? '1' : '0';
		}
		return bits;
	})();

	const fields: UnpackedField[] = (parsed.dataElements || []).map((de: any) => {
		const index = parseInt(de.fieldIndex, 10);
		const meta =
			fieldMeta(index) ||
			({
				index,
				type: de.fieldType,
				maxLength: de.fieldMaxLength,
				name: de.fieldName,
				isVar: false,
				isAdd: false,
				lengthType: 'fixed',
				lengthDigits: 0,
				byteLength: de.fieldLength
			} as any);
		const value = de.fieldValue ?? '';
		return {
			index,
			meta,
			value,
			valueType: de.fieldType === 'b' ? 'hex' : 'ascii',
			byteLength: de.fieldLength ?? 0,
			rawHex: bytesToHex(asciiToBytes(value)),
			raw: asciiToBytes(value)
		};
	});

	const hasSecondary = bitmapHex.length > 16;
	const hasTertiary = bitmapHex.length > 32;

	return {
		mti: parsed.mti,
		mtiInfo: {
			mti: parsed.mti,
			versionID: parsed.versionID,
			version: parsed.version,
			classID: parsed.messageClassID,
			messageClass: parsed.messageClass,
			functionID: parsed.messageFunctionID,
			messageFunction: parsed.messageFunction,
			originID: parsed.messageOriginID,
			messageOrigin: parsed.messageOrigin
		},
		encoding: 'ascii',
		hasPrimary: true,
		hasSecondary,
		hasTertiary,
		bitmapHex,
		bitmapBits,
		fieldIndices: parsed.fieldsUsed || [],
		fields,
		dataElementOffset: parsed.dataElementOffset,
		messageLength: bytes.length,
		parsedLength: parsed.dataElementOffset,
		errors: [],
		trailing: ''
	};
}

/**
 * Decode an ISO 8583 message using the PREVIOUS parser logic.
 * Auto-detects wire-format hex (converts to hybrid) or hybrid/display input.
 */
export function decodeLegacy(raw: string): { msg: LegacyMessage; bytes: Uint8Array; inputEncoding: 'hex' | 'hybrid' } {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Input is empty');

	let hybrid: string;
	let bytes: Uint8Array;
	let inputEncoding: 'hex' | 'hybrid';

	if (looksLikeHex(trimmed)) {
		bytes = hexToBytes(trimmed);
		hybrid = wireBytesToHybrid(bytes);
		inputEncoding = 'hex';
	} else {
		hybrid = trimmed;
		bytes = hybridToWireBytes(trimmed);
		inputEncoding = 'hybrid';
	}

	// Use the previous parser logic (additionLength = 1, same as previous page)
	const parsed = parseISO8583(hybrid, 1);
	const msg = mapLegacy(parsed, bytes);
	return { msg, bytes, inputEncoding };
}

export interface LegacyBuildResult {
	hybrid: string;
	bytes: Uint8Array;
	hex: string;
	ascii: string;
	ebcdic: string;
	errors: string[];
}

/**
 * Build an ISO 8583 message in the PREVIOUS (hybrid/display) format.
 * Compatible with decodeLegacy / the previous parser.
 */
export function buildLegacy(mti: string, inputs: FieldValueInput[]): LegacyBuildResult {
	const wire = buildMessage(mti, inputs, 'ascii');
	let bitmapCount = 1;
	for (const inp of inputs) {
		if (inp.index > 64) bitmapCount = Math.max(bitmapCount, 2);
		if (inp.index > 128) bitmapCount = Math.max(bitmapCount, 3);
	}
	const bitmapEnd = 4 + bitmapCount * 8;
	const mtiText = bytesToAscii(wire.bytes.subarray(0, 4));
	const bitmapHex = bytesToHex(wire.bytes.subarray(4, bitmapEnd));
	const dataText = bytesToAscii(wire.bytes.subarray(bitmapEnd));
	const hybrid = mtiText + bitmapHex + dataText;

	return {
		hybrid,
		bytes: wire.bytes,
		hex: wire.hex,
		ascii: wire.ascii,
		ebcdic: wire.ebcdic,
		errors: wire.errors
	};
}
