import { rootInjectorName } from "./config.ts";
import { isGlobalProviderType } from "./injectable.holder.ts";
import { InjectionToken } from "./injection-token.ts";
import type { Injector } from "./injector.ts";
import { SimpleInjector } from "./simple-injector.ts";
import { isType, type ProviderToken, type TypeResolution } from "./types.ts";

class RootInjectorClass extends SimpleInjector {
    public constructor() {
        super(undefined, rootInjectorName);
    }

    public override get<T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
        const existingItem = super.get(token);
        if (existingItem) {
            return existingItem;
        }

        if (isType(token)) {
            const isGlobal = isGlobalProviderType(token);

            if (isGlobal) {
                this.registerProvider(token);

                return super.get(token, true);
            } else {
                // we are in get method so we just return undefined
                return;
            }
        }
        if (token instanceof InjectionToken) {
            if (token.options.required) {
                throw new Error(`${token} is required but not found`);
            }
            return undefined;
        }

        throw new Error("Not implemented");
    }
}

export const RootInjector: Injector = new RootInjectorClass();
