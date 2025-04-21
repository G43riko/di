import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Injectable } from "./injectable.decorator.ts";
import { createInjector } from "./create-injector.ts";
import { rootInjectorName } from "./config.ts";

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
