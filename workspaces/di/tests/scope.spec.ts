import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createInjector } from "../src/create-injector.ts";
import { Scope } from "../src/scope.ts";
import { InjectionToken } from "../src/injection-token.ts";
import { RootInjector } from "../src/root-injector.ts";

class ServiceGlobal { }
class ServiceInjector { }
class ServiceTransient { }

const tokenGlobal = new InjectionToken("global");
const tokenInjector = new InjectionToken("injector");
const tokenTransier = new InjectionToken("transier");
describe.skip("Scope", () => {
    describe("Should create TransierScope", () => {
        const injector = createInjector({
            providers: [
                { token: tokenTransier, useClass: ServiceTransient, scope: Scope.TRANSIENT },
            ],
        });
        const childInjector = createInjector({
            parentInjector: injector,
        });
        it("should test local injector", () => {
            const instaA = injector.get(tokenTransier);
            const instaB = injector.get(tokenTransier);
            const instaC = injector.get(tokenTransier);
            const instaD = childInjector.get(tokenTransier);

            expect(instaA).toBeInstanceOf(ServiceGlobal);
            expect(instaB).toBeInstanceOf(ServiceGlobal);
            expect(instaC).toBeInstanceOf(ServiceGlobal);
            expect(instaD).toBeInstanceOf(ServiceGlobal);

            expect(instaA).not.toBe(instaB);
            expect(instaB).not.toBe(instaC);
            expect(instaA).not.toBe(instaC);

            expect(instaD).not.toBe(instaA);
            expect(instaD).not.toBe(instaB);
            expect(instaD).not.toBe(instaC);
        });
    })
    describe("Should create GlobalScope", () => {
        const injector = createInjector({
            providers: [
                { token: tokenGlobal, useClass: ServiceGlobal, scope: Scope.GLOBAL },
            ],
        });
        const childInjector = createInjector({
            parentInjector: injector,
        });
        it("should test local injector", () => {
            expect(injector.get(tokenGlobal)).toBeInstanceOf(ServiceGlobal);
            expect(injector.get(tokenGlobal)).toBe(injector.get(tokenGlobal));
            expect(childInjector.get(tokenGlobal)).toBeInstanceOf(ServiceGlobal);
            expect(childInjector.get(tokenGlobal)).toBe(injector.get(tokenGlobal));

            
        });
        it("should check that service injected into local injector with global scope is available in RootInjector", () => {
            expect(RootInjector.get(tokenGlobal)).toBeInstanceOf(ServiceGlobal);
            expect(RootInjector.get(tokenGlobal)).toBe(injector.get(tokenGlobal));
            expect(RootInjector.get(tokenGlobal)).toBe(childInjector.get(tokenGlobal));
        });
    });
})