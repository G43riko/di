import { InjectionToken } from "./injection-token.ts";
import { Scope } from "./scope.ts";

/**
 * Checks if a value is a constructor function (Type).
 *
 * @param v - The value to check
 * @returns True if the value is a constructor function
 */
export function isType(v: any): v is Type<any> {
    return typeof v === "function";
}

/**
 * Represents a constructor function type.
 *
 * @template T - The type of object that will be instantiated
 */
export interface Type<T = object> {
    /** The name of the class/constructor */
    name?: string;

    /** Constructor signature */
    new (...args: any[]): T;
}

/**
 * Represents the resolved instance of a type.
 *
 * @template Type - The type to be resolved
 */
export type TypeResolution<Type = unknown> = Type;

/**
 * Extracts the token from a provider.
 *
 * @template T - The type of the provider
 * @param provider - The provider to extract the token from
 * @returns The token associated with the provider
 */
export function getTokenFromProvider<T>(provider: ProviderType<T>): ProviderToken<T> {
    if (isType(provider)) {
        return provider;
    }

    return provider.token;
}

/**
 * Represents a provider that can be registered with an injector.
 * Can be either a class constructor or a custom provider configuration.
 *
 * @template T - The type of the provider
 */
export type ProviderType<T = any> = Type<T> | CustomProvider<T>;

/**
 * Represents a token that can be used to identify a provider.
 * Can be a class constructor, a string, a symbol, or an InjectionToken.
 *
 * @template T - The type associated with the token
 */
export type ProviderToken<T = any> = symbol | Type<T> | string | InjectionToken<T>;

/**
 * Base interface for all custom provider configurations.
 *
 * @template T - The type of the provider
 */
interface CoreCustomProvider<T = any> {
    /** The token used to identify this provider */
    readonly token: ProviderToken;
    /** Optional scope that determines the lifetime of the provider */
    readonly scope?: Scope;
    /** Whether this provider should be part of a multi-provider */
    readonly multi?: boolean;
}

/**
 * Provider configuration that uses a static value.
 *
 * @template T - The type of the provider
 */
interface ValueCustomProvider<T = any> extends CoreCustomProvider<T> {
    /** The value to be provided */
    readonly useValue: T;
}

/**
 * Provider configuration that uses a class constructor.
 *
 * @template T - The type of the provider
 */
interface ClassCustomProvider<T = any> extends CoreCustomProvider<T> {
    /** The class to instantiate */
    readonly useClass: Type<T>;
}

/**
 * Provider configuration that references another provider.
 *
 * @template T - The type of the provider
 */
interface ExistingCustomProvider<T = any> extends CoreCustomProvider<T> {
    /** The token of the provider to use */
    readonly useExisting: ProviderToken<T>;
}

/**
 * Provider configuration that uses a factory function.
 *
 * @template T - The type of the provider
 */
interface FactoryCustomProvider<T = any> extends CoreCustomProvider<T> {
    /** The factory function that creates the provider instance */
    readonly factory: (...params: any[]) => T;
    /** Optional array of tokens to inject as parameters to the factory function */
    readonly deps?: readonly ProviderToken[];
}

/**
 * Union type of all possible custom provider configurations.
 *
 * @template T - The type of the provider
 */
export type CustomProvider<T = any> =
    | ValueCustomProvider<T>
    | ClassCustomProvider<T>
    | ExistingCustomProvider<T>
    | FactoryCustomProvider<T>;

/**
 * Converts a provider type to a readable string representation.
 *
 * @template T - The type of the provider
 * @param type - The provider type to stringify
 * @returns A string representation of the provider type
 * @throws Error if the provider type is unknown
 */
export function StringifyProviderType<T>(type: ProviderType<T>): string {
    if (isType(type)) {
        return type.name || "Anonymous Class";
    }

    if (isValueProvider(type)) {
        return `ValueProvider[${type.useValue}]`;
    }
    if (isClassProvider(type)) {
        return `ClassProvider[${type.useClass.name || "Anonymous Class"}]`;
    }
    if (isFactoryProvider(type)) {
        return `FactoryProvider[${type.factory}]`;
    }
    if (isExistingProvider(type)) {
        return `ExistingProvider[${StringifyProviderToken(type.useExisting)}]`;
    }

    throw new Error(`Unknown provider type: ${JSON.stringify(type)}`);
}

export function isClassProvider<T>(type: ProviderType<T>): type is ClassCustomProvider<T> {
    return "useClass" in type;
}

export function isValueProvider<T>(type: ProviderType<T>): type is ValueCustomProvider<T> {
    return "useValue" in type;
}

export function isExistingProvider<T>(type: ProviderType<T>): type is ExistingCustomProvider<T> {
    return "useExisting" in type;
}
export function isFactoryProvider<T>(type: ProviderType<T>): type is FactoryCustomProvider<T> {
    return "factory" in type;
}

/**
 * Converts a provider token to a readable string representation.
 *
 * @template T - The type associated with the token
 * @param type - The provider token to stringify
 * @returns A string representation of the provider token
 */
export function StringifyProviderToken<T>(type: ProviderToken<T>): string {
    if (isType(type)) {
        return String(type.name);
    }
    if (type instanceof InjectionToken) {
        return type.toString();
    }
    return String(type);
}

/**
 * Validates a custom provider configuration.
 *
 * @param provider - The custom provider to validate
 * @throws Error if the provider configuration is invalid
 */
export function validateCustomProvider(provider: CustomProvider): void {
    if (!provider || !provider.token) {
        throw new Error(`Provider must have a valid token`);
    }
    // validate strategies
    const strategies = ["useClass", "useValue", "factory", "useExisting"] as const;
    const defined = strategies.filter((k) => k in provider);

    if (defined.length !== 1) {
        throw new Error(`Provider must have exactly one strategy among: ${strategies.join(", ")}`);
    }

    // validate scope
    if (provider.scope && !Object.values(Scope).includes(provider.scope)) {
        throw new Error(`'scope' must be a valid Scope enum value`);
    }

    // validate different strategies
    if (isValueProvider(provider) && provider.useValue === undefined) {
        throw new Error(`'useValue' cannot be undefined`);
    }
    if (isClassProvider(provider) && typeof provider.useClass !== "function") {
        throw new Error(`'useClass' must be a constructor`);
    }
    if (isExistingProvider(provider) && provider.token === provider.useExisting) {
        throw new Error(`'${StringifyProviderToken(provider.token)}' cannot alias to itself`);
    }
    if (isFactoryProvider(provider)) {
        if (typeof provider.factory !== "function") {
            throw new Error(`'factory' must be a function`);
        }
        if ("deps" in provider && provider.deps && !Array.isArray(provider.deps)) {
            throw new Error(`'deps' must be an array of tokens`);
        }
    }
}

/**
 * Checks if a value is a custom provider configuration.
 *
 * @param param - The value to check
 * @returns True if the value is a custom provider configuration
 */
export function isCustomProvider(param: ProviderType): param is CustomProvider {
    if (!("token" in param)) {
        return false;
    }

    return isClassProvider(param) || isValueProvider(param) || isFactoryProvider(param) || isExistingProvider(param);
}
