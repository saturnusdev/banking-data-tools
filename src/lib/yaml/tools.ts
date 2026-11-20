export type YamlToolId =
	'validate' | 'lint' | 'convert' | 'format' | 'merge' | 'diff' | 'keys' | 'filter';

export interface YamlToolDef {
	id: YamlToolId;
	label: string;
	icon: string;
	description: string;
	shortcut: number;
}

// ---------------------------------------------------------------------------
// Extensible YAML tool registry.
//
// To add a new tool:
//   1. Add an entry here (id, label, icon, description, shortcut)
//   2. Add the id to the YamlToolId union above
//   3. Add a case to runActive() in YamlToolTabs.svelte
//   4. Add an input render block and an output renderer in YamlToolTabs.svelte
// ---------------------------------------------------------------------------
export const YAML_TOOLS: YamlToolDef[] = [
	{
		id: 'validate',
		label: 'Validate',
		icon: 'mdi:check-decagram',
		description: 'Check YAML syntax and show a summary of the parsed document',
		shortcut: 1
	},
	{
		id: 'lint',
		label: 'Lint',
		icon: 'mdi:lint',
		description: 'Find style issues, duplicate keys, tabs, and trailing whitespace',
		shortcut: 2
	},
	{
		id: 'convert',
		label: 'Convert',
		icon: 'mdi:swap-horizontal',
		description: 'Convert YAML to JSON, CSV, or XML and back',
		shortcut: 3
	},
	{
		id: 'format',
		label: 'Minify / Pretty',
		icon: 'mdi:format-align-center',
		description: 'Pretty-print (block style) or minify (flow style) YAML',
		shortcut: 4
	},
	{
		id: 'merge',
		label: 'Merge',
		icon: 'mdi:merge',
		description: 'Deep-merge two YAML documents',
		shortcut: 5
	},
	{
		id: 'diff',
		label: 'Diff',
		icon: 'mdi:compare',
		description: 'Compare two YAML documents line by line',
		shortcut: 6
	},
	{
		id: 'keys',
		label: 'Key Values',
		icon: 'mdi:key-variant',
		description: 'Extract all key/value paths from the document',
		shortcut: 7
	},
	{
		id: 'filter',
		label: 'Filter',
		icon: 'mdi:filter-variant',
		description: 'Keep or remove keys and values by name or path',
		shortcut: 8
	}
];
