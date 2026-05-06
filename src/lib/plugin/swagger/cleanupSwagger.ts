export function cleanupSwagger(swagger) {
    if (!swagger?.definitions) return swagger;

    Object.values(swagger.definitions).forEach((def: any) => {
        if (
            def.required &&
            Array.isArray(def.required) &&
            def.required.length === 0
        ) {
            delete def.required;
        }
    });

    return swagger;
}
