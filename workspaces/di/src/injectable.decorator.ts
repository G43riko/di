import { registerInjectable } from "./injectable.holder.ts";
import { Scope } from "./scope.ts";
// deno-lint-ignore no-empty-interface
export interface InjectableParams {
}
function InjectableLocal<T>(params: InjectableParams = {}): (constructor: T) => any {
    return (constructor: T): T => {
        registerInjectable(constructor as any, { ...params, scope: Scope.INJECTOR });
        return constructor;
    };
}
export function Injectable<T>(params: InjectableParams = {}): (constructor: T) => any {
    return (constructor: T): T => {
        registerInjectable(constructor as any, { ...params, scope: Scope.GLOBAL });
        return constructor;
    };
}

Injectable.local = InjectableLocal;
