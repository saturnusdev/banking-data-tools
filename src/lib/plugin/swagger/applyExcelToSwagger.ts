import { cleanupSwagger } from './cleanupSwagger';
import { extractRefs } from './refSchemaBuilder';
import { collectUsedDefinitionRefs } from './collectUsedDefinitionRefs';
import { cleanupInvalidDefinitions, cleanupRequestBody, cleanupResponseBody } from './removeEmpty';


/**
 * Merge Excel-generated swagger into existing swagger template
 * WITHOUT regenerating paths or deleting anything
 */
export function applyExcelToSwagger({
    templateSwagger,
    excelSwagger,
    path,
    method,
    conflicts = []
}) {
    if (!templateSwagger?.paths?.[path]?.[method]) {
        throw new Error(`Operation not found: ${method.toUpperCase()} ${path}`);
    }

    const targetOp = templateSwagger.paths[path][method];
    const excelOp = excelSwagger.paths?.[path]?.[method];

    if (!excelOp) {
        conflicts.push({
            level: 'warning',
            message: `Excel does not define ${method.toUpperCase()} ${path}`
        });
        return templateSwagger;
    }

    const oldRequestRefs = extractRefs({
        parameters: targetOp.parameters
    });

    if (Array.isArray(targetOp.parameters)) {
        targetOp.parameters = targetOp.parameters.filter(
            p => p.in !== 'body'
        );
    }

    excelOp.parameters?.forEach(p => {
        const existing = targetOp.parameters.find(
            e => e.in === p.in && e.name === p.name
        );

        if (existing) {
            // conflict detection
            if (existing.type && p.type && existing.type !== p.type) {
                conflicts.push({
                    level: 'warning',
                    message: `Parameter "${p.name}" type changed: ${existing.type} → ${p.type}`
                });
            }

            Object.assign(existing, p);
        } else {
            targetOp.parameters.push(p);
        }
    });

    targetOp.responses ||= {};
    excelOp.responses ||= {};

    Object.entries(excelOp.responses || {}).forEach(([code, resp]) => {
        targetOp.responses["200"] ||= {
            description: resp["description"] || 'Response'
        };

        if (resp["schema"]) {
            targetOp.responses["200"].schema = resp["schema"];
        }
    });

    const newRequestRefs = extractRefs({
        parameters: targetOp.parameters
    });

    const requestRefsBefore = collectUsedDefinitionRefs(targetOp)
    const usedAfterMerge = collectUsedDefinitionRefs(templateSwagger);
    templateSwagger.definitions ||= {};

    for (const item of usedAfterMerge) {
        const itemRef = item as string
        if (!requestRefsBefore.has(itemRef)) {
            delete templateSwagger.definitions[itemRef];
        }
    }

    for (const ref of oldRequestRefs) {
        if (!newRequestRefs.has(ref)) {
            delete templateSwagger.definitions[ref as string];
        }
    }

    Object.entries(excelSwagger.definitions || {}).forEach(([name, def]) => {
        if (!templateSwagger.definitions[name]) {
            templateSwagger.definitions[name] = def;
            return;
        }

        const targetDef = templateSwagger.definitions[name];
        targetDef.properties ||= {};

        Object.entries(def["properties"] || {}).forEach(([prop, value]) => {
            if (
                targetDef.properties[prop] &&
                targetDef.properties[prop].type &&
                value["type"] &&
                targetDef.properties[prop].type !== value["type"]
            ) {
                conflicts.push({
                    level: 'warning',
                    message: `Definition "${name}.${prop}" type changed`
                });
            }

            targetDef.properties[prop] = value;
        });

        if (def['required']?.length) {
            targetDef.required ||= [];
            def['required'].forEach(r => {
                if (!targetDef.required.includes(r)) {
                    targetDef.required.push(r);
                }
            });
        }
    });

    cleanupRequestBody(targetOp, templateSwagger.definitions);
    cleanupResponseBody(targetOp, templateSwagger.definitions);
    cleanupInvalidDefinitions(templateSwagger.definitions);

    cleanupSwagger(templateSwagger);
    return templateSwagger;
}
