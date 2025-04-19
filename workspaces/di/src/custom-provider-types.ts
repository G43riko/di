import { Injector } from "./injector.ts";
import { ProviderToken, Type } from "./types.ts";

export type InjectionToken<T> = {
    readonly _type: T;
    readonly name: string;
}
export function createInjectionToken<T = any>(name: string): InjectionToken<T> {
    return {name} as InjectionToken<T>
}


interface ProvidedValue<T> {
    readonly type: "ValueProvider",
    readonly value: T;
}
function ProvideValue<T>(value: T): ProvidedValue<T> {
    return {
        type: "ValueProvider",
        value
    };
}

interface ProvidedClass<T> {
    readonly type: "ClassProvider",
    readonly clazz: Type<T>;
}
function ProvideClass<T>(clazz: Type<T>): ProvidedClass<T> {
    return {
        type: "ClassProvider",
        clazz,
    };
}
export interface ResolvableProvider<T> {
    readonly token: ProviderToken;
    readonly resolve: (injector: Injector) => T
}
function createResolvableProvider<T>(token: InjectionToken<T>, valueOrProvider: T | ProvidedValue<T> | ProvidedClass<T>): ResolvableProvider<T> {
    if(valueOrProvider && typeof valueOrProvider === "object" && "type" in valueOrProvider) {
        if(valueOrProvider.type === "ValueProvider") {
            return {
                token,
                resolve: () => valueOrProvider.value
            }
        }
        
        if(valueOrProvider.type === "ClassProvider") {
            return {
                token,
                resolve: (injector) => injector.require(valueOrProvider.clazz),
            }
        }
    }
    return {
        token,
        resolve: () => valueOrProvider,
    }
}

const tokenTest = createInjectionToken<{name: string}>("PERSON");
class ValueA {

}
class ValueB extends ValueA{

}
class ValueC{

}
const tokenValueA = createInjectionToken<ValueA>("Value_A");

createResolvableProvider(tokenValueA, ProvideClass(ValueA));
createResolvableProvider(tokenValueA, ProvideClass(ValueB));
createResolvableProvider(tokenValueA, ProvideClass(ValueC));


createResolvableProvider(tokenTest, ProvideValue({name: "Gabriel"}));
createResolvableProvider(tokenTest, {name: "Gabriel"});
