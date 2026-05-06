export function isRequired(propSchema) {
    if (!propSchema || typeof propSchema !== "object") return false;

    // Rule 1: description keywords
    const desc = propSchema.description?.toLowerCase() || "";
    if (/\brequired\b/.test(desc)) {
        return true;
    }

    // Rule 2: minLength > 0
    if (typeof propSchema.minLength === "number" && propSchema.minLength > 0) {
        return true;
    }

    return false;
}