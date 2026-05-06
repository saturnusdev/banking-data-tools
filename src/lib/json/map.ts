export function mapByKey(
    arr: any[],
    key: string
): Record<string, any> {
    return arr.reduce((acc, item) => {
        if (item && item[key] !== undefined) {
            acc[item[key]] = item;
            delete acc[item[key]][key];
        }
        return acc;
    }, {} as Record<string, any>);
}
