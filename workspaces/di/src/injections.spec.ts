import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Injectable } from "./injectable.decorator.ts";
import { RootInjector } from "./root-injector.ts";
import { inject } from "./injections.ts";
import { createInjector } from "./create-injector.ts";

describe("Injections", () => {
    @Injectable()
    class ServiceA {}

    @Injectable()
    class ServiceB {
        public readonly serviceA = inject.optional(ServiceA);

        public testA() {
            return inject.optional(ServiceA);
        }
    }

    @Injectable.local()
    class ServiceC {}
    @Injectable.local()
    class ServiceD {}
    @Injectable.local()
    class ServiceE {
        public readonly serviceC = inject(ServiceC);

        public testD() {
            return inject.optional(ServiceD);
        }
        public testRequiredD() {
            return inject(ServiceD);
        }
    }
    describe("RootInjector", () => {
        it("should test valid dependency injection", () => {
            const serviceA = RootInjector.require(ServiceA);
            const serviceB = RootInjector.require(ServiceB);
            expect(serviceA).toBeInstanceOf(ServiceA);
            expect(serviceB).toBeInstanceOf(ServiceB);
            expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
            expect(() => serviceB.testA()).toThrow();
            expect(RootInjector.run(() => serviceB.testA())).toBeInstanceOf(ServiceA);
        });
    });
    describe("Injector", () => {
        it("Should throw if createInjection checkImmediate invalid dependency", () => {
            expect(() =>
                createInjector({
                    providers: [ServiceE],
                    instantiateImmediately: true,
                })
            ).toThrow();
        });
        describe("Test ServiceE without any dependency", () => {
            const injector = createInjector({
                providers: [ServiceE],
            });
            it("should throw if accessing ServiceE", () => {
                expect(() => injector.get(ServiceE)).toThrow();
                expect(() => injector.require(ServiceE)).toThrow();
            });
        });
        describe("Test ServiceE provided ServiceC", () => {
            const injector = createInjector({
                providers: [ServiceE, ServiceC],
            });
            const serviceE = injector.get(ServiceE) as ServiceE;
            it("should create ServiceE", () => {
                expect(serviceE).toBeInstanceOf(ServiceE);
                expect(injector.require(ServiceE)).toBeInstanceOf(ServiceE);
            });
            it("should check that ServiceE has serviceC", () => {
                expect(serviceE.serviceC).toBeInstanceOf(ServiceC);
            });
            it("throw if called injection outside of injection context", () => {
                expect(() => serviceE.testD()).toThrow();
                expect(() => serviceE.testRequiredD()).toThrow();
            });

            it("provide dependency if injection is called within injection context", () => {
                expect(injector.run(() => serviceE.testD())).toBeUndefined();
                expect(() => injector.run(() => serviceE.testRequiredD())).toThrow();
            });
        });
        it("should test valid dependency injection", () => {
            const serviceA = RootInjector.require(ServiceA);
            const serviceB = RootInjector.require(ServiceB);
            expect(serviceA).toBeInstanceOf(ServiceA);
            expect(serviceB).toBeInstanceOf(ServiceB);
            expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
            // should throw because `inject` is called outside of injection context
            expect(() => serviceB.testA()).toThrow();
            expect(RootInjector.run(() => serviceB.testA())).toBeInstanceOf(ServiceA);
        });
    });
});
