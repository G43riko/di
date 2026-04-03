import { Scope } from "./scope.ts";

/**
 * TODO: add enableInjectDecorator
 */
export let strictMode = false;
export const validateProviders = true;
export let enableConstructorInjection = true;
export let enableInject = true;

export const defaultScope = Scope.INJECTOR;

export const rootInjectorName = "RootInjector";

/** @internal For testing only – resets all mutable flags to their defaults. */
export function _resetConfig(): void {
    strictMode = false;
    enableConstructorInjection = true;
    enableInject = true;
}

/** @internal For testing only. */
export function _setStrictMode(v: boolean): void {
    strictMode = v;
}

/** @internal For testing only. */
export function _setEnableInject(v: boolean): void {
    enableInject = v;
}

/** @internal For testing only. */
export function _setEnableConstructorInjection(v: boolean): void {
    enableConstructorInjection = v;
}
