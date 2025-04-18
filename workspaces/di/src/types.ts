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
export interface CustomProvider<T = any> {
    token: ProviderToken;
    useValue?: T;
    useClass?: T;
    factory?: () => T;
}

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

export function checkCustomProvider(customProvider: CustomProvider): void {
    if (!customProvider.factory && !customProvider.useClass && !customProvider.useValue) {
        throw new Error("Custom provider must have one of factory, useClass, useValue");
    }
}
