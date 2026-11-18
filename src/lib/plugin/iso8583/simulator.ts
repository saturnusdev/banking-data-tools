/* ------------------------------------------------------------------ */
/*  simulator.ts - ISO 8583 request / response simulator                */
/* ------------------------------------------------------------------ */

import type { UnpackedMessage } from './unpacker';
import type { FieldValueInput } from './packer';

/**
 * Derive the response MTI from a request MTI.
 * 0200 -> 0210 (request -> request response), 0220 -> 0230 (advice -> advice response).
 */
export function responseMti(requestMti: string): string {
	const fn = requestMti[2] || '0';
	const responseFn = fn === '0' ? '1' : fn === '2' ? '3' : '1';
	return requestMti.slice(0, 2) + responseFn + (requestMti[3] || '0');
}

export interface SimulatedResponse {
	mti: string;
	fields: FieldValueInput[];
	notes: string[];
}

/**
 * Generate a plausible response message for a given request.
 * Copies request fields and applies common response semantics:
 *  - field 39 (response code) set to '00' (approved)
 *  - field 38 (authorization id response) generated if the request was authorized
 */
export function simulateResponse(request: UnpackedMessage): SimulatedResponse {
	const notes: string[] = [];
	const fields = new Map<number, string>();

	for (const f of request.fields) {
		if (f.index === 65) continue;
		fields.set(f.index, f.value);
	}

	const mti = responseMti(request.mti);
	notes.push(`Request MTI ${request.mti} -> Response MTI ${mti}`);

	// Set response code (DE 39) for request/advice messages
	const fn = request.mti[2];
	if (fn === '0' || fn === '2') {
		fields.set(39, '00');
		notes.push('Field 39 (Response code) set to 00 (Approved)');
	}

	// Generate authorization id response (DE 38) if not present
	if (!fields.has(38) && request.mti[2] === '0') {
		const rand = Math.floor(100000 + Math.random() * 900000).toString();
		fields.set(38, rand);
		notes.push(`Field 38 (Authorization ID response) generated: ${rand}`);
	}

	const sorted = [...fields.entries()]
		.filter(([, v]) => v !== '' && v != null)
		.sort((a, b) => a[0] - b[0])
		.map(([index, value]) => ({ index, value }));

	return { mti, fields: sorted, notes };
}
