function inferFormat(s: string): string | undefined {
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return 'date-time';
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'date';
	if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return 'email';
	if (/^https?:\/\//.test(s)) return 'uri';
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return 'uuid';
	return undefined;
}

function mergeSchemas(schemas: any[]): any {
	const types = [...new Set(schemas.map((s) => s.type).filter(Boolean))];
	if (types.length === 0) return {};
	if (types.length === 1) {
		const base: any = { type: types[0] };
		const fmt = schemas.find((s) => s.format)?.format;
		if (fmt) base.format = fmt;
		return base;
	}
	return { anyOf: types.map((t) => ({ type: t })) };
}

function inferSchema(value: any): any {
	if (value === null) return { type: 'null' };
	if (Array.isArray(value)) {
		if (value.length === 0) return { type: 'array', items: {} };
		return { type: 'array', items: mergeSchemas(value.map((v) => inferSchema(v))) };
	}
	if (typeof value === 'string') {
		const schema: any = { type: 'string' };
		const format = inferFormat(value);
		if (format) schema.format = format;
		return schema;
	}
	if (typeof value === 'number') return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
	if (typeof value === 'boolean') return { type: 'boolean' };
	if (typeof value === 'object') {
		const properties: Record<string, any> = {};
		const required: string[] = [];
		for (const [k, v] of Object.entries(value)) {
			properties[k] = inferSchema(v);
			required.push(k);
		}
		const schema: any = { type: 'object', properties };
		if (required.length) schema.required = required;
		return schema;
	}
	return {};
}

export function generateSchema(data: any): any {
	const schema: any = inferSchema(data);
	schema['$schema'] = 'http://json-schema.org/draft-07/schema#';
	return schema;
}

export function generateMock(schema: any, depth = 0): any {
	if (depth > 6) return null;
	if (schema.example !== undefined) return schema.example;
	if (schema.default !== undefined) return schema.default;
	if (schema.const !== undefined) return schema.const;
	if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];

	const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

	switch (type) {
		case 'string': {
			if (schema.format === 'date-time') return new Date().toISOString();
			if (schema.format === 'date') return new Date().toISOString().slice(0, 10);
			if (schema.format === 'email') return 'user@example.com';
			if (schema.format === 'uri') return 'https://example.com';
			if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
			if (schema.pattern) return schema.pattern;
			return 'string';
		}
		case 'integer':
		case 'number':
			if (schema.minimum !== undefined) return schema.minimum;
			if (schema.min !== undefined) return schema.min;
			return 0;
		case 'boolean':
			return true;
		case 'null':
			return null;
		case 'array':
			if (schema.prefixItems) return schema.prefixItems.map((s: any) => generateMock(s, depth + 1));
			return [generateMock(schema.items || {}, depth + 1)];
		case 'object': {
			const obj: Record<string, any> = {};
			const props = schema.properties || {};
			for (const [k, v] of Object.entries(props)) obj[k] = generateMock(v, depth + 1);
			return obj;
		}
		case 'anyOf':
			return generateMock((schema.anyOf || [{}])[0], depth + 1);
		case 'oneOf':
			return generateMock((schema.oneOf || [{}])[0], depth + 1);
		default:
			if (schema.properties) {
				const obj: Record<string, any> = {};
				for (const [k, v] of Object.entries(schema.properties)) obj[k] = generateMock(v, depth + 1);
				return obj;
			}
			return 'string';
	}
}
