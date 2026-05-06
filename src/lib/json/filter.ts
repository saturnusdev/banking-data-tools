export function filterByKey(
    data: any,
    key: string,
    value?: any
): any {
    if (Array.isArray(data)) {
        return data
            .map(item => filterByKey(item, key, value))
            .filter(Boolean);
    }

    if (typeof data === 'object' && data !== null) {
        if (key in data && (value === undefined || data[key] === value)) {
            return data;
        }

        const result: any = {};
        for (const k in data) {
            const filtered = filterByKey(data[k], key, value);
            if (filtered) result[k] = filtered;
        }

        return Object.keys(result).length ? result : null;
    }

    return null;
}
