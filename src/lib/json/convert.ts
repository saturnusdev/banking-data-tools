import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// YAML
// ---------------------------------------------------------------------------

export function jsonToYaml(json: string): string {
	const data = JSON.parse(json);
	return yaml.dump(data, { noRefs: true, lineWidth: 100, noCompatMode: false });
}

export function yamlToJson(yamlText: string): string {
	const data = yaml.load(yamlText);
	return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function collectHeaders(rows: any[]): string[] {
	const headers: string[] = [];
	const seen = new Set<string>();
	for (const row of rows) {
		if (row && typeof row === 'object' && !Array.isArray(row)) {
			for (const key of Object.keys(row)) {
				if (!seen.has(key)) {
					seen.add(key);
					headers.push(key);
				}
			}
		}
	}
	return headers;
}

function escapeCsvValue(value: any, delimiter: string): string {
	if (value === null || value === undefined) return '';
	const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
	if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return str;
}

export function jsonToCsv(json: string, delimiter = ','): string {
	const data = JSON.parse(json);
	const rows = Array.isArray(data) ? data : [data];
	if (rows.length === 0) return '';

	const headers = collectHeaders(rows);
	const lines = [headers.join(delimiter)];
	for (const row of rows) {
		lines.push(headers.map((h) => escapeCsvValue(row?.[h], delimiter)).join(delimiter));
	}
	return lines.join('\n');
}

function parseCsv(csv: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < csv.length; i++) {
		const c = csv[i];
		if (inQuotes) {
			if (c === '"') {
				if (csv[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += c;
			}
		} else if (c === '"') {
			inQuotes = true;
		} else if (c === delimiter) {
			row.push(field);
			field = '';
		} else if (c === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else if (c !== '\r') {
			field += c;
		}
	}

	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function coerceCell(raw: string): any {
	const s = raw.trim();
	if (s === '') return '';
	if (s === 'true') return true;
	if (s === 'false') return false;
	if (s === 'null') return null;
	const num = Number(s);
	if (!Number.isNaN(num) && s !== '' && /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(s)) return num;
	try {
		const parsed = JSON.parse(s);
		return parsed;
	} catch {
		return s;
	}
}

export function csvToJson(csv: string, delimiter = ','): string {
	const rows = parseCsv(csv, delimiter);
	if (rows.length < 2) return '[]';
	const headers = rows[0].map((h) => h.trim());
	const result = rows.slice(1).map((r) => {
		const obj: Record<string, any> = {};
		headers.forEach((h, i) => {
			if (h === '') return;
			obj[h] = coerceCell(r[i] ?? '');
		});
		return obj;
	});
	return JSON.stringify(result, null, 2);
}
