import { isGlobalInjectable } from "./injectable.holder.ts";
import { type Injector, SimpleInjector } from "./injector.ts";
import { isType, type ProviderToken, type TypeResolution } from "./types.ts";

class RootInjectorClass extends SimpleInjector {
    public constructor() {
        super(undefined, "RootInjector");
    }

    public override get<T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
        const existingItem = super.get(token);
        if (existingItem) {
            return existingItem;
        }

        if (isType(token)) {
            const isGlobal = isGlobalInjectable(token);

            if (isGlobal) {
                this.registerProvider(token);

                return super.get(token);
            } else {
                // we are in get method so we just return undefined
                return;
            }
        }
        throw new Error("Not implemented");
    }
}

export const RootInjector: Injector = new RootInjectorClass();
