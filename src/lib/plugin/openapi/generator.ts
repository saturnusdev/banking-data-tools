import { buildDefinitions, GROUP_ROOT } from './schemaBuilder';
import type { ApiMeta, BuildResult, ColumnMap, Group, OpenApiVersion } from './types';

/** Build the method operation for Swagger 2.0. */
export function buildOperationV2({ definitions, present }: BuildResult) {
	const op: any = {
		consumes: ['application/json'],
		produces: ['application/json'],
		parameters: [],
		responses: {}
	};

	const header = definitions[GROUP_ROOT.header];
	if (present.header && header) {
		for (const [name, schema] of Object.entries(header.properties || {})) {
			const s: any = schema;
			op.parameters.push({
				name,
				in: 'header',
				required: header.required?.includes(name) ?? false,
				type: s.type || 'string',
				description: s.description
			});
		}
	}

	if (present.request) {
		op.parameters.push({
			name: 'request',
			in: 'body',
			required: true,
			schema: { $ref: '#/definitions/Request' }
		});
	}

	if (present.response) {
		op.responses['200'] = {
			description: 'Success',
			schema: { $ref: '#/definitions/Response' }
		};
	}

	return op;
}

/** Build the method operation for OpenAPI 3.0. */
export function buildOperationV3({ definitions, present }: BuildResult) {
	const op: any = { parameters: [], responses: {} };

	const header = definitions[GROUP_ROOT.header];
	if (present.header && header) {
		for (const [name, schema] of Object.entries(header.properties || {})) {
			const s: any = schema;
			const headerSchema: any = {};
			if (s.type) headerSchema.type = s.type;
			if (s.format) headerSchema.format = s.format;
			op.parameters.push({
				name,
				in: 'header',
				required: header.required?.includes(name) ?? false,
				description: s.description,
				schema: headerSchema
			});
		}
	}

	if (present.request) {
		op.requestBody = {
			required: true,
			content: {
				'application/json': { schema: { $ref: '#/components/schemas/Request' } }
			}
		};
	}

	if (present.response) {
		op.responses['200'] = {
			description: 'Success',
			content: {
				'application/json': {
					schema: { $ref: '#/components/schemas/Response' }
				}
			}
		};
	}

	return op;
}

/** Assemble a complete, standalone spec from scratch. */
export function buildFreshSpec({
	version,
	meta,
	build
}: {
	version: OpenApiVersion;
	meta: ApiMeta;
	build: BuildResult;
}) {
	const info: any = { title: meta.title || 'Excel Driven API', version: meta.apiVersion || '1.0.0' };
	if (meta.description) info.description = meta.description;

	const path = meta.path || '/';
	const method = (meta.method || 'post').toLowerCase();

	if (version === '3.0') {
		const op = buildOperationV3(build);
		const spec: any = {
			openapi: '3.0.3',
			info,
			paths: { [path]: { [method]: op } },
			components: { schemas: build.definitions }
		};
		if (meta.basePath) spec.servers = [{ url: meta.basePath }];
		return spec;
	}

	const op = buildOperationV2(build);
	const spec: any = {
		swagger: '2.0',
		info,
		paths: { [path]: { [method]: op } },
		definitions: build.definitions
	};
	if (meta.basePath) spec.basePath = meta.basePath;
	return spec;
}

/** Detect whether a loaded doc is Swagger 2.0 or OpenAPI 3.x. */
export function detectVersion(doc: any): OpenApiVersion {
	if (doc?.openapi && String(doc.openapi).startsWith('3')) return '3.0';
	return '2.0';
}

/** Convenience wrapper used by the page. */
export function generateBuild({
	version,
	dataRows,
	rowGroups,
	columnMap
}: {
	version: OpenApiVersion;
	dataRows: any[][];
	rowGroups: Group[];
	columnMap: ColumnMap;
}): BuildResult {
	const refBase = version === '3.0' ? '#/components/schemas' : '#/definitions';
	return buildDefinitions({ dataRows, rowGroups, columnMap, refBase });
}
