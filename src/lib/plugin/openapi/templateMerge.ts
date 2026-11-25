import { detectVersion } from './generator';
import type { BuildResult } from './types';

/**
 * Surgically merge ONLY the generated request / response / header content and
 * the four metadata fields into an uploaded template, leaving every other part
 * of the template untouched.
 *
 * This is important for IBM API Connect / DataPower templates which carry a lot
 * of machinery (x-ibm-configuration, assembly gateway scripts, error responses,
 * securityDefinitions, unrelated definitions, ...) that must never be modified.
 *
 * Only these are changed:
 *   1. definitions.request / components.schemas.Request   (request body schema)
 *   2. definitions.<responseName> / components.schemas.<responseName>
 *      (the 200-response schema, e.g. ResponseSuccess)
 *   3. info.title
 *   4. info.x-ibm-name
 *   5. info.version
 *   6. basePath  (Swagger 2.0)  /  servers[0].url  (OpenAPI 3.0)
 *
 * Plus, optionally, generated header parameters (add/update only — existing
 * template headers and every other response code are preserved).
 */
export function mergeTemplateFields({
	template,
	build,
	responseName,
	header = false,
	title,
	xIbmName,
	apiVersion,
	basePath
}: {
	template: any;
	build: BuildResult;
	/** Definition name for the success response. Auto-detected from the template's 200 $ref when omitted. */
	responseName?: string;
	/** Merge generated header properties as operation header parameters. */
	header?: boolean;
	title?: string;
	xIbmName?: string;
	apiVersion?: string;
	basePath?: string;
}) {
	if (!template) return template;

	const isV3 = detectVersion(template) === '3.0';
	const definitions = isV3
		? (template.components ||= {}).schemas ||= {}
		: template.definitions ||= {};

	// Root names inside the template's own definitions.
	const requestRoot = isV3 ? 'Request' : 'request';

	// Resolve the success-response definition name from the template's 200 $ref,
	// so we adapt to whatever the template calls it (ResponseSuccess, Response, ...).
	const firstPath = Object.keys(template.paths || {})[0];
	const firstMethod = firstPath
		? Object.keys(template.paths[firstPath] || {})[0]
		: null;
	const existingOp =
		firstPath && firstMethod ? template.paths[firstPath][firstMethod] : null;
	const existingSuccessRef =
		existingOp?.responses?.['200']?.schema?.$ref ||
		existingOp?.responses?.['200']?.content?.['application/json']?.schema?.$ref;
	const resolvedResponseName =
		responseName ||
		(existingSuccessRef
			? existingSuccessRef.split('/').pop()
			: isV3
				? 'Response'
				: 'ResponseSuccess');

	// Copy every generated *nested* model (Request*/Response*/Header*) into the
	// template, preserving their internal $refs, so the request/response schemas
	// resolve. The three root models are handled separately below (renamed to
	// the template's own names); nested models keep their generated names.
	const ROOT_MODELS = new Set(['Request', 'Response', 'Header']);
	for (const [name, def] of Object.entries(build.definitions)) {
		if (ROOT_MODELS.has(name)) continue;
		definitions[name] = def;
	}

	// 1) Request body schema.
	if (build.present.request && build.definitions.Request) {
		definitions[requestRoot] = build.definitions.Request;
	}

	// 2) Success-response schema.
	if (build.present.response && build.definitions.Response) {
		definitions[resolvedResponseName] = build.definitions.Response;
	}

	// 3) Optional generated header parameters (add/update only).
	if (header && build.present.header && build.definitions.Header) {
		const path = Object.keys(template.paths || {})[0];
		const method = path ? Object.keys(template.paths[path] || {})[0] : null;
		const targetOp = path && method ? template.paths[path][method] : null;
		if (targetOp) {
			targetOp.parameters ||= [];
			const headerDef = build.definitions.Header;
			for (const [name, schema] of Object.entries(headerDef.properties || {})) {
				const s: any = schema;
				const param: any = {
					name,
					in: 'header',
					required: headerDef.required?.includes(name) ?? false
				};
				if (isV3) {
					const headerSchema: any = {};
					if (s.type) headerSchema.type = s.type;
					if (s.format) headerSchema.format = s.format;
					param.schema = headerSchema;
				} else {
					param.type = s.type || 'string';
				}
				if (s.description) param.description = s.description;

				const existing = targetOp.parameters.find(
					(p: any) => p.in === 'header' && p.name === name
				);
				if (existing) Object.assign(existing, param);
				else targetOp.parameters.push(param);
			}
		}
	}

	// Point the operation's body + 200 response at the merged definitions.
	const refBase = isV3 ? '#/components/schemas' : '#/definitions';
	const path = Object.keys(template.paths || {})[0];
	const method = path ? Object.keys(template.paths[path] || {})[0] : null;
	const targetOp = path && method ? template.paths[path][method] : null;

	if (targetOp) {
		if (build.present.request) {
			if (isV3) {
				targetOp.requestBody = {
					required: true,
					content: {
						'application/json': { schema: { $ref: `${refBase}/${requestRoot}` } }
					}
				};
			} else {
				targetOp.parameters ||= [];
				const bodyParam = targetOp.parameters.find(
					(p: any) => p.in === 'body'
				);
				const bodyRef = { name: 'request', in: 'body', required: true, schema: { $ref: `${refBase}/${requestRoot}` } };
				if (bodyParam) Object.assign(bodyParam, bodyRef);
				else targetOp.parameters.push(bodyRef);
			}
		}

		if (build.present.response) {
			targetOp.responses ||= {};
			const success = targetOp.responses['200'] || { description: 'success' };
			if (isV3) {
				success.content = {
					'application/json': { schema: { $ref: `${refBase}/${resolvedResponseName}` } }
				};
			} else {
				success.schema = { $ref: `${refBase}/${resolvedResponseName}` };
			}
			targetOp.responses['200'] = success;
		}
	}

	// 4-6) Metadata fields (only set keys the template already declares, except
	// basePath which is always safe to add/update).
	template.info ||= {};
	if (title && template.info.title !== undefined) template.info.title = title;
	if (xIbmName && template.info['x-ibm-name'] !== undefined) {
		template.info['x-ibm-name'] = xIbmName;
	}
	if (apiVersion && template.info.version !== undefined) {
		template.info.version = apiVersion;
	}
	if (basePath) {
		if (isV3) {
			if (template.servers?.length) template.servers[0].url = basePath;
		} else {
			template.basePath = basePath;
		}
	}

	return template;
}
