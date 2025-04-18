import { registerInjectable } from "./injectable.holder.ts";
// deno-lint-ignore no-empty-interface
export interface InjectableParams {
}

export function Injectable<T>(params: InjectableParams = {}): (constructor: T) => any {
    return (constructor: T): T => {
        registerInjectable(constructor as any, { ...params, global: true });
        return constructor;
    };
}

Injectable.local = function <T>(params: InjectableParams = {}): (constructor: T) => any {
    return (constructor: T): T => {
        registerInjectable(constructor as any, { ...params, global: false });
        return constructor;
    };
};
