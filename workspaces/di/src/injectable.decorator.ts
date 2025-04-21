import {registerInjectable} from "./injectable.holder.ts";
import {Scope} from "./scope.ts";

export interface InjectableParams {
    readonly scope?: Scope;
}
export function Injectable<T>(params: InjectableParams = {}): (constructor: T) => any {
    return (constructor: T): T => {
        registerInjectable(constructor as any, { ...params, scope: params.scope ?? Scope.GLOBAL });
        return constructor;
    };
}
const createScoped = <T>(scope: Scope): (params?: Omit<InjectableParams, "scope">) => (constructor: T) => any => {
    return function <T>(params = {}): (constructor: T) => any {
        return (constructor: T): T => {
            registerInjectable(constructor as any, {...params, scope});
            return constructor;
        };
    }
}

Injectable.transient = createScoped(Scope.TRANSIENT);
Injectable.global = createScoped(Scope.GLOBAL);
Injectable.injector = createScoped(Scope.INJECTOR)
