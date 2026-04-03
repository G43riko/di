import { afterEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Injectable } from "./injectable.decorator.ts";
import { createInjector } from "./create-injector.ts";
import { requireCurrentInjector, setCurrentInjector } from "./current-injector.ts";
import { SimpleInjector } from "./simple-injector.ts";

describe("setCurrentInjector / requireCurrentInjector", () => {
    afterEach(() => {
        setCurrentInjector(undefined);
    });

    it("should set the global injector and retrieve it via requireCurrentInjector", () => {
        const injector = new SimpleInjector();
        setCurrentInjector(injector);
        expect(requireCurrentInjector()).toBe(injector);
    });

    it("should return the previous injector when calling setCurrentInjector", () => {
        const injector1 = new SimpleInjector();
        const injector2 = new SimpleInjector();
        setCurrentInjector(injector1);
        const prev = setCurrentInjector(injector2);
        expect(prev).toBe(injector1);
    });

    it("should return undefined as the previous injector when none was set", () => {
        const injector = new SimpleInjector();
        const prev = setCurrentInjector(injector);
        expect(prev).toBeUndefined();
    });

    it("should throw when requireCurrentInjector is called with no injector set", () => {
        expect(() => requireCurrentInjector()).toThrow();
    });

    it("should clear the global injector when set to undefined", () => {
        const injector = new SimpleInjector();
        setCurrentInjector(injector);
        setCurrentInjector(undefined);
        expect(() => requireCurrentInjector()).toThrow();
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
