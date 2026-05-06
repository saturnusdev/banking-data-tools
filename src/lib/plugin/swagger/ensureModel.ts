export function ensureModel(definitions, modelName) {
    if (!definitions[modelName]) {
        definitions[modelName] = {
            type: "object",
            properties: {},
            required: []
        };
        return;
    }

    // 🔥 FIX: normalize legacy models
    definitions[modelName].properties ||= {};
    definitions[modelName].required ||= [];
}
