/**
 * Asserts that a value is neither `null` nor `undefined`, throwing an error otherwise.
 *
 * @template T - The type of the non-nullable value
 * @param item - The value to check
 * @param message - Optional error message to use when the assertion fails
 * @returns The original value, narrowed to exclude `null | undefined`
 * @throws Error if `item` is `null` or `undefined`
 */
export function GAssertRequire<T>(
    item: T | null | undefined,
    message = `Expected non-null value, but got '${item}'`,
): T {
    if (item === null || typeof item === "undefined") {
        throw new Error(message);
    }
    return item;
}

/**
 * Defines a non-enumerable, non-writable, non-configurable property on an object.
 * Useful for attaching hidden metadata to class constructors or instances.
 *
 * @template T - The type of the target object
 * @param object - The object to define the property on
 * @param property - The property key to assign
 * @param value - The value to assign to the property
 * @returns The original object with the property defined
 */
export function assignProperty<T>(object: T, property: PropertyKey, value: any): T {
    return Object.defineProperty(object, property, {
        value,
        enumerable: false,
        writable: false,
        configurable: false,
    });
}
