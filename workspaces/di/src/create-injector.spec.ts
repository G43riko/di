import { afterEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Injectable } from "./injectable.decorator.ts";
import { createInjector } from "./create-injector.ts";
import { _resetConfig, _setStrictMode, rootInjectorName } from "./config.ts";

describe("createInjector strict mode", () => {
    afterEach(() => _resetConfig());

    it("should throw when a global provider is registered in strict mode", () => {
        @Injectable()
        class StrictGlobalService {}

        _setStrictMode(true);
        expect(() => createInjector({ providers: [StrictGlobalService] })).toThrow();
    });

    it("should not throw when only non-global providers are used in strict mode", () => {
        @Injectable.injector()
        class LocalService {}

        _setStrictMode(true);
        expect(() => createInjector({ providers: [LocalService] })).not.toThrow();
    });
});

describe("createInjector global providers", () => {
    it("should route global providers to RootInjector", () => {
        @Injectable()
        class GlobalInProvidersList {}

        const injector = createInjector({ providers: [GlobalInProvidersList] });
        expect(injector.get(GlobalInProvidersList)).toBeInstanceOf(GlobalInProvidersList);
    });
});

describe("createInjector", () => {
    @Injectable.injector()
    class ServiceA {}

    @Injectable.injector()
    class ServiceB {
        public constructor(
            public readonly serviceA: ServiceA,
        ) {}
    }

    @Injectable()
    class ServiceC {
    }
    it("Should throw if injector with roots name is creating", () => {
        expect(() => createInjector({ name: rootInjectorName })).toThrow();
    });
    it("should resolve all when instantiateImmediately and allowUnresolved are true", () => {
        const injector = createInjector({
            providers: [ServiceA],
            instantiateImmediately: true,
            allowUnresolved: true,
        });
        expect(injector.get(ServiceA)).toBeInstanceOf(ServiceA);
    });
    it("should instantiate all providers when instantiateImmediately is true", () => {
        const injector = createInjector({
            providers: [ServiceA],
            instantiateImmediately: true,
        });
        expect(injector.get(ServiceA)).toBeInstanceOf(ServiceA);
    });
    describe("create injector with valid service with no providers", () => {
        const injectorWithServiceA = createInjector({
            providers: [ServiceA],
        });
        it("should check that injectorWithServiceA has provided ServiceA", () => {
            expect(injectorWithServiceA.get(ServiceA)).toBeInstanceOf(ServiceA);
        });
        it("should check that injectorWithServiceA has missing ServiceB", () => {
            expect(injectorWithServiceA.get(ServiceB)).toBeUndefined();
        });
        it("should check that injectorWithServiceA has global ServiceC", () => {
            expect(injectorWithServiceA.get(ServiceC)).toBeInstanceOf(ServiceC);
        });
    });
    describe("create injector with service with missing dependency", () => {
        const injectorWithServiceB = createInjector({
            providers: [ServiceB],
        });
        it("should check that injectorWithServiceB has missing all local services", () => {
            expect(injectorWithServiceB.get(ServiceA)).toBeUndefined();
            expect(() => injectorWithServiceB.get(ServiceB)).toThrow();
        });
        it("should check that injectorWithServiceB has global ServiceC", () => {
            expect(injectorWithServiceB.get(ServiceC)).toBeInstanceOf(ServiceC);
        });
    });
});
