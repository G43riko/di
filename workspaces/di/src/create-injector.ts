import { rootInjectorName, strictMode } from "./config.ts";
import { isGlobalProviderType } from "./injectable.holder.ts";
import type { Injector } from "./injector.ts";
import { SimpleInjector } from "./simple-injector.ts";
import { RootInjector } from "./root-injector.ts";
import { type ProviderType, StringifyProviderType } from "./types.ts";

/**
 * Configuration options for creating a new injector.
 */
export interface CreateInjectorParams {
    /** Array of providers to register with the injector */
    readonly providers?: readonly ProviderType<unknown>[];
    /** Optional name for the injector, used for debugging purposes */
    readonly name?: string;
    /** Parent injector to delegate resolution to when a token is not found in this injector */
    readonly parentInjector?: Injector;
    /**
     * If set to true, a create injector method creates instances of all providers immediately
     */
    readonly instantiateImmediately?: boolean;
    /**
     * If true, then successfully create injector with {@link instantiateImmediately} flag set to true even if there are unresolvable dependencies
     */
    readonly allowUnresolved?: boolean;
}

/**
 * Creates a new dependency injection container (injector).
 *
 * @param options - Configuration options for the injector
 * @returns A new SimpleInjector instance
 *
 * @example
 * ```ts
 * const injector = createInjector({
 *   providers: [MyService, MyRepository],
 *   name: 'MyAppInjector'
 * });
 *
 * // Get an instance of MyService
 * const myService = injector.get(MyService);
 * ```
 *
 * @throws Error if the name is reserved for the root injector
 * @throws Error in strict mode if trying to register a global provider in a non-root injector
 */
export function createInjector({
    providers = [],
    parentInjector = RootInjector,
    name,
    ...params
}: CreateInjectorParams): SimpleInjector {
    if (name === rootInjectorName) {
        throw new Error(`Injector name '${rootInjectorName}' is reserved for root injector`);
    }
    const injector = new SimpleInjector(parentInjector, name);

    if (strictMode) {
        for (const provider of providers) {
            if (isGlobalProviderType(provider)) {
                throw new Error(`${injector} can't register global provider ${StringifyProviderType(provider)}`);
            }
        }
    }
    providers.forEach((provider) => {
        if (isGlobalProviderType(provider)) {
            RootInjector.registerProvider(provider);
        } else {
            injector.registerProvider(provider);
        }
    });

    if (params.instantiateImmediately) {
        injector.resolveAll(params.allowUnresolved);
    }

    return injector;
}
