import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Core YAML parse / dump helpers
// ---------------------------------------------------------------------------

export interface YamlDumpOptions {
	indent?: number;
	lineWidth?: number;
	flowLevel?: number;
	sortKeys?: boolean;
	noRefs?: boolean;
	noCompatMode?: boolean;
	skipInvalid?: boolean;
}

export function isPlainObject(value: any): boolean {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseYaml(text: string): any {
	if (!text || !text.trim()) {
		throw new Error('YAML content is empty');
	}
	return yaml.load(text);
}

export function dumpYaml(data: any, options: YamlDumpOptions = {}): string {
	const {
		indent = 2,
		lineWidth = 100,
		flowLevel = -1,
		sortKeys = false,
		noRefs = true,
		noCompatMode = false,
		skipInvalid = false
	} = options;
	return yaml.dump(data, {
		indent,
		lineWidth,
		flowLevel,
		sortKeys,
		noRefs,
		noCompatMode,
		skipInvalid
	});
}

export function yamlToJson(text: string): string {
	return JSON.stringify(parseYaml(text), null, 2);
}

export function jsonToYaml(text: string, options: YamlDumpOptions = {}): string {
	const data = JSON.parse(text);
	return dumpYaml(data, options);
}

// Recursively sort object keys so key order / whitespace don't show up as diffs.
export function sortKeysDeep(value: any): any {
	if (Array.isArray(value)) return value.map(sortKeysDeep);
	if (isPlainObject(value)) {
		const sorted: any = {};
		for (const key of Object.keys(value).sort()) {
			sorted[key] = sortKeysDeep(value[key]);
		}
		return sorted;
	}
	return value;
}
