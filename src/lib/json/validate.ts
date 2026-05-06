export function validateJson(value: string): {
    valid: boolean;
    error?: string;
} {
    try {
        JSON.parse(value);
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message };
    }
}
