import { AsyncLocalStorage } from "node:async_hooks";
import { Errors } from "./errors.ts";
import type { Injector } from "./injector.ts";
import { GAssertRequire } from "./misc-utils.ts";

const injectorStorage = new AsyncLocalStorage<Injector>();
let globalInjector: Injector | undefined;

/**
 * Sets the global fallback injector used when no async-local injector is active.
 * Returns the previously set injector so callers can restore it afterwards.
 *
 * @param injector - The injector to set as the global fallback, or `undefined` to clear it
 * @returns The previous global injector value
 */
export function setCurrentInjector(injector: Injector | undefined): Injector | undefined {
    const prev = globalInjector;
    globalInjector = injector;

    return prev;
}

/**
 * Runs a callback with the given injector set as the current async-local injector.
 * Calls to {@link requireCurrentInjector} within the callback will return this injector.
 *
 * @template T - The return type of the callback
 * @param injector - The injector to make current for the duration of the callback
 * @param callback - The function to execute within the injector context
 * @returns The return value of the callback
 */
export function runWithInjector<T>(injector: Injector, callback: () => T): T {
    return injectorStorage.run(injector, callback);
}

/**
 * Returns the currently active injector, throwing if none is set.
 * Checks the async-local storage first, then falls back to the global injector.
 *
 * @returns The active {@link Injector}
 * @throws Error if called outside of an injection context
 */
export function requireCurrentInjector(): Injector {
    const current = injectorStorage.getStore() ?? globalInjector;

    return GAssertRequire(current, Errors.OUTSIDE_INJECTION_CONTEXT());
}
