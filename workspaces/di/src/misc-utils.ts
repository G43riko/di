export function GAssertRequire<T>(item: T | null | undefined, message = `Expected non-null value, but got '${item}'`): T {
    if (item === null || typeof item === "undefined") {
        throw new Error(message);
    }
    return item;
}
export function assignProperty<T>(object: T, property: PropertyKey, value: any): T {
    return Object.defineProperty(object, property, {
        value,
        enumerable: false,
        writable: false,
        configurable: false,
    });
}
