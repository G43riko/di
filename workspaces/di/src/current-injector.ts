import { Errors } from "./errors.ts";
import type { Injector } from "./injector.ts";
import { GAssertRequire } from "./misc-utils.ts";

let currentInjector: Injector | undefined;

export function setCurrentInjector(injector: Injector | undefined): Injector | undefined {
    const prev = currentInjector;
    currentInjector = injector;

    return prev;
}

export function requireCurrentInjector(): Injector {
    return GAssertRequire(currentInjector, Errors.OUTSIDE_INJECTION_CONTEXT());
}
