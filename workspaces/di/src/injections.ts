import { requireCurrentInjector } from "./current-injector.ts";
import type { ProviderToken, TypeResolution } from "./types.ts";
import { enableInject } from "./config.ts";

/**
 * Retrieves a dependency from the current injector.
 * Must be called within a context where an injector is set as current (e.g., inside a component constructor or a function run by an injector).
 *
 * @template T - The type of the dependency to retrieve
 * @param token - The token identifying the dependency
 * @returns The resolved instance
 * @throws Error if the token cannot be resolved or if there is no current injector
 *
 * @example
 * ```ts
 * class MyService {
 *   private config = inject(CONFIG_TOKEN);
 *
 *   doSomething() {
 *     console.log(this.config.apiUrl);
 *   }
 * }
 * ```
 */
export function inject<T>(token: ProviderToken<T>): TypeResolution<T> {
    if (!enableInject) {
        throw new Error("inject is disabled");
    }
    const injector = requireCurrentInjector();

    return injector.require(token);
}

/**
 * Retrieves an optional dependency from the current injector.
 * Returns undefined if the dependency cannot be resolved.
 *
 * @template T - The type of the dependency to retrieve
 * @param token - The token identifying the dependency
 * @returns The resolved instance or undefined if the token cannot be resolved
 * @throws Error if there is no current injector
 *
 * @example
 * ```ts
 * class MyService {
 *   // Will be undefined if not provided
 *   private logger = inject.optional(LOGGER_TOKEN);
 *
 *   doSomething() {
 *     this.logger?.log('Operation performed');
 *   }
 * }
 * ```
 */
inject.optional = function <T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
    const injector = requireCurrentInjector();

    return injector.get(token);
};
