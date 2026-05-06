export function collectUsedDefinitionRefs(swagger) {
    const used = new Set<string>();

    function walk(obj) {
        if (!obj || typeof obj !== 'object') return;

        if (obj.$ref && typeof obj.$ref === 'string') {
            const m = obj.$ref.match(/^#\/definitions\/(.+)$/);
            if (m) used.add(m[1]);
        }

        for (const v of Object.values(obj)) {
            walk(v);
        }
    }

    walk(swagger.paths);
    walk(swagger.responses);
    walk(swagger.parameters);
    walk(swagger.definitions);

    return used;
}
