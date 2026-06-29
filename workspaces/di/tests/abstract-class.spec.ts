import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createInjector } from "../src/create-injector.ts";
import { Injectable } from "../src/injectable.decorator.ts";
import { RootInjector } from "../src/root-injector.ts";
import { InjectionToken } from "../src/injection-token.ts";

describe("Abstract Type Support", () => {
    it("Should allow abstract class as provider token with useClass strategy", () => {
        abstract class BaseService {
            abstract getValue(): string;
        }

        @Injectable.injector()
        class ConcreteService extends BaseService {
            getValue() {
                return "concrete";
            }
        }

        const injector = createInjector({
            providers: [
                {
                    token: BaseService,
                    useClass: ConcreteService,
                },
            ],
        });

        const instance = injector.get(BaseService);
        expect(instance).toBeInstanceOf(ConcreteService);
        expect(instance?.getValue()).toBe("concrete");
    });

    it("Should allow abstract class as provider token with useValue strategy", () => {
        abstract class BaseConfig {
            abstract getConfig(): { value: string };
        }

        class ConcreteConfig extends BaseConfig {
            getConfig() {
                return { value: "config-value" };
            }
        }

        const configInstance = new ConcreteConfig();
        const injector = createInjector({
            providers: [
                {
                    token: BaseConfig,
                    useValue: configInstance,
                },
            ],
        });

        const instance = injector.get(BaseConfig);
        expect(instance).toBe(configInstance);
        expect(instance?.getConfig()).toEqual({ value: "config-value" });
    });

    it("Should allow abstract class as provider token with factory strategy", () => {
        abstract class BaseFactory {
            abstract create(): string;
        }

        class ConcreteFactory extends BaseFactory {
            create() {
                return "factory-result";
            }
        }

        const injector = createInjector({
            providers: [
                {
                    token: BaseFactory,
                    factory: () => new ConcreteFactory(),
                },
            ],
        });

        const instance = injector.get(BaseFactory);
        expect(instance).toBeInstanceOf(ConcreteFactory);
        expect(instance?.create()).toBe("factory-result");
    });

    it("Should allow abstract class as provider token with useExisting strategy", () => {
        abstract class BaseService {
            abstract getValue(): string;
        }

        @Injectable.injector()
        class ConcreteService extends BaseService {
            getValue() {
                return "concrete";
            }
        }

        const injector = createInjector({
            providers: [
                ConcreteService,
                {
                    token: BaseService,
                    useExisting: ConcreteService,
                },
            ],
        });

        const instance = injector.get(BaseService);
        expect(instance).toBeInstanceOf(ConcreteService);
        expect(instance?.getValue()).toBe("concrete");
    });

    it("Should support multi-providers with abstract base class", () => {
        abstract class Handler {
            abstract handle(): string;
        }

        @Injectable.injector()
        class HandlerA extends Handler {
            handle() {
                return "A";
            }
        }

        @Injectable.injector()
        class HandlerB extends Handler {
            handle() {
                return "B";
            }
        }

        const HANDLERS = new InjectionToken<Handler[]>("HANDLERS");

        const injector = createInjector({
            providers: [
                { token: HANDLERS, useClass: HandlerA, multi: true },
                { token: HANDLERS, useClass: HandlerB, multi: true },
            ],
        });

        const handlers = injector.get(HANDLERS);
        expect(handlers?.length).toBe(2);
        expect(handlers?.[0].handle()).toBe("A");
        expect(handlers?.[1].handle()).toBe("B");
    });

    it("Should allow abstract class as token with dependency injection", () => {
        abstract class BaseService {
            abstract getValue(): string;
        }

        @Injectable.injector()
        class Dependency {
            getValue() {
                return "dependency";
            }
        }

        @Injectable.injector()
        class ConcreteService extends BaseService {
            public constructor(public readonly dep: Dependency) {
                super();
            }

            getValue() {
                return `concrete-${this.dep.getValue()}`;
            }
        }

        const injector = createInjector({
            providers: [
                Dependency,
                {
                    token: BaseService,
                    useClass: ConcreteService,
                },
            ],
        });

        const instance = injector.get(BaseService) as ConcreteService;
        expect(instance).toBeInstanceOf(ConcreteService);
        expect(instance.getValue()).toBe("concrete-dependency");
        expect(instance.dep).toBeInstanceOf(Dependency);
    });

    it("Should work with RootInjector when abstract class is global", () => {
        abstract class GlobalService {
            abstract getValue(): string;
        }

        @Injectable()
        class ConcreteGlobalService extends GlobalService {
            getValue() {
                return "global";
            }
        }

        const instance = RootInjector.get(ConcreteGlobalService);
        expect(instance).toBeInstanceOf(ConcreteGlobalService);

        // The abstract class itself is not registered, but we can use it as a token
        // with a custom provider
        const injector = createInjector({
            providers: [
                {
                    token: GlobalService,
                    useClass: ConcreteGlobalService,
                },
            ],
        });

        const abstractInstance = injector.get(GlobalService);
        expect(abstractInstance).toBeInstanceOf(ConcreteGlobalService);
    });
});
