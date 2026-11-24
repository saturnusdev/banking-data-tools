import { parseDefinitionCell } from '../swagger/definition';
import { ensureModel } from '../swagger/ensureModel';
import { isRequired } from '../swagger/requiredDetector';
import { cellAt } from './excelReader';
import { normalizeName, toCamelCase } from './columnMapper';
import type { BuildResult, ColumnMap, Group } from './types';

export const GROUP_ROOT: Record<'header' | 'request' | 'response', string> = {
	header: 'Header',
	request: 'Request',
	response: 'Response'
};

/** Interpret a "required/mandatory" cell as a boolean. */
function isTruthyRequired(value: boolean) {
	const v = String(value ?? '').trim().toLowerCase();
	return ['y', 'yes', 'true', '1', 'required', 'mandatory', 'wajib'].includes(v);
}

/** Build a property schema for one row from the mapped columns. */
function buildPropertySchema(row: any[], map: ColumnMap) {
	const defText = cellAt(row, map.definition);
	if (typeof defText === 'string' && defText.trim()) {
		const parsed = parseDefinitionCell(defText);
		const keys = Object.keys(parsed || {});
		if (keys.length) return parsed[keys[0]];
	}

	const schema: any = {};
	const type = cellAt(row, map.type);
	if (String(type).trim()) schema.type = String(type).trim().toLowerCase();
	const format = cellAt(row, map.format);
	if (String(format).trim()) schema.format = String(format).trim();
	const description = cellAt(row, map.description);
	if (String(description).trim()) schema.description = String(description).trim();
	const example = cellAt(row, map.example);
	if (String(example).trim()) schema.example = example;
	return schema;
}

/** Place a property at a (possibly nested) path, creating intermediate models. */
export function applyPathRef({
	definitions,
	refBase,
	rootModelName,
	path,
	propertySchema,
	required = false
}: any) {
	const segments = String(path || '')
		.replace(/^\$\.?/, '')
		.split('.')
		.filter(Boolean);

	let parentModel = rootModelName;
	ensureModel(definitions, parentModel);

	segments.forEach((seg, idx) => {
		const isArray = seg.endsWith('[*]');
		const key = seg.replace('[*]', '').trim();
		if (!key) return;
		const isLast = idx === segments.length - 1;

		if (isLast) {
			definitions[parentModel].properties[key] = propertySchema;
			if (required && !definitions[parentModel].required.includes(key)) {
				definitions[parentModel].required.push(key);
			}
			return;
		}

		const modelName = parentModel + normalizeName(key);
		ensureModel(definitions, modelName);
		definitions[parentModel].properties[key] = isArray
			? { type: 'array', items: { $ref: `${refBase}/${modelName}` } }
			: { $ref: `${refBase}/${modelName}` };
		parentModel = modelName;
	});
}

/**
 * Build Request / Response / Header models from the tagged rows.
 * `refBase` is `#/definitions` (Swagger 2.0) or `#/components/schemas` (OpenAPI 3.0).
 */
export function buildDefinitions({
	dataRows,
	rowGroups,
	columnMap,
	refBase
}: {
	dataRows: any[][];
	rowGroups: Group[];
	columnMap: ColumnMap;
	refBase: string;
}): BuildResult {
	const definitions: Record<string, any> = {};
	const present = { header: false, request: false, response: false };

	for (const group of ['header', 'request', 'response'] as const) {
		ensureModel(definitions, GROUP_ROOT[group]);
	}

	dataRows.forEach((row, i) => {
		const group = rowGroups[i];
		if (!group || group === 'none') return;

		const root = GROUP_ROOT[group];
		const rawName = String(cellAt(row, columnMap.name) ?? '').trim();
		const propName = toCamelCase(rawName);
		if (!propName) return;

		present[group] = true;
		const propertySchema = buildPropertySchema(row, columnMap);
		const path = String(cellAt(row, columnMap.path) ?? '').trim();
		const required =
			isTruthyRequired(cellAt(row, columnMap.required)) ||
			isRequired(propertySchema);

		if (path) {
			applyPathRef({
				definitions,
				refBase,
				rootModelName: root,
				path,
				propertySchema,
				required
			});
		} else {
			definitions[root].properties[propName] = propertySchema;
			if (required && !definitions[root].required.includes(propName)) {
				definitions[root].required.push(propName);
			}
		}
	});

	// Drop empty required arrays for cleanliness.
	Object.values(definitions).forEach((def: any) => {
		if (Array.isArray(def.required) && def.required.length === 0) {
			delete def.required;
		}
	});

	return { definitions, present };
}
