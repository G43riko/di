import { rootInjectorName } from "./config.ts";
import { isGlobalProviderType } from "./injectable.holder.ts";
import { InjectionToken } from "./injection-token.ts";
import { SimpleInjector } from "./simple-injector.ts";
import { isType, type ProviderToken, type ProviderType, type TypeResolution } from "./types.ts";

/**
 * Special implementation of SimpleInjector that serves as the root container for all global providers.
 * This class automatically registers global providers when they are requested.
 */
class RootInjectorImpl extends SimpleInjector {
    /**
     * Creates the root injector with a predefined name.
     */
    public constructor() {
        super(undefined, rootInjectorName);
    }

    /**
     * Overrides the get method to automatically register global providers when they are requested.
     * Also handles required InjectionTokens.
     *
     * @template T - The type of the provider
     * @param token - The token to resolve
     * @returns The resolved instance or undefined if the token cannot be resolved
     * @throws Error if a required InjectionToken is not found
     * @throws Error for unsupported token types
     */
    public override get<T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
        const cachedInstance = super.get(token);
        if (cachedInstance !== undefined) {
            return cachedInstance;
        }

        if (isType(token)) {
            return this.resolveTypeToken(token);
        }

        if (token instanceof InjectionToken) {
            return this.resolveInjectionToken(token);
        }

        throw new Error("Unsupported token type for resolution");
    }

    /**
     * Attempts to resolve a type token, auto-registering global providers if needed.
     */
    private resolveTypeToken<T>(token: ProviderType<T>): TypeResolution<T> | undefined {
        const isGlobal = isGlobalProviderType(token);

        if (isGlobal) {
            this.registerProvider(token);
            return super.get(token, true);
        }

        return undefined;
    }

    /**
     * Attempts to resolve an injection token, throwing if required but not found.
     */
    private resolveInjectionToken<T>(token: InjectionToken<T>): TypeResolution<T> | undefined {
        if (token.options.required) {
            throw new Error(`${token} is required but not found`);
        }
        return undefined;
    }
}

/**
 * The singleton root injector instance that serves as the default parent for all other injectors.
 * Global providers are registered and resolved through this injector.
 *
 * @example
 * ```ts
 * // Get a global service directly from the root injector
 * const myGlobalService = RootInjector.get(MyGlobalService);
 *
 * // Register a provider with the root injector
 * RootInjector.registerProvider({ token: 'API_URL', useValue: 'https://api.example.com' });
 * ```
 */
export const RootInjector: SimpleInjector = new RootInjectorImpl();
