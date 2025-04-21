import type { ProviderToken, TypeResolution } from "./types.ts";

/**
 * Core interface for dependency injection containers.
 * Defines the essential methods that all injectors must implement.
 */
export interface Injector {
    /**
     * Resolves a token to its instance.
     *
     * @template T - The type of the provider
     * @param type - The token to resolve
     * @returns The resolved instance or undefined if the token cannot be resolved
     */
    get<T>(type: ProviderToken<T>): TypeResolution<T> | undefined;

    /**
     * Resolves a token to its instance, throwing an error if the token cannot be resolved.
     *
     * @template T - The type of the provider
     * @param type - The token to resolve
     * @returns The resolved instance
     * @throws Error if the token cannot be resolved
     */
    require<T>(type: ProviderToken<T>): TypeResolution<T>;

    /**
     * Prints debug information about this injector to the console.
     */
    printDebug(): void;

    /**
     * Runs a callback with this injector set as the current injector.
     * This allows the inject() function to work within the callback.
     *
     * @template T - The return type of the callback
     * @param callback - The function to run with this injector as the current one
     * @returns The result of the callback
     */
    run<T>(callback: () => T): T;

    /**
     * Runs an async callback with this injector set as the current injector.
     * This allows the inject() function to work within the callback.
     *
     * @template T - The return type of the callback
     * @param callback - The async function to run with this injector as the current one
     * @returns A promise that resolves to the result of the callback
     */
    runAsync<T>(callback: () => Promise<T>): Promise<T>;
}
