import { InjectionToken } from "./injection-token.ts";

export function isType(v: any): v is Type<any> {
    return typeof v === "function";
}

export interface Type<T = object> {
    name?: string;

    new (...args: any[]): T;
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
}

interface ValueCustomProvider<T = any> extends CoreCustomProvider<T>{
    readonly useValue: T;
}
interface ClassCustomProvider<T = any> extends CoreCustomProvider<T>{
    readonly useClass: Type<T>;
}

interface FactoryCustomProvider<T = any> extends CoreCustomProvider<T>{
    readonly factory: (...params: any[]) => T;
    readonly deps?: readonly ProviderToken[];
}
export type CustomProvider<T = any> = 
 | ValueCustomProvider<T> 
 | ClassCustomProvider<T>
 | FactoryCustomProvider<T>

export function StringifyProviderType<T>(type: ProviderType<T>): string {
    if (isType(type)) {
        return String(type.name);
    }

    if("useValue" in type) {
        return String(`ValueProvider[${type.useValue}]`);
    }
    if("useClass" in type) {
        return String(`ClassProvider[${type.useClass.name}]`);
    }
    if("factory" in type) {
        return String(`FactoryProvider[${type.factory}]`);
    }

    throw new Error(`Unknown provider type: ${type}`);
}

export function StringifyProviderToken<T>(type: ProviderToken<T>): string {
    if (isType(type)) {
        return String(type.name);
    }
    if(type instanceof InjectionToken) {
        return type.toString();
    }
    return String(type);
}
export function isCustomProvider(param: ProviderType): param is CustomProvider {
    if("useValue" in param || "useClass" in param || "factory" in param) {
        return true;
    }
    const type = typeof (param as any).token;
    return type === "string" || type === "function";
}