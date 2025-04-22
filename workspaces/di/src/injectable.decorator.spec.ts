import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Injectable } from "./injectable.decorator.ts";
import { Scope } from "./scope.ts";
import { RootInjector } from "./root-injector.ts";
import { createInjector } from "./create-injector.ts";

describe("Injectable Decorator", () => {
    describe("Basic functionality", () => {
        it("should mark a class as injectable", () => {
            @Injectable()
            class TestService {}
            
            const instance = RootInjector.require(TestService);
            expect(instance).toBeInstanceOf(TestService);
        });
        
        it("should allow constructor injection", () => {
            @Injectable()
            class ServiceA {
                public value = "ServiceA";
            }
            
            @Injectable()
            class ServiceB {
                constructor(public serviceA: ServiceA) {}
            }
            
            const instance = RootInjector.require(ServiceB);
            expect(instance).toBeInstanceOf(ServiceB);
            expect(instance.serviceA).toBeInstanceOf(ServiceA);
            expect(instance.serviceA.value).toBe("ServiceA");
        });
    });
    
    describe("Scope variants", () => {
        it("should support default scope (GLOBAL)", () => {
            @Injectable()
            class GlobalService {
                public id = Math.random();
            }
            
            const injector1 = createInjector({});
            const injector2 = createInjector({});
            
            const instance1 = RootInjector.require(GlobalService);
            const instance2 = RootInjector.require(GlobalService);
            const instance3 = injector1.require(GlobalService);
            const instance4 = injector2.require(GlobalService);
            
            // All instances should be the same
            expect(instance1.id).toBe(instance2.id);
            expect(instance1.id).toBe(instance3.id);
            expect(instance1.id).toBe(instance4.id);
        });
        
        it("should support explicit GLOBAL scope", () => {
            @Injectable.global()
            class GlobalService {
                public id = Math.random();
            }
            
            const injector1 = createInjector({});
            const injector2 = createInjector({});
            
            const instance1 = RootInjector.require(GlobalService);
            const instance2 = RootInjector.require(GlobalService);
            const instance3 = injector1.require(GlobalService);
            const instance4 = injector2.require(GlobalService);
            
            // All instances should be the same
            expect(instance1.id).toBe(instance2.id);
            expect(instance1.id).toBe(instance3.id);
            expect(instance1.id).toBe(instance4.id);
        });
        
        it("should support INJECTOR scope", () => {
            @Injectable.injector()
            class InjectorService {
                public id = Math.random();
            }
            
            const injector1 = createInjector({
                providers: [InjectorService]
            });
            const injector2 = createInjector({
                providers: [InjectorService]
            });
            
            const instance1 = injector1.require(InjectorService);
            const instance2 = injector1.require(InjectorService);
            const instance3 = injector2.require(InjectorService);
            const instance4 = injector2.require(InjectorService);
            
            // Instances within the same injector should be the same
            expect(instance1.id).toBe(instance2.id);
            expect(instance3.id).toBe(instance4.id);
            
            // Instances from different injectors should be different
            expect(instance1.id).not.toBe(instance3.id);
        });
        
        it("should support TRANSIENT scope", () => {
            @Injectable.transient()
            class TransientService {
                public id = Math.random();
            }
            
            const injector = createInjector({
                providers: [TransientService]
            });
            
            const instance1 = injector.require(TransientService);
            const instance2 = injector.require(TransientService);
            
            // Each request should create a new instance
            expect(instance1).toBeInstanceOf(TransientService);
            expect(instance2).toBeInstanceOf(TransientService);
            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });
        
        it("should support scope via options parameter", () => {
            @Injectable({ scope: Scope.TRANSIENT })
            class TransientService {
                public id = Math.random();
            }
            
            const injector = createInjector({
                providers: [TransientService]
            });
            
            const instance1 = injector.require(TransientService);
            const instance2 = injector.require(TransientService);
            
            // Each request should create a new instance
            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });
    });
    
    describe("Decorator variants", () => {
        it("should support @Injectable()", () => {
            @Injectable()
            class TestService {}
            
            const instance = RootInjector.require(TestService);
            expect(instance).toBeInstanceOf(TestService);
        });
        
        it("should support @Injectable.global()", () => {
            @Injectable.global()
            class TestService {}
            
            const instance = RootInjector.require(TestService);
            expect(instance).toBeInstanceOf(TestService);
        });
        
        it("should support @Injectable.injector()", () => {
            @Injectable.injector()
            class TestService {}
            
            const injector = createInjector({
                providers: [TestService]
            });
            
            const instance = injector.require(TestService);
            expect(instance).toBeInstanceOf(TestService);
        });
        
        it("should support @Injectable.transient()", () => {
            @Injectable.transient()
            class TestService {}
            
            const injector = createInjector({
                providers: [TestService]
            });
            
            const instance = injector.require(TestService);
            expect(instance).toBeInstanceOf(TestService);
        });
    });
    
    describe("Edge cases", () => {
        it("should handle classes with no constructor parameters", () => {
            @Injectable()
            class NoParamsService {}
            
            const instance = RootInjector.require(NoParamsService);
            expect(instance).toBeInstanceOf(NoParamsService);
        });
        
        it("should handle classes with optional parameters", () => {
            @Injectable.global()
            class OptionalService {
                constructor() {}
            }
            
            const instance = RootInjector.require(OptionalService);
            expect(instance).toBeInstanceOf(OptionalService);
        });
        
        it("should preserve static properties and methods", () => {
            @Injectable()
            class StaticService {
                static staticProp = "static";
                static staticMethod() {
                    return "static method";
                }
            }
            
            const instance = RootInjector.require(StaticService);
            expect(instance).toBeInstanceOf(StaticService);
            expect(StaticService.staticProp).toBe("static");
            expect(StaticService.staticMethod()).toBe("static method");
        });
    });
});
