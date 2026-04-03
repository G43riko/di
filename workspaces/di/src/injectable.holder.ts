import { defaultScope } from "./config.ts";
import { assignProperty } from "./misc-utils.ts";
import { Scope } from "./scope.ts";
import { isCustomProvider, isType, type ProviderType, type Type } from "./types.ts";

/**
 * Options passed to {@link registerInjectable} that describe how a class should be managed.
 */
export interface InjectableOptions {
    /** The scope that determines the lifetime of instances of this injectable */
    readonly scope: Scope;
}

interface InjectableHolder<T = any> {
    injectable: Type<T>;
    // instance?: T;
    options: InjectableOptions;
}

const injectableDataSymbol: unique symbol = Symbol.for("DI_INJECTABLE_DATA_IDENTIFIER");

function getSymbol(typeOrInstance: any, symbol: typeof injectableDataSymbol): InjectableHolder | undefined {
    return typeOrInstance[symbol];
}

/**
 * Checks whether a class has been registered with the `@Injectable` decorator.
 *
 * @param inject - The class constructor to check
 * @returns True if the class is marked as injectable
 */
export function isInjectable(inject: Type): boolean {
    return Boolean(getSymbol(inject, injectableDataSymbol));
}

/**
 * Returns the resolved {@link Scope} for a given provider type.
 * Falls back to {@link defaultScope} if no scope information is available.
 *
 * @param token - The provider type to inspect
 * @returns The scope of the provider
 */
export function getScope(token: ProviderType): Scope {
    if (isType(token)) {
        const holder = getSymbol(token, injectableDataSymbol);
        if (holder) {
            return holder.options.scope;
        }
    }

    if (isCustomProvider(token) && token.scope) {
        return token.scope;
    }

    return defaultScope;
}

/**
 * Returns true if the given provider type has {@link Scope.TRANSIENT} scope.
 *
 * @template T - The type of the provider
 * @param token - The provider type to check
 * @returns True if the provider is transient
 */
export function isTransientProviderType<T>(token: ProviderType<T>): boolean {
    return getScope(token) === Scope.TRANSIENT;
}

/**
 * Returns true if the given provider type has {@link Scope.GLOBAL} scope.
 *
 * @template T - The type of the provider
 * @param token - The provider type to check
 * @returns True if the provider is global
 */
export function isGlobalProviderType<T>(token: ProviderType<T>): boolean {
    return getScope(token) === Scope.GLOBAL;
}

/**
 * Attaches injectable metadata to a class constructor.
 * Called internally by the `@Injectable` decorator family.
 *
 * @template T - The type of the injectable class
 * @param injectable - The class constructor to register
 * @param options - Options describing the injectable's scope
 */
export function registerInjectable<T>(injectable: Type, options: InjectableOptions): void {
    const holder: InjectableHolder = {
        injectable,
        options,
    };
    assignProperty(injectable, injectableDataSymbol, holder);
}
