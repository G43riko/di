import { describe, it } from "@std/testing/bdd";
import { createInjector } from "../src/create-injector.ts";
import { Injectable } from "../src/injectable.decorator.ts";
import { expect } from "@std/expect";
import type { SimpleInjector } from "../src/injector.ts";
import { inject } from "../src/injections.ts";
import { RootInjector } from "../src/root-injector.ts";


@Injectable()
class ServiceA {
    public readonly serviceB = inject(ServiceB)
}
@Injectable()
class ServiceB {
    public readonly serviceA = inject(ServiceA)
}
/*
@Injectable()
class ServiceC {
    public constructor(
        public readonly serviceD: ServiceD,
    ) { }
}
@Injectable()
class ServiceD {
    public constructor(
        public readonly serviceC: ServiceC,
    ) { }
}
    */
describe("CircularDependency", () => {
    describe("inject", () => {
        it("Should throw error on cicular dependency", () => {
            expect(() => RootInjector.get(ServiceA)).toThrow()
            expect(() => RootInjector.get(ServiceB)).toThrow()
        })
    })
    /*
    describe("constructor inject", () => {
        it("Should throw error on cicular dependency", () => {
            expect(() => RootInjector.get(ServiceC)).toThrow()
            expect(() => RootInjector.get(ServiceD)).toThrow()
        })
    })
    */
})