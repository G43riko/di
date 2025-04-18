import type { InjectableParams } from "./injectable.decorator.ts";
import { assignProperty } from "./misc-utils.ts";
import type { Type } from "./types.ts";

export interface InjectableOptions extends InjectableParams {
    readonly global: boolean;
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

export function isGlobalInjectable<T>(token: Type<T>): boolean {
    const holder = getSymbol(token, injectableDataSymbol);
    if (holder) {
        return holder.options.global;
    }

    return false;
}

export function registerInjectable<T>(injectable: Type, options: InjectableOptions): void {
    const holder: InjectableHolder = {
        injectable,
        options,
    };
    assignProperty(injectable, injectableDataSymbol, holder);
    injectables.set(injectable, holder);
}
