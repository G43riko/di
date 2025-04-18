import { requireCurrentInjector } from "./current-injector.ts";
import type { ProviderToken, TypeResolution } from "./types.ts";

export function inject<T>(token: ProviderToken<T>): TypeResolution<T> {
    const injector = requireCurrentInjector();

    return injector.require(token);
}

inject.optional = function <T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
    const injector = requireCurrentInjector();

    return injector.get(token);
};
