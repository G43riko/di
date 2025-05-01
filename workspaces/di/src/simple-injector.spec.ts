import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { SimpleInjector } from "./simple-injector.ts";
import { Injectable } from "./injectable.decorator.ts";
import { InjectionToken } from "./injection-token.ts";
import { inject } from "./injections.ts";
import { Scope } from "./scope.ts";

describe("SimpleInjector", () => {
    describe("Basic dependency injection", () => {
        @Injectable()
        class ServiceA {
            public value = "ServiceA";
        }

        @Injectable()
        class ServiceB {
            constructor(public serviceA: ServiceA) {}
            public getValue() {
                return this.serviceA.value;
            }
        }

        it("should register and resolve a simple provider", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);

            const serviceA = injector.require(ServiceA);
            expect(serviceA).toBeInstanceOf(ServiceA);
            expect(serviceA.value).toBe("ServiceA");
        });

        it("should resolve dependencies automatically", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider(ServiceB);

            const serviceB = injector.require(ServiceB);
            expect(serviceB).toBeInstanceOf(ServiceB);
            expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
            expect(serviceB.getValue()).toBe("ServiceA");
        });

        it("should throw when a dependency is missing", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceB);

            expect(() => injector.require(ServiceB)).toThrow();
        });

        it("should return undefined for missing tokens with get()", () => {
            const injector = new SimpleInjector();

            expect(injector.get(ServiceA)).toBeUndefined();
        });

        it("should throw for missing tokens with require()", () => {
            const injector = new SimpleInjector();

            expect(() => injector.require(ServiceA)).toThrow();
        });
    });

    describe("Custom providers", () => {
        @Injectable()
        class ServiceA {
            public value = "ServiceA";
        }

        @Injectable()
        class ServiceB {
            constructor(public value: string) {}
        }

        @Injectable()
        class ServiceC {
            constructor(public readonly serviceA: ServiceA) {}
        }

        const TOKEN = new InjectionToken<string>("token");

        it("should support value providers", () => {
            const injector = new SimpleInjector();
            injector.registerProvider({
                token: TOKEN,
                useValue: "test-value",
            });

            const value = injector.require(TOKEN);
            expect(value).toBe("test-value");
        });

        it("should support class providers", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider({
                token: ServiceC,
                useClass: ServiceC,
            });

            expect(() => injector.registerProvider(ServiceC)).toThrow();

            const serviceC = injector.require(ServiceC);

            expect(serviceC).toBeInstanceOf(ServiceC);
            expect(serviceC.serviceA).toBeInstanceOf(ServiceA);
        });

        it("should support factory providers", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider({
                token: ServiceB,
                factory: (serviceA: ServiceA) => new ServiceB(serviceA.value),
                deps: [ServiceA],
            });

            const serviceB = injector.require(ServiceB);
            expect(serviceB).toBeInstanceOf(ServiceB);
            expect(serviceB.value).toBe("ServiceA");
        });

        it("should support existing providers", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider({
                token: TOKEN,
                useExisting: ServiceA,
            });

            const value = injector.require(TOKEN);
            expect(value).toBeInstanceOf(ServiceA);
            expect(value).toBe(injector.require(ServiceA));
        });
    });

    describe("Hierarchical injection", () => {
        @Injectable()
        class ServiceA {
            public value = "ServiceA";
        }

        @Injectable()
        class ServiceB {
            public value = "ServiceB";
        }

        it("should resolve from parent injector", () => {
            const parentInjector = new SimpleInjector();
            parentInjector.registerProvider(ServiceA);

            const childInjector = new SimpleInjector(parentInjector);
            childInjector.registerProvider(ServiceB);

            const serviceA = childInjector.require(ServiceA);
            const serviceB = childInjector.require(ServiceB);

            expect(serviceA).toBeInstanceOf(ServiceA);
            expect(serviceB).toBeInstanceOf(ServiceB);
        });

        it("should override parent providers", () => {
            const parentInjector = new SimpleInjector();
            parentInjector.registerProvider(ServiceA);

            const childInjector = new SimpleInjector(parentInjector);
            childInjector.registerProvider({
                token: ServiceA,
                useValue: { value: "OverriddenServiceA" },
            });

            const serviceA = childInjector.require(ServiceA);
            expect(serviceA.value).toBe("OverriddenServiceA");

            // Parent injector should still have the original
            const parentServiceA = parentInjector.require(ServiceA);
            expect(parentServiceA.value).toBe("ServiceA");
        });

        it("should respect ignoreParent flag", () => {
            const parentInjector = new SimpleInjector();
            parentInjector.registerProvider(ServiceA);

            const childInjector = new SimpleInjector(parentInjector);

            expect(childInjector.get(ServiceA)).toBeInstanceOf(ServiceA);
            expect(childInjector.get(ServiceA, true)).toBeUndefined();
        });
    });

    describe("Injection context", () => {
        @Injectable()
        class ServiceA {
            public value = "ServiceA";
        }

        @Injectable()
        class ServiceB {
            constructor() {}

            public getServiceA() {
                return inject(ServiceA);
            }
        }

        it("should support run() for injection context", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider(ServiceB);

            const serviceB = injector.require(ServiceB);

            // Should throw outside an injection context
            expect(() => serviceB.getServiceA()).toThrow();

            // Should work inside an injection context
            const serviceA = injector.run(() => serviceB.getServiceA());
            expect(serviceA).toBeInstanceOf(ServiceA);
        });

        it("should support runAsync() for async injection context", async () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);

            const asyncResult = await injector.runAsync(async () => {
                const serviceA = inject(ServiceA);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                return serviceA.value;
            });

            expect(asyncResult).toBe("ServiceA");
        });
    });

    describe("InjectionToken default values", () => {
        const TOKEN_WITH_VALUE = new InjectionToken<string>("token-with-value", {
            defaultValue: "default-value",
        });

        const TOKEN_WITH_FACTORY = new InjectionToken<string>("token-with-factory", {
            defaultValue: () => "factory-value",
        });

        it("should use default value when token is not provided", () => {
            const injector = new SimpleInjector();

            const value = injector.get(TOKEN_WITH_VALUE);
            expect(value).toBe("default-value");
        });

        it("should use factory default value when token is not provided", () => {
            const injector = new SimpleInjector();

            const value = injector.get(TOKEN_WITH_FACTORY);
            expect(value).toBe("factory-value");
        });

        it("should prefer registered value over default", () => {
            const injector = new SimpleInjector();
            injector.registerProvider({
                token: TOKEN_WITH_VALUE,
                useValue: "registered-value",
            });

            const value = injector.require(TOKEN_WITH_VALUE);
            expect(value).toBe("registered-value");
        });
    });

    describe("resolveAll", () => {
        @Injectable()
        class ServiceA {}

        @Injectable()
        class ServiceB {
            constructor(public serviceA: ServiceA) {}
        }

        @Injectable()
        class ServiceC {
            constructor(public serviceB: ServiceB) {}
        }

        it("should resolve all registered tokens", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider(ServiceB);

            const resolved = injector.resolveAll();
            expect(resolved.length).toBe(2);
            expect(resolved).toContain(ServiceA);
            expect(resolved).toContain(ServiceB);
        });

        it("should throw on unresolvable dependencies by default", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceB); // Missing ServiceA dependency

            expect(() => injector.resolveAll()).toThrow();
        });

        it("should skip unresolvable dependencies with allowUnresolved=true", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(ServiceA);
            injector.registerProvider(ServiceB);
            injector.registerProvider(ServiceC);

            const resolved = injector.resolveAll(true);
            expect(resolved.length).toBe(3);
            expect(resolved).toContain(ServiceA);
            expect(resolved).toContain(ServiceB);
            expect(resolved).toContain(ServiceC);
        });
    });

    describe("Transient providers", () => {
        @Injectable({ scope: Scope.TRANSIENT })
        class TransientService {
            public id = Math.random();
        }

        @Injectable()
        class SingletonService {
            public id = Math.random();
        }

        it("should create new instance for each transient resolution", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(TransientService);

            const instance1 = injector.require(TransientService);
            const instance2 = injector.require(TransientService);

            expect(instance1).toBeInstanceOf(TransientService);
            expect(instance2).toBeInstanceOf(TransientService);
            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });

        it("should reuse instance for singleton resolution", () => {
            const injector = new SimpleInjector();
            injector.registerProvider(SingletonService);

            const instance1 = injector.require(SingletonService);
            const instance2 = injector.require(SingletonService);

            expect(instance1).toBeInstanceOf(SingletonService);
            expect(instance2).toBeInstanceOf(SingletonService);
            expect(instance1).toBe(instance2);
            expect(instance1.id).toBe(instance2.id);
        });
    });
});
