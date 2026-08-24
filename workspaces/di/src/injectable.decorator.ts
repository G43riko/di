import "reflect-metadata";
import { registerInjectable } from "./injectable.holder.ts";
import { Scope } from "./scope.ts";
import { Errors } from "./errors.ts";
import type { Type } from "./types.ts";

/**
 * Configuration options for the Injectable decorator.
 */
export interface InjectableDecoratorParams {
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
export function InjectableDecorator<T>(params: InjectableDecoratorParams = {}): (constructor: T) => any {
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
const createScopedDecorator = <T>(
    scope: Scope,
): (params?: Omit<InjectableDecoratorParams, "scope">) => (constructor: T) => any => {
    return function <T>(params = {}): (constructor: T) => any {
        return (constructor: T): T => {
            registerInjectable(constructor as any, { ...params, scope });
            return constructor;
        };
    };
};

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
const transient = createScopedDecorator(Scope.TRANSIENT);

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
const global: ReturnType<typeof createScopedDecorator> = createScopedDecorator(Scope.GLOBAL);

export interface ServiceDecoratorParams<T = unknown> {
    readonly factory?: () => T;
}

/**
 * Decorator for a global service. Services use `inject()` or an optional factory
 * instead of constructor-based dependency injection.
 */
export function Service<T extends Type>(params: ServiceDecoratorParams<InstanceType<T>> = {}): (constructor: T) => T {
    return (constructor: T): T => {
        const constructorParamTypes = Reflect.getMetadata("design:paramtypes", constructor);
        if (constructorParamTypes?.length) {
            throw new Error(Errors.SERVICE_CANNOT_HAVE_CONSTRUCTOR_PARAMS(constructor as any));
        }

        registerInjectable(constructor as any, { scope: Scope.GLOBAL, factory: params.factory });
        return constructor;
    };
}

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
const injector = createScopedDecorator(Scope.INJECTOR);

export const Injectable: {
    global: ReturnType<typeof createScopedDecorator>;
    injector: ReturnType<typeof createScopedDecorator>;
    transient: ReturnType<typeof createScopedDecorator>;
} & typeof InjectableDecorator = Object.assign(InjectableDecorator, { global, injector, transient });
