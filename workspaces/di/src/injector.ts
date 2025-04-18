import { setCurrentInjector } from "./current-injector.ts";
import { Errors } from "./errors.ts";
import {
    type CustomProvider,
    getTokenFromProvider,
    isCustomProvider,
    isType,
    type ProviderToken,
    type ProviderType,
    StringifyProviderToken,
    type Type,
    type TypeResolution,
} from "./types.ts";
import "npm:reflect-metadata";

export interface Injector {
    get<T>(type: ProviderToken<T>): TypeResolution<T> | undefined;
    require<T>(type: ProviderToken<T>): TypeResolution<T>;

    printDebug(): void;
    run<T>(callback: () => T): T;
    runAsync<T>(callback: () => Promise<T>): Promise<T>;
}

interface InjectorHolder<T> {
    readonly type: ProviderType<T>;
    readonly token: ProviderToken;
    readonly resolution?: TypeResolution<T>;
}
type MapArray<T extends readonly ProviderToken[]> = {
    [K in keyof T]: T[K] extends Type<infer H> ? H : T[K];
  };
export class SimpleInjector implements Injector {
    protected readonly _holders: Map<ProviderToken<unknown>, InjectorHolder<unknown>> = new Map();

    public constructor(
        protected readonly parent?: Injector,
        protected readonly name?: string,
    ) {
    }

    public resolveAll(allowUnresolved = false): void {
        if (allowUnresolved) {
            this._holders.forEach((_, token) => this.get(token));
        } else {
            this._holders.forEach((_, token) => this.require(token));
        }
    }

    public registerProvider<T>(provider: ProviderType<T>): void {
        const token = getTokenFromProvider(provider);
        if (this._holders.has(token)) {
            throw new Error(Errors.CANNOT_REGISTER_MULTIPLE_TIMES(token));
        }
        this._holders.set(token, {
            token,
            type: provider,
        });
    }

    private createClassInstance<T>(type: Type<unknown>, params?: readonly unknown[]): TypeResolution<T> {
        const prevInjector = setCurrentInjector(this);
        try {
            if (params) {
                return new type(...params) as TypeResolution<T>;
            }

            return new type() as TypeResolution<T>;
        } finally {
            setCurrentInjector(prevInjector);
        }
    }
    protected resolveCustomProvider<T>(provider: CustomProvider<T>): TypeResolution<T> {
        if("useValue" in provider) {
            return provider.useValue as TypeResolution<T>;
        }
        if("useClass" in provider) {
            return this.resolveTypeProvider(provider.useClass)
        }

        if("factory" in provider) {
            if(provider.deps?.length) {
                return provider.factory(
                    ...this.resolveParameters(provider.deps)
                )
            }
            return provider.factory();

        }
        throw new Error(`Cannot resolve custom provider ${JSON.stringify(provider)}`);
    }

    private resolveParameters<T extends readonly ProviderToken[]>(parameters: T): MapArray<T> {
        return parameters.map((parameter: ProviderToken) => this.get(parameter)) as MapArray<T>
    }
    private resolveTypeProvider<T>(type: Type<T>): T {
        const parameters = Reflect.getMetadata("design:paramtypes", type);
        if (!parameters) {
            return this.createClassInstance<T>(type);
        }

        const resolvedParams = this.resolveParameters(parameters);

        if (resolvedParams.some((e: TypeResolution) => typeof e === "undefined")) {
            throw new Error(Errors.CANNOT_RESOLVE_PARAMS(type, resolvedParams));
        }

        return this.createClassInstance<T>(type, resolvedParams);
    }
    private resolveToken<T>(data: InjectorHolder<T>): TypeResolution<T> {
        if(isType(data.type)) {
            return this.resolveTypeProvider<T>(data.type);
        }
        if(isCustomProvider(data.type)) {
            return this.resolveCustomProvider(data.type);
        }

        throw new Error(`Invalid type '${data.type}'`)
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
        const stringityData = Object.fromEntries(
            this._holders.entries().map(([token]) => {
                return [StringifyProviderToken(token), String(this.get(token))];
            }),
        );
        const injectorName = this.name ?? "SimpleInjector";
        console.log(`Injector '${injectorName}' contains: ${JSON.stringify(stringityData, null, 4)}`);
    }
    public get<T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
        const holder = this._holders.get(token) as InjectorHolder<T>;

        if (!holder) {
            if (this.parent) {
                return this.parent.get(token);
            }

            return undefined;
        }

        if (holder.resolution) {
            return holder.resolution;
        }

        const newResolution = this.resolveToken(holder);

        // TODO: save resolution only if it is global
        const newHolder = {
            token,
            type: holder.type,
            resolution: newResolution,
        };

        this._holders.set(token, newHolder);

        return newResolution;
    }
}
