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
export type ProviderToken<T = any> = Type<T> | string;
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

export function StringifyProviderToken<T>(type: ProviderToken<T>): string {
    if (isType(type)) {
        return String(type.name);
    }
    return String(type);
}
export function isCustomProvider(param: ProviderType): param is CustomProvider {
    const type = typeof (param as any).token;
    return type === "string" || type === "function";
}