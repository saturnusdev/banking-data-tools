import { applyExcelToSwagger } from '../swagger/applyExcelToSwagger';
import { buildOperationV2, buildOperationV3 } from './generator';
import type { BuildResult, OpenApiVersion } from './types';

/** Detect whether a loaded doc is Swagger 2.0 or OpenAPI 3.x. */
export function detectVersion(doc: any): OpenApiVersion {
	if (doc?.openapi && String(doc.openapi).startsWith('3')) return '3.0';
	return '2.0';
}

/** Merge a generated OpenAPI 3.0 operation into an existing 3.x template. */
function mergeOperationV3(template:any, path: string, method: string, op:any, schemas: any) {
	template.paths ||= {};
	template.paths[path] ||= {};
	const targetOp = template.paths[path][method];

	if (!targetOp) {
		template.paths[path][method] = op;
	} else {
		targetOp.parameters ||= [];
		op.parameters?.forEach((p:any) => {
			const existing = targetOp.parameters.find(
				(e:any) => e.in === p.in && e.name === p.name
			);
			if (existing) Object.assign(existing, p);
			else targetOp.parameters.push(p);
		});
		if (op.requestBody) targetOp.requestBody = op.requestBody;
		targetOp.responses ||= {};
		if (op.responses['200']) {
			targetOp.responses['200'] = {
				...(targetOp.responses['200'] || {}),
				...op.responses['200']
			};
		}
	}

	template.components ||= {};
	template.components.schemas ||= {};
	Object.entries(schemas).forEach(([name, def]: any) => {
		const existing = template.components.schemas[name];
		if (!existing) {
			template.components.schemas[name] = def;
			return;
		}
		existing.properties ||= {};
		Object.assign(existing.properties, def.properties || {});
		if (def.required?.length) {
			existing.required ||= [];
			def.required.forEach((r: any) => {
				if (!existing.required.includes(r)) existing.required.push(r);
			});
		}
	});

	return template;
}

/**
 * Merge generated content into an uploaded template for the given path/method.
 * Falls back to building a fresh spec when no template is supplied.
 */
export function mergeIntoTemplate({
	template,
	version,
	path,
	method,
	build,
	conflicts = []
}: {
	template: any;
	version: OpenApiVersion;
	path: string;
	method: string;
	build: BuildResult;
	conflicts: any[];
}) {
	const resolvedVersion = template ? detectVersion(template) : version;

	if (!template) {
		return { spec: null, version: resolvedVersion };
	}

	if (resolvedVersion === '3.0') {
		const op = buildOperationV3(build);
		return {
			spec: mergeOperationV3(
				template,
				path,
				method,
				op,
				build.definitions
			),
			version: resolvedVersion
		};
	}

	// Swagger 2.0: reuse the battle-tested IDM merge logic via a fragment doc.
	const fragment = {
		swagger: '2.0',
		paths: {
			[path]: { [method]: buildOperationV2(build) }
		},
		definitions: build.definitions
	};

	// Scaffold the target operation if the template doesn't define it yet,
	// since applyExcelToSwagger expects an existing operation to merge into.
	template.paths ||= {};
	template.paths[path] ||= {};
	if (!template.paths[path][method]) {
		template.paths[path][method] = {
			consumes: ['application/json'],
			produces: ['application/json'],
			parameters: [],
			responses: {}
		};
	}

	const spec = applyExcelToSwagger({
		templateSwagger: template,
		excelSwagger: fragment,
		path,
		method,
		conflicts
	});

	return { spec, version: resolvedVersion };
}
