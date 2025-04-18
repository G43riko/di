import { createInjector, Injectable, RootInjector } from "@g43/di";
@Injectable.local()
class ServiceA {
    public readonly a = "PropA";

    public toString(): string {
        return `${this.constructor.name}[a: ${this.a}]`;
    }
}

@Injectable.local()
class ServiceB {
    public constructor(
        private readonly serviceA: ServiceA,
    ) {}

    public toString(): string {
        return `${this.constructor.name}[serviceA: ${this.serviceA}]`;
    }
}

// Only global services are in RootInjector

RootInjector.printDebug();

createInjector({
    providers: [ServiceA],
    name: "Injector with ServiceA",
}).printDebug();

createInjector({
    providers: [ServiceA, ServiceB],
    name: "Injector with ServiceA and ServiceB",
}).printDebug();
