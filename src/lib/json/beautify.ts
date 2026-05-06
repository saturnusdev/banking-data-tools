export function beautifyJson(value: string, space = 2): string {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, space);
}
