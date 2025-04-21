import {registerInjectable} from "./injectable.holder.ts";
import {Scope} from "./scope.ts";

/**
 * Configuration options for the Injectable decorator.
 */
export interface InjectableParams {
    /** 
     * The scope that determines the lifetime of instances of the decorated class.
     * Defaults to Scope.GLOBAL if not specified.
     */
    readonly scope?: Scope;
}

/**
 * Decorator that marks a class as available to be provided and injected.
 * 
 * @template T - The type of the constructor being decorated
 * @param params - Optional configuration parameters
 * @returns A decorator function
 * 
 * @example
 * ```ts
 * @Injectable()
 * class MyService {
 *   // ...
 * }
 * ```
 */
export function Injectable<T>(params: InjectableParams = {}): (constructor: T) => any {
    return (constructor: T): T => {
        registerInjectable(constructor as any, { ...params, scope: params.scope ?? Scope.GLOBAL });
        return constructor;
    };
}
/**
 * Helper function to create scope-specific versions of the Injectable decorator.
 * 
 * @template T - The type of the constructor being decorated
 * @param scope - The scope to apply to the decorated class
 * @returns A function that creates a decorator with the specified scope
 */
const createScoped = <T>(scope: Scope): (params?: Omit<InjectableParams, "scope">) => (constructor: T) => any => {
    return function <T>(params = {}): (constructor: T) => any {
        return (constructor: T): T => {
            registerInjectable(constructor as any, {...params, scope});
            return constructor;
        };
    }
}

/**
 * Decorator that marks a class as injectable with TRANSIENT scope.
 * A new instance will be created each time the class is injected.
 * 
 * @example
 * ```ts
 * @Injectable.transient()
 * class MyService {
 *   // ...
 * }
 * ```
 */
Injectable.transient = createScoped(Scope.TRANSIENT);

/**
 * Decorator that marks a class as injectable with GLOBAL scope.
 * A single instance will be shared across all injectors.
 * 
 * @example
 * ```ts
 * @Injectable.global()
 * class MyService {
 *   // ...
 * }
 * ```
 */
Injectable.global = createScoped(Scope.GLOBAL);

/**
 * Decorator that marks a class as injectable with INJECTOR scope.
 * A single instance will be shared within each injector.
 * 
 * @example
 * ```ts
 * @Injectable.injector()
 * class MyService {
 *   // ...
 * }
 * ```
 */
Injectable.injector = createScoped(Scope.INJECTOR)
