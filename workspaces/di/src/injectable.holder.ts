import { defaultScope } from "./config.ts";
import type { InjectableParams } from "./injectable.decorator.ts";
import { assignProperty } from "./misc-utils.ts";
import { Scope } from "./scope.ts";
import { isCustomProvider, isType, type ProviderType, type Type } from "./types.ts";

export interface InjectableOptions extends InjectableParams {
    readonly scope: Scope;
}
interface InjectableHolder<T = any> {
    injectable: Type<T>;
    // instance?: T;
    options: InjectableOptions;
}

const injectableDataSymbol: unique symbol = Symbol.for("DI_INJECTABLE_DATA_IDENTIFIER");
const injectables: Map<any, InjectableHolder> = new Map();

function getSymbol(typeOrInstance: any, symbol: typeof injectableDataSymbol): InjectableHolder | undefined {
    return typeOrInstance[symbol];
}
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
export function isTransientProviderType<T>(token: ProviderType<T>): boolean {
    return getScope(token) === Scope.TRANSIENT;
}

export function isGlobalProviderType<T>(token: ProviderType<T>): boolean {
    return getScope(token) === Scope.GLOBAL;
}

export function registerInjectable<T>(injectable: Type, options: InjectableOptions): void {
    const holder: InjectableHolder = {
        injectable,
        options,
    };
    assignProperty(injectable, injectableDataSymbol, holder);
    injectables.set(injectable, holder);
}
