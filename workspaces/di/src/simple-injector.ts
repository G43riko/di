import "reflect-metadata";
import { enableConstructorInjection, validateProviders } from "./config.ts";
import { runWithInjector } from "./current-injector.ts";
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
    /** The provider type(s) */
    readonly providerType: ProviderType<T> | ProviderType<T>[];
    /** The token used to identify this provider */
    readonly token: ProviderToken;
    /** The cached resolved instance(s), if available */
    readonly cachedResolution?: TypeResolution<T> | TypeResolution<T>[];
    /** Whether this is a multi-provider */
    readonly isMulti?: boolean;
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
    /** Maps provider tokens to their provider entries */
    protected readonly _providerEntries: Map<ProviderToken<unknown>, InjectorEntry<unknown>> = new Map();

    /** Stack of tokens currently being resolved (for circular dependency detection) */
    private readonly _dependencyResolutionStack: ProviderToken[] = [];

    /**
     * Creates a new SimpleInjector instance.
     *
     * @param parent - Optional parent injector to delegate resolution to when a token is not found in this injector
     * @param name - Optional name for this injector, used for debugging purposes
     * @param options
     */
    public constructor(
        protected readonly parent?: Injector,
        protected readonly name?: string,
        private readonly options?: { readonly ignoreDuplicates?: boolean },
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

        for (const [token] of this._providerEntries.entries()) {
            try {
                allowUnresolved ? this.get(token) : this.require(token);
                resolvedTokens.push(token);
            } catch (error) {
                if (!allowUnresolved) {
                    throw error;
                }
            }
        }

        return resolvedTokens;
    }

    private validateProvider(provider: ProviderType): void {
        if (isType(provider)) {
            if (!isInjectable(provider)) {
                throw new Error(
                    `Class '${StringifyProviderType(provider)}' must be annotated with @Injectable decorator`,
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
        const isMultiProvider = isCustomProvider(provider) && provider.multi === true;
        const existingEntry = this._providerEntries.get(token) as InjectorEntry<T> | undefined;

        if (existingEntry) {
            if (isMultiProvider && existingEntry.isMulti) {
                this._providerEntries.set(token, {
                    ...existingEntry,
                    providerType: [...(existingEntry.providerType as ProviderType<T>[]), provider],
                } as InjectorEntry<unknown>);
                return;
            }
            if (this.options?.ignoreDuplicates) {
                return;
            }
            throw new Error(Errors.CANNOT_REGISTER_MULTIPLE_TIMES(token));
        }

        this._providerEntries.set(token, {
            token,
            providerType: isMultiProvider ? [provider] : provider,
            isMulti: isMultiProvider,
        } as InjectorEntry<unknown>);
    }

    private createClassInstance<T>(type: Type<unknown>, params: readonly unknown[] = []): TypeResolution<T> {
        return runWithInjector(this, () => new type(...params) as TypeResolution<T>);
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

        // provider is narrowed to FactoryCustomProvider<T> here
        if (provider.deps?.length) {
            return provider.factory(
                ...this.resolveParameters(provider.deps),
            );
        }
        return provider.factory();
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

    private getResolvedConstructorParams<T>(type: Type<T>): undefined | readonly unknown[] {
        const constructorParamTypes = Reflect.getMetadata("design:paramtypes", type);
        if (!constructorParamTypes) {
            return undefined;
        }

        if (!enableConstructorInjection) {
            throw new Error("Constructor parameters are disabled");
        }

        const resolvedParams = this.resolveParameters(constructorParamTypes);

        if (resolvedParams.some((param: TypeResolution) => typeof param === "undefined")) {
            throw new Error(Errors.CANNOT_RESOLVE_PARAMS(type, resolvedParams));
        }

        return resolvedParams;
    }
    private resolveTypeProvider<T>(type: Type<T>): T {
        const resolvedParams = this.getResolvedConstructorParams(type);
        return this.createClassInstance<T>(type, resolvedParams);
    }

    private resolveInjectionTokenDefault<T>(defaultValue: T | (() => T)): TypeResolution<T> {
        if (typeof defaultValue !== "function") {
            return defaultValue;
        }
        return runWithInjector(this, () => (defaultValue as any)());
    }

    private resolveProviderType<T>(providerType: ProviderType<T>, token: ProviderToken): TypeResolution<T> {
        if (isType(providerType)) {
            return this.resolveTypeProvider<T>(providerType);
        }
        if (isCustomProvider(providerType)) {
            return this.resolveCustomProvider(providerType);
        }

        if (token instanceof InjectionToken) {
            const defaultValue = token.options?.defaultValue;
            if (defaultValue !== undefined) {
                return this.resolveInjectionTokenDefault(defaultValue);
            }
        }
        throw new Error(
            `Cannot resolve provider type '${providerType}' for token '${
                StringifyProviderToken(token)
            }'. Make sure the provider is properly registered and all dependencies are available.`,
        );
    }

    private resolveEntry<T>(entry: InjectorEntry<T>): TypeResolution<T> | TypeResolution<T>[] {
        if (Array.isArray(entry.providerType)) {
            return entry.providerType.map((providerType) => this.resolveProviderType(providerType, entry.token));
        }
        return this.resolveProviderType(entry.providerType, entry.token);
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
        if (resolution !== undefined) {
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
        return runWithInjector(this, callback);
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
        return await runWithInjector(this, callback);
    }

    /**
     * Prints debug information about this injector to the console.
     * Includes all registered tokens and their resolved values.
     */
    public printDebug(): void {
        const debugData = Object.fromEntries(
            this._providerEntries.entries().map(([token]) => {
                return [StringifyProviderToken(token), String(this.get(token))];
            }),
        );
        const injectorName = this.name ?? "SimpleInjector";
        console.log(`Injector '${injectorName}' contains: ${JSON.stringify(debugData, null, 4)}`);
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
        if (this._dependencyResolutionStack.includes(token)) {
            throw new Error(Errors.CIRCULAR_DEPENDENCY([...this._dependencyResolutionStack, token]));
        }

        const entry = this._providerEntries.get(token) as InjectorEntry<T>;

        if (!entry) {
            if (this.parent && !ignoreParent) {
                const parentResolution = this.parent.get(token);
                if (parentResolution !== undefined) {
                    return parentResolution;
                }
            }
            if (token instanceof InjectionToken && token.options?.defaultValue !== undefined) {
                return this.resolveInjectionTokenDefault(token.options?.defaultValue);
            }
            return undefined;
        }

        if ("cachedResolution" in entry) {
            return entry.cachedResolution as TypeResolution<T>;
        }

        this._dependencyResolutionStack.push(token);
        try {
            const newResolution = this.resolveEntry(entry);

            const isTransient = Array.isArray(entry.providerType)
                ? entry.providerType.some(isTransientProviderType)
                : isTransientProviderType(entry.providerType);

            if (!isTransient) {
                const cachedEntry = {
                    ...entry,
                    cachedResolution: newResolution,
                };
                this._providerEntries.set(token, cachedEntry as InjectorEntry<unknown>);
            }
            return newResolution as TypeResolution<T>;
        } finally {
            this._dependencyResolutionStack.pop();
        }
    }
}
