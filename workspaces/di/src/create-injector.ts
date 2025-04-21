import { strictMode } from "./config.ts";
import { isGlobalProviderType } from "./injectable.holder.ts";
import { type Injector, SimpleInjector } from "./injector.ts";
import { RootInjector } from "./root-injector.ts";
import { StringifyProviderType, type ProviderType } from "./types.ts";

export interface CreateInjectorParams {
    readonly providers?: readonly ProviderType<unknown>[];
    readonly name?: string;
    readonly parentInjector?: Injector;
    /**
     * If set to true, create injector method create instances of all providers
     */
    readonly instantiateImmediately?: boolean;
    /**
     * If true, then successfully create injector with {@link instantiateImmediately} flag set to true event if there are unresolvable dependencies
     */
    readonly allowUnresolved?: boolean;
}

export function createInjector({
    providers = [],
    parentInjector = RootInjector,
    ...params
}: CreateInjectorParams): Injector {
    const injector = new SimpleInjector(parentInjector, params.name);

    if(strictMode) {
        for(const provider of providers) {
            if(isGlobalProviderType(provider)) {
                throw new Error(`${injector} can't register global provider ${StringifyProviderType(provider)}`);
            }
        }
    }
    providers.forEach((provider) => injector.registerProvider(provider));

    if (params.instantiateImmediately) {
        injector.resolveAll(params.allowUnresolved);
    }

    return injector;
}
