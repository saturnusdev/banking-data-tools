import { ensureModel } from "./ensureModel";
import { isRequired } from "./requiredDetector";

function normalizeName(name) {
    return name
        .replace(/\[\*\]/g, "")
        .split(/[^a-zA-Z0-9]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

export function applyPathWithRef({
    definitions,
    rootModelName,
    path,
    propertySchema
}) {
    const segments = path.replace(/^\$\./, "").split(".");
    let parentModel = rootModelName;

    ensureModel(definitions, parentModel);

    segments.forEach((seg, idx) => {
        const isArray = seg.endsWith("[*]");
        const key = seg.replace("[*]", "");
        const isLast = idx === segments.length - 1;

        const modelName =
            parentModel + normalizeName(key);

        // Ensure parent model exists
        definitions[parentModel] ||= {
            type: "object",
            properties: {},
            required: []
        };

        if (isLast) {
            definitions[parentModel].properties[key] = propertySchema;
            if (isRequired(propertySchema)) {
                if (!definitions[parentModel].required.includes(key)) {
                    definitions[parentModel].required.push(key);
                }
            }
            return;
        }

        // Create child model if missing
        ensureModel(definitions, modelName);
        // Reference child model
        definitions[parentModel].properties[key] = isArray
            ? {
                type: "array",
                items: { $ref: `#/definitions/${modelName}` }
            }
            : {
                $ref: `#/definitions/${modelName}`
            };

        parentModel = modelName;
    });
}


export function extractRefs(obj, refs = new Set()) {
    if (!obj || typeof obj !== 'object') return refs;

    if (obj.$ref && typeof obj.$ref === 'string') {
        const match = obj.$ref.match(/^#\/definitions\/(.+)$/);
        if (match) refs.add(match[1]);
    }

    for (const value of Object.values(obj)) {
        extractRefs(value, refs);
    }

    return refs;
}

export function hasMissingRef(schema, definitions) {
    if (!schema || typeof schema !== 'object') return false;

    if (schema.$ref) {
        const m = schema.$ref.match(/^#\/definitions\/(.+)$/);
        if (m && !definitions[m[1]]) return true;
    }

    return Object.values(schema).some(v =>
        typeof v === 'object' && hasMissingRef(v, definitions)
    );
}