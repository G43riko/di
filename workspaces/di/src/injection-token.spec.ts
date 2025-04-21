import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createInjector } from "./create-injector.ts";
import { InjectionToken } from "./injection-token.ts";
describe("InjectionToken", () => {
    it("should return undefined if token without default value is requested", () => {
        const TOKEN = new InjectionToken("TEST0");
        const injector = createInjector({ providers: [] });
        expect(injector.get(TOKEN)).toBeUndefined();
    });
    it("should return undefined if token without default value is requested", () => {
        const TOKEN = new InjectionToken("TEST9", { required: true });
        const injector = createInjector({ providers: [] });
        expect(() => injector.get(TOKEN)).toThrow();
    });
    it("should provide default value if it is possible", () => {
        const TOKEN = new InjectionToken("TEST1", { defaultValue: 1 });
        const injector = createInjector({ providers: [] });
        expect(injector.get(TOKEN)).toBe(1);
    });
    it("should test injectionToken with value ", () => {
        const TOKEN = new InjectionToken("TEST2", { defaultValue: 1 });
        const injector = createInjector({
            providers: [
                { token: TOKEN, useValue: 2 },
            ],
        });
        expect(injector.get(TOKEN)).toBe(2);
    });
    it("should provide default function", () => {
        const TOKEN = new InjectionToken("TEST2", { defaultValue: () => -1 });
        const injector = createInjector({ providers: [] });
        expect(injector.get(TOKEN)).toBe(-1);
    });
    it("should test injectionToken with factory ", () => {
        const TOKEN = new InjectionToken("TEST3", { defaultValue: 1 });
        const injector = createInjector({
            providers: [
                { token: TOKEN, factory: () => 3 },
            ],
        });
        expect(injector.get(TOKEN)).toBe(3);
    });
    it("should provide class ", () => {
        const TOKEN = new InjectionToken("TEST3", { defaultValue: 1 });
        const injector = createInjector({
            providers: [
                { token: TOKEN, factory: () => 3 },
            ],
        });
        expect(injector.get(TOKEN)).toBe(3);
    });
});
