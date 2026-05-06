import { hasMissingRef } from "./refSchemaBuilder";

export function removeEmpty(obj) {
    if (!obj || typeof obj !== "object") return obj;

    Object.keys(obj).forEach(k => {
        const v = obj[k];

        if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "")
        ) {
            delete obj[k];
            return;
        }

        if (typeof v === "object") {
            removeEmpty(v);
            if (Object.keys(v).length === 0) {
                delete obj[k];
            }
        }
    });

    return obj;
}


export function cleanupRequestBody(op, definitions) {
    if (!Array.isArray(op.parameters)) return;

    op.parameters = op.parameters.filter(p => {
        if (p.in !== 'body' || !p.schema) return true;

        if (hasMissingRef(p.schema, definitions)) {
            console.warn('Removed request body with missing $ref');
            return false;
        }

        return true;
    });
}

export function cleanupResponseBody(op, definitions) {
    if (!op.responses?.['200']?.schema) return;

    if (hasMissingRef(op.responses['200'].schema, definitions)) {
        console.warn('Removed response 200 schema with missing $ref');
        delete op.responses['200'].schema;
    }
}

export function cleanupInvalidDefinitions(definitions) {
    let changed = true;

    while (changed) {
        changed = false;

        for (const [name, def] of Object.entries(definitions)) {
            if (hasMissingRef(def, definitions)) {
                delete definitions[name];
                changed = true;
            }
        }
    }
}