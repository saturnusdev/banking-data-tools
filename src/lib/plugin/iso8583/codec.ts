/* ------------------------------------------------------------------ */
/*  codec.ts - Encoding / decoding utilities for ISO 8583 Message Studio */
/* ------------------------------------------------------------------ */

/* EBCDIC (IBM037 / CP037) printable character mapping used by ISO 8583 */
const EBCDIC_TO_ASCII: Record<string, string> = {
	'00': '<NUL>', '01': '<SOH>', '02': '<STX>', '03': '<ETX>', '04': '<SEL>', '05': '<HT>',
	'06': '<RNL>', '07': '<DEL>', '08': '<GE>', '09': '<SPS>', '0A': '<RPT>', '0B': '<VT>',
	'0C': '<FF>', '0D': '\r', '0E': '<SO>', '0F': '<SI>', '1A': '<SUB>', '25': '<LF>',
	'40': ' ', '4A': '[', '4B': '.', '4C': '<', '4D': '(', '4E': '+', '4F': '!',
	'50': '&', '5A': ']', '5B': '$', '5C': '*', '5D': ')', '5E': ';', '5F': '^',
	'60': '-', '61': '/', '6A': '|', '6B': ',', '6C': '%', '6D': '_', '6E': '>', '6F': '?',
	'79': '`', '7A': ':', '7B': '#', '7C': '@', '7D': "'", '7E': '=', '7F': '"',
	'81': 'a', '82': 'b', '83': 'c', '84': 'd', '85': 'e', '86': 'f', '87': 'g', '88': 'h', '89': 'i',
	'91': 'j', '92': 'k', '93': 'l', '94': 'm', '95': 'n', '96': 'o', '97': 'p', '98': 'q', '99': 'r',
	'A1': '~', 'A2': 's', 'A3': 't', 'A4': 'u', 'A5': 'v', 'A6': 'w', 'A7': 'x', 'A8': 'y', 'A9': 'z',
	'C0': '{', 'C1': 'A', 'C2': 'B', 'C3': 'C', 'C4': 'D', 'C5': 'E', 'C6': 'F', 'C7': 'G', 'C8': 'H', 'C9': 'I',
	'D0': '}', 'D1': 'J', 'D2': 'K', 'D3': 'L', 'D4': 'M', 'D5': 'N', 'D6': 'O', 'D7': 'P', 'D8': 'Q', 'D9': 'R',
	'E0': '\\', 'E2': 'S', 'E3': 'T', 'E4': 'U', 'E5': 'V', 'E6': 'W', 'E7': 'X', 'E8': 'Y', 'E9': 'Z',
	'F0': '0', 'F1': '1', 'F2': '2', 'F3': '3', 'F4': '4', 'F5': '5', 'F6': '6', 'F7': '7', 'F8': '8', 'F9': '9'
};

const ASCII_TO_EBCDIC: Record<string, string> = {};
Object.entries(EBCDIC_TO_ASCII).forEach(([hex, value]) => {
	if (value.length === 1) ASCII_TO_EBCDIC[value] = hex;
});

/* ---------------- Byte <-> Hex ---------------- */

export function bytesToHex(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
	return out.toUpperCase();
}

export function hexToBytes(hex: string): Uint8Array {
	const clean = hex.replace(/\s+/g, '');
	if (clean.length % 2 !== 0) throw new Error('Hex string must have an even number of characters');
	const out = new Uint8Array(clean.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
	return out;
}

/* ---------------- Byte <-> Base64 ---------------- */

export function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
	}
	return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
	const cleaned = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
	const binary = atob(padded);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}

/* ---------------- Byte <-> ASCII ---------------- */

export function bytesToAscii(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		const c = bytes[i];
		out += c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
	}
	return out;
}

export function asciiToBytes(str: string): Uint8Array {
	const out = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
	return out;
}

/* ---------------- Byte <-> EBCDIC ---------------- */

export function bytesToEbcdic(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		const hex = bytes[i].toString(16).toUpperCase().padStart(2, '0');
		out += EBCDIC_TO_ASCII[hex] ?? '.';
	}
	return out;
}

export function asciiToEbcdicBytes(str: string): Uint8Array {
	const hexChars: string[] = [];
	for (const ch of str) hexChars.push(ASCII_TO_EBCDIC[ch] ?? '00');
	const hex = hexChars.join('');
	return hexToBytes(hex);
}

export function asciiToEbcdicHex(str: string): string {
	let hex = '';
	for (const ch of str) hex += ASCII_TO_EBCDIC[ch] ?? '00';
	return hex.toUpperCase();
}

export function ebcdicToAscii(bytes: Uint8Array): string {
	return bytesToEbcdic(bytes);
}

/* ---------------- Auto-detect input format ---------------- */

export function looksLikeHex(input: string): boolean {
	const clean = input.replace(/\s+/g, '');
	if (clean.length < 8 || clean.length % 2 !== 0) return false;
	if (!/^[0-9A-Fa-f]+$/.test(clean)) return false;
	const first = parseInt(clean.substr(0, 2), 16);
	return first === 0x30 || first === 0xf0;
}

export function looksLikeBase64(input: string): boolean {
	const clean = input.replace(/\s+/g, '');
	if (clean.length < 8) return false;
	if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(clean)) return false;
	if (clean.length % 4 === 1) return false;
	try {
		const bytes = base64ToBytes(clean);
		if (bytes.length < 4) return false;
		const first = bytes[0];
		return (first >= 0x30 && first <= 0x39) || (first >= 0xf0 && first <= 0xf9);
	} catch {
		return false;
	}
}

export type DetectedEncoding = 'base64' | 'hex' | 'ascii';

export interface NormalizedInput {
	bytes: Uint8Array;
	encoding: DetectedEncoding;
	hex: string;
	ascii: string;
	ebcdic: string;
}

/**
 * Normalize raw input into bytes, auto-detecting base64 / hex / ascii.
 * Base64 and Hex inputs are always decoded first before being used.
 */
export function normalizeInput(raw: string): NormalizedInput {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Input is empty');

	let bytes: Uint8Array;
	let encoding: DetectedEncoding;

	if (looksLikeHex(trimmed)) {
		bytes = hexToBytes(trimmed);
		encoding = 'hex';
	} else if (looksLikeBase64(trimmed)) {
		bytes = base64ToBytes(trimmed);
		encoding = 'base64';
	} else {
		bytes = asciiToBytes(trimmed);
		encoding = 'ascii';
	}

	return {
		bytes,
		encoding,
		hex: bytesToHex(bytes),
		ascii: bytesToAscii(bytes),
		ebcdic: bytesToEbcdic(bytes)
	};
}
