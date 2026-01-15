import { AsyncLocalStorage } from "node:async_hooks";
import { Errors } from "./errors.ts";
import type { Injector } from "./injector.ts";
import { GAssertRequire } from "./misc-utils.ts";

const injectorStorage = new AsyncLocalStorage<Injector>();
let globalInjector: Injector | undefined;

export function setCurrentInjector(injector: Injector | undefined): Injector | undefined {
    const prev = globalInjector;
    globalInjector = injector;

    return prev;
}

export function runWithInjector<T>(injector: Injector, callback: () => T): T {
    return injectorStorage.run(injector, callback);
}

export function requireCurrentInjector(): Injector {
    const current = injectorStorage.getStore() ?? globalInjector;

    return GAssertRequire(current, Errors.OUTSIDE_INJECTION_CONTEXT());
}
