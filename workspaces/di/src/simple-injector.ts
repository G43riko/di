import { validateProviders } from "./config.ts";
import { setCurrentInjector } from "./current-injector.ts";
import { Errors } from "./errors.ts";
import { isTransientProviderType } from "./injectable.holder.ts";
import { InjectionToken } from "./injection-token.ts";
import type { Injector } from "./injector.ts";
import {
    type CustomProvider,
    getTokenFromProvider,
    isCustomProvider,
    isType,
    type ProviderToken,
    type ProviderType,
    StringifyProviderToken, StringifyProviderType,
    type Type,
    type TypeResolution,
    validateCustomProvider,
} from "./types.ts";

import "npm:reflect-metadata";

export interface InjectorEntry<T> {
    readonly type: ProviderType<T>;
    readonly token: ProviderToken;
    readonly resolution?: TypeResolution<T>;
}
export type MapArray<T extends readonly ProviderToken[]> = {
    [K in keyof T]: T[K] extends Type<infer H> ? H : T[K];
};

export class SimpleInjector implements Injector {
    protected readonly _holders: Map<ProviderToken<unknown>, InjectorEntry<unknown>> = new Map();

    public constructor(
        protected readonly parent?: Injector,
        protected readonly name?: string,
    ) {
    }

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
        if (isCustomProvider(provider)) {
            validateCustomProvider(provider)
        }
    }
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
        if ("useValue" in provider) {
            return provider.useValue as TypeResolution<T>;
        }
        if ("useClass" in provider) {
            return this.resolveTypeProvider(provider.useClass);
        }

        if ("useExisting" in provider) {
            return this.require(provider.useExisting);
        }

        if ("factory" in provider) {
            if (provider.deps?.length) {
                return provider.factory(
                    ...this.resolveParameters(provider.deps),
                );
            }
            return provider.factory();
        }

        throw new Error(`Cannot resolve custom provider: ${StringifyProviderType(provider)}. Invalid provider configuration.`);
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
        throw new Error(`Cannot resolve provider type '${data.type}' for token '${StringifyProviderToken(data.token)}'. Make sure the provider is properly registered and all dependencies are available.`);
    }

    public require<T>(token: ProviderToken<T>): TypeResolution<T> {
        const resolution = this.get(token);
        if (resolution) {
            return resolution;
        }

        throw new Error(Errors.CANNOT_FIND_TOKEN(token));
    }

    public run<T>(callback: () => T): T {
        const prevInjector = setCurrentInjector(this);
        try {
            return callback();
        } finally {
            setCurrentInjector(prevInjector);
        }
    }

    public async runAsync<T>(callback: () => Promise<T>): Promise<T> {
        const prevInjector = setCurrentInjector(this);
        try {
            return await callback();
        } finally {
            setCurrentInjector(prevInjector);
        }
    }

    public printDebug(): void {
        const stringifyData = Object.fromEntries(
            this._holders.entries().map(([token]) => {
                return [StringifyProviderToken(token), String(this.get(token))];
            }),
        );
        const injectorName = this.name ?? "SimpleInjector";
        console.log(`Injector '${injectorName}' contains: ${JSON.stringify(stringifyData, null, 4)}`);
    }

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
