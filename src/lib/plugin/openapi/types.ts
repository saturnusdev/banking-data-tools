/**
 * Shared types for the dynamic Excel -> OpenAPI generator.
 */

/** Which target a tagged row feeds into. */
export type Group = 'header' | 'request' | 'response' | 'none';

/** The configurable roles a column can play. */
export const COLUMN_ROLES = [
	'type',
	'format',
	'description',
	'path',
	'required',
	'example',
	'definition',
	'name'
] as const;

export type ColumnRole = (typeof COLUMN_ROLES)[number];

/** Maps each role to a column index (null = unmapped). */
export type ColumnMap = Record<ColumnRole, number | null>;

export type OpenApiVersion = '2.0' | '3.0';

export interface ApiMeta {
	title: string;
	apiVersion: string;
	path: string;
	method: string;
	basePath: string;
	description?: string;
}

export interface UploadedTemplate {
	name: string;
	doc: any;
}

export interface BuildResult {
	definitions: Record<string, any>;
	present: Record<'header' | 'request' | 'response', boolean>;
}
