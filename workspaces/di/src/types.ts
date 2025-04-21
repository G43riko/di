import { InjectionToken } from "./injection-token.ts";
import { Scope } from "./scope.ts";

export function isType(v: any): v is Type<any> {
    return typeof v === "function";
}

export interface Type<T = object> {
    name?: string;

    new(...args: any[]): T;
}

export type TypeResolution<Type = unknown> = Type;

export function getTokenFromProvider<T>(provider: ProviderType<T>): ProviderToken<T> {
    if (isType(provider)) {
        return provider;
    }

    return provider.token;
}

export type ProviderType<T = any> = Type<T> | CustomProvider<T>;
export type ProviderToken<T = any> = symbol | Type<T> | string | InjectionToken<T>;

interface CoreCustomProvider<T = any> {
    readonly token: ProviderToken;
    readonly scope?: Scope;
}

interface ValueCustomProvider<T = any> extends CoreCustomProvider<T> {
    readonly useValue: T;
}
interface ClassCustomProvider<T = any> extends CoreCustomProvider<T> {
    readonly useClass: Type<T>;
}

interface ExistingCustomProvider<T = any> extends CoreCustomProvider<T> {
    readonly useExisting: ProviderToken<T>;
}

interface FactoryCustomProvider<T = any> extends CoreCustomProvider<T> {
    readonly scope?: Scope;
    readonly factory: (...params: any[]) => T;
    readonly deps?: readonly ProviderToken[];
}
export type CustomProvider<T = any> =
    | ValueCustomProvider<T>
    | ClassCustomProvider<T>
    | ExistingCustomProvider<T>
    | FactoryCustomProvider<T>;

export function StringifyProviderType<T>(type: ProviderType<T>): string {
    if (isType(type)) {
        return String(type.name);
    }

    if ("useValue" in type) {
        return String(`ValueProvider[${type.useValue}]`);
    }
    if ("useClass" in type) {
        return String(`ClassProvider[${type.useClass.name}]`);
    }
    if ("factory" in type) {
        return String(`FactoryProvider[${type.factory}]`);
    }
    if ("useExisting" in type) {
        return String(`ExistingProvider[${StringifyProviderToken(type.useExisting)}]`);
    }

    throw new Error(`Unknown provider type: ${type}`);
}

export function StringifyProviderToken<T>(type: ProviderToken<T>): string {
    if (isType(type)) {
        return String(type.name);
    }
    if (type instanceof InjectionToken) {
        return type.toString();
    }
    return String(type);
}

export function validateCustomProvider(provider: CustomProvider): void {
    if (!provider || !provider.token) {
        throw new Error(`Provider must have a valid token`);
    }
    // validate strategies
    const strategies = ['useClass', 'useValue', 'factory', 'useExisting'] as const;
    const defined = strategies.filter(k => k in provider);

    if (defined.length !== 1) {
        throw new Error(`Provider must have exactly one strategy among: ${strategies.join(', ')}`);
    }

    // validate scope
    if ('scope' in provider && !Object.values(Scope).includes(provider.scope!)) {
        throw new Error(`'scope' must be a valid Scope enum value`);
    }

    // validate different 
    if ('useClass' in provider && typeof provider.useClass !== 'function') {
        throw new Error(`'useClass' must be a constructor`);
    } else if ("useExisting" in provider) {
        if (provider.token === provider.useExisting) {
            throw new Error(`'${StringifyProviderToken(provider.token)}' cannot alias to itself`);
        }
    } else if ('factory' in provider) {
        if (typeof provider.factory !== 'function') {
            throw new Error(`'factory' must be a function`);
        }
        if ("deps" in provider && provider.deps && !Array.isArray(provider.deps)) {
            throw new Error(`'deps' must be an array of tokens`);
        }
    } else if ('useValue' in provider && provider.useValue === undefined) {
        throw new Error(`'useValue' cannot be undefined`);
    }
}

export function isCustomProvider(param: ProviderType): param is CustomProvider {
    if ("useValue" in param || "useClass" in param || "factory" in param) {
        return true;
    }
    const type = typeof (param as any).token;
    return type === "string" || type === "function";
}
