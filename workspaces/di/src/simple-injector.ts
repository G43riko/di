import "reflect-metadata";
import { enableConstructorInjection, validateProviders } from "./config.ts";
import { setCurrentInjector } from "./current-injector.ts";
import { Errors } from "./errors.ts";
import { isInjectable, isTransientProviderType } from "./injectable.holder.ts";
import { InjectionToken } from "./injection-token.ts";
import type { Injector } from "./injector.ts";
import {
    type CustomProvider,
    getTokenFromProvider,
    isClassProvider,
    isCustomProvider,
    isExistingProvider,
    isFactoryProvider,
    isType,
    isValueProvider,
    type ProviderToken,
    type ProviderType,
    StringifyProviderToken,
    StringifyProviderType,
    type Type,
    type TypeResolution,
    validateCustomProvider,
} from "./types.ts";

/**
 * Represents an entry in the injector's internal registry.
 * @template T - The type of the provider
 */
export interface InjectorEntry<T> {
    /** The provider type */
    readonly type: ProviderType<T>;
    /** The token used to identify this provider */
    readonly token: ProviderToken;
    /** The resolved instance, if already created */
    readonly resolution?: TypeResolution<T>;
}
/**
 * Maps an array of provider tokens to their resolved types.
 * @template T - Array of provider tokens
 */
export type MapArray<T extends readonly ProviderToken[]> = {
    [K in keyof T]: T[K] extends Type<infer H> ? H : T[K];
};

/**
 * A dependency injection container that manages providers and resolves dependencies.
 * SimpleInjector is the core implementation of the Injector interface.
 */
export class SimpleInjector implements Injector {
    /** Internal map of provider tokens to their entries */
    protected readonly _holders: Map<ProviderToken<unknown>, InjectorEntry<unknown>> = new Map();

    /**
     * Creates a new SimpleInjector instance.
     *
     * @param parent - Optional parent injector to delegate resolution to when a token is not found in this injector
     * @param name - Optional name for this injector, used for debugging purposes
     */
    public constructor(
        protected readonly parent?: Injector,
        protected readonly name?: string,
    ) {
    }

    /**
     * Resolves all registered tokens in this injector.
     *
     * @param allowUnresolved - When true, skips tokens that cannot be resolved instead of throwing an error
     * @returns Array of successfully resolved provider tokens
     */
    public resolveAll(allowUnresolved = false): ProviderToken[] {
        const resolvedTokens: ProviderToken[] = [];
        const method = allowUnresolved ? this.get.bind(this) : this.require.bind(this);

        for (const [token] of this._holders.entries()) {
            try {
                method(token);
                resolvedTokens.push(token);
            } catch (error) {
                if (!allowUnresolved) {
                    throw error;
                }
                // Skip unresolved tokens when allowUnresolved is true
            }
        }

        return resolvedTokens;
    }

    private validateProvider(provider: ProviderType): void {
        if (isType(provider)) {
            if (!isInjectable) {
                throw new Error(
                    `Class '${StringifyProviderType(provider)}' must be annotated witch @Injectable decorator`,
                );
            }
        } else if (isCustomProvider(provider)) {
            validateCustomProvider(provider);
        }
    }
    /**
     * Registers a provider in this injector.
     *
     * @template T - The type of the provider
     * @param provider - The provider to register
     * @throws Error if the provider is invalid or if a provider with the same token is already registered
     */
    public registerProvider<T>(provider: ProviderType<T>): void {
        if (validateProviders) {
            this.validateProvider(provider);
        }

        const token = getTokenFromProvider(provider);

        if (this._holders.has(token)) {
            throw new Error(Errors.CANNOT_REGISTER_MULTIPLE_TIMES(token));
        }

        this._holders.set(token, {
            token,
            type: provider,
        });
    }

    private createClassInstance<T>(type: Type<unknown>, params: readonly unknown[] = []): TypeResolution<T> {
        const prevInjector = setCurrentInjector(this);
        try {
            return new type(...params) as TypeResolution<T>;
        } finally {
            setCurrentInjector(prevInjector);
        }
    }

    private resolveCustomProvider<T>(provider: CustomProvider<T>): TypeResolution<T> {
        if (isValueProvider(provider)) {
            return provider.useValue;
        }
        if (isClassProvider(provider)) {
            return this.resolveTypeProvider(provider.useClass);
        }

        if (isExistingProvider(provider)) {
            return this.require(provider.useExisting);
        }

        if (isFactoryProvider(provider)) {
            if (provider.deps?.length) {
                return provider.factory(
                    ...this.resolveParameters(provider.deps),
                );
            }
            return provider.factory();
        }

        throw new Error(
            `Cannot resolve custom provider: ${StringifyProviderType(provider)}. Invalid provider configuration.`,
        );
    }

    private resolveParameters<T extends readonly ProviderToken[]>(parameters: T): MapArray<T> {
        return parameters.map((parameter: ProviderToken, index: number) => {
            const resolved = this.get(parameter);
            if (resolved === undefined) {
                throw new Error(`Failed to resolve parameter at index ${index}: ${StringifyProviderToken(parameter)}`);
            }
            return resolved;
        }) as MapArray<T>;
    }
    private getResolvedParams<T>(type: Type<T>): undefined | readonly unknown[] {
        const parameters = Reflect.getMetadata("design:paramtypes", type);
        if (!parameters) {
            return undefined;
        }

        if (!enableConstructorInjection) {
            throw new Error("Constructor parameters are disabled");
        }
        const resolvedParams = this.resolveParameters(parameters);

        if (resolvedParams.some((e: TypeResolution) => typeof e === "undefined")) {
            throw new Error(Errors.CANNOT_RESOLVE_PARAMS(type, resolvedParams));
        }

        return resolvedParams;
    }
    private resolveTypeProvider<T>(type: Type<T>): T {
        const resolvedParams = this.getResolvedParams(type);

        return this.createClassInstance<T>(type, resolvedParams);
    }

    private resolveInjectionTokenDefaultValue<T>(defaultValue: T | (() => T)): TypeResolution<T> {
        if (typeof defaultValue !== "function") {
            return defaultValue;
        }
        return this.run(() => (defaultValue as any)());
    }

    private resolveEntry<T>(data: InjectorEntry<T>): TypeResolution<T> {
        if (isType(data.type)) {
            return this.resolveTypeProvider<T>(data.type);
        }
        if (isCustomProvider(data.type)) {
            return this.resolveCustomProvider(data.type);
        }

        if (data.token instanceof InjectionToken) {
            const defaultValue = data.token.options?.defaultValue;
            if (defaultValue) {
                return this.resolveInjectionTokenDefaultValue(defaultValue);
            }
        }
        throw new Error(
            `Cannot resolve provider type '${data.type}' for token '${
                StringifyProviderToken(data.token)
            }'. Make sure the provider is properly registered and all dependencies are available.`,
        );
    }

    /**
     * Resolves a token to its instance, throwing an error if the token cannot be resolved.
     *
     * @template T - The type of the provider
     * @param token - The token to resolve
     * @returns The resolved instance
     * @throws Error if the token cannot be resolved
     */
    public require<T>(token: ProviderToken<T>): TypeResolution<T> {
        const resolution = this.get(token);
        if (resolution) {
            return resolution;
        }

        throw new Error(Errors.CANNOT_FIND_TOKEN(token));
    }

    /**
     * Runs a callback with this injector set as the current injector.
     * This allows the inject() function to work within the callback.
     *
     * @template T - The return type of the callback
     * @param callback - The function to run with this injector as the current one
     * @returns The result of the callback
     */
    public run<T>(callback: () => T): T {
        const prevInjector = setCurrentInjector(this);
        try {
            return callback();
        } finally {
            setCurrentInjector(prevInjector);
        }
    }

    /**
     * Runs an async callback with this injector set as the current injector.
     * This allows the inject() function to work within the callback.
     *
     * @template T - The return type of the callback
     * @param callback - The async function to run with this injector as the current one
     * @returns A promise that resolves to the result of the callback
     */
    public async runAsync<T>(callback: () => Promise<T>): Promise<T> {
        const prevInjector = setCurrentInjector(this);
        try {
            return await callback();
        } finally {
            setCurrentInjector(prevInjector);
        }
    }

    /**
     * Prints debug information about this injector to the console.
     * Includes all registered tokens and their resolved values.
     */
    public printDebug(): void {
        const stringifyData = Object.fromEntries(
            this._holders.entries().map(([token]) => {
                return [StringifyProviderToken(token), String(this.get(token))];
            }),
        );
        const injectorName = this.name ?? "SimpleInjector";
        console.log(`Injector '${injectorName}' contains: ${JSON.stringify(stringifyData, null, 4)}`);
    }

    /**
     * Resolves a token to its instance.
     *
     * @template T - The type of the provider
     * @param token - The token to resolve
     * @param ignoreParent - When true, doesn't look for the token in the parent injector
     * @returns The resolved instance or undefined if the token cannot be resolved
     */
    public get<T>(token: ProviderToken<T>, ignoreParent = false): TypeResolution<T> | undefined {
        const holder = this._holders.get(token) as InjectorEntry<T>;

        if (!holder) {
            if (this.parent && !ignoreParent) {
                const parentValue = this.parent.get(token);
                if (parentValue) {
                    return parentValue;
                }
            }
            // if we cannot find token in parent injector, we try to use a default value from InjectionToken
            if (token instanceof InjectionToken && token.options?.defaultValue) {
                return this.resolveInjectionTokenDefaultValue(token.options?.defaultValue);
            }
            return undefined;
        }

        if (holder.resolution) {
            return holder.resolution;
        }

        const newResolution = this.resolveEntry(holder);

        if (!isTransientProviderType(holder.type)) {
            const newHolder = {
                token,
                type: holder.type,
                resolution: newResolution,
            };

            // For GLOBAL and INJECTOR scopes, we cache the resolution
            this._holders.set(token, newHolder);
        }
        return newResolution;
    }
}
