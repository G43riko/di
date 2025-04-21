import type { ProviderToken, TypeResolution } from "./types.ts";

export interface Injector {
    get<T>(type: ProviderToken<T>): TypeResolution<T> | undefined;
    require<T>(type: ProviderToken<T>): TypeResolution<T>;

    printDebug(): void;
    run<T>(callback: () => T): T;
    runAsync<T>(callback: () => Promise<T>): Promise<T>;
}
