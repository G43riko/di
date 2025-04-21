import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Injectable } from "./injectable.decorator.ts";
import { RootInjector } from "./root-injector.ts";
describe("RootInjector", () => {
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

    it("should check that RootInjector has global ServiceC service", () => {
        expect(RootInjector.get(ServiceC)).toBeInstanceOf(ServiceC);
        expect(RootInjector.require(ServiceC)).toBeInstanceOf(ServiceC);
    });
    it("should check that RootInjector is missing all local services ServiceA and ServiceB", () => {
        expect(RootInjector.get(ServiceA)).toBeUndefined();
        expect(RootInjector.get(ServiceB)).toBeUndefined();
    });
    it("should check that RootInjector throws error when missing service is required", () => {
        expect(() => RootInjector.require(ServiceA)).toThrow();
        expect(() => RootInjector.require(ServiceB)).toThrow();
    });
    it("should check that RootInjector always returns same instance", () => {
        expect(RootInjector.get(ServiceC)).toBe(RootInjector.get(ServiceC));
        expect(RootInjector.require(ServiceC)).toBe(RootInjector.require(ServiceC));
        expect(RootInjector.require(ServiceC)).toBe(RootInjector.get(ServiceC));
        expect(RootInjector.get(ServiceC)).toBe(RootInjector.require(ServiceC));
    });
});
