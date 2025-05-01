import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getScope, isGlobalProviderType, isTransientProviderType, registerInjectable } from "./injectable.holder.ts";
import { Scope } from "./scope.ts";
import { Injectable } from "./injectable.decorator.ts";

describe("Injectable Holder", () => {
    describe("registerInjectable", () => {
        it("should register a class as injectable", () => {
            class TestService {}

            registerInjectable(TestService, { scope: Scope.GLOBAL });

            // If registration is successful, getScope should return the registered scope
            expect(getScope(TestService)).toBe(Scope.GLOBAL);
        });

        it("should register with different scopes", () => {
            class GlobalService {}
            class TransientService {}
            class InjectorService {}

            registerInjectable(GlobalService, { scope: Scope.GLOBAL });
            registerInjectable(TransientService, { scope: Scope.TRANSIENT });
            registerInjectable(InjectorService, { scope: Scope.INJECTOR });

            expect(getScope(GlobalService)).toBe(Scope.GLOBAL);
            expect(getScope(TransientService)).toBe(Scope.TRANSIENT);
            expect(getScope(InjectorService)).toBe(Scope.INJECTOR);
        });
    });

    describe("getScope", () => {
        it("should return the scope of a registered class", () => {
            class TestService {}

            registerInjectable(TestService, { scope: Scope.GLOBAL });

            expect(getScope(TestService)).toBe(Scope.GLOBAL);
        });

        it("should return the scope from a custom provider", () => {
            const customProvider = {
                token: "token",
                useValue: "value",
                scope: Scope.TRANSIENT,
            };

            expect(getScope(customProvider)).toBe(Scope.TRANSIENT);
        });

        it("should return default scope for unregistered types", () => {
            class UnregisteredService {}

            // Default scope is INJECTOR according to config.ts
            expect(getScope(UnregisteredService)).toBe(Scope.INJECTOR);
        });

        it("should return default scope for custom providers without scope", () => {
            const customProvider = {
                token: "token",
                useValue: "value",
            };

            // Default scope is INJECTOR according to config.ts
            expect(getScope(customProvider)).toBe(Scope.INJECTOR);
        });
    });

    describe("isTransientProviderType", () => {
        it("should return true for transient providers", () => {
            class TransientService {}

            registerInjectable(TransientService, { scope: Scope.TRANSIENT });

            expect(isTransientProviderType(TransientService)).toBe(true);
        });

        it("should return false for non-transient providers", () => {
            class GlobalService {}
            class InjectorService {}

            registerInjectable(GlobalService, { scope: Scope.GLOBAL });
            registerInjectable(InjectorService, { scope: Scope.INJECTOR });

            expect(isTransientProviderType(GlobalService)).toBe(false);
            expect(isTransientProviderType(InjectorService)).toBe(false);
        });

        it("should return false for custom providers without transient scope", () => {
            const customProvider = {
                token: "token",
                useValue: "value",
            };

            expect(isTransientProviderType(customProvider)).toBe(false);
        });

        it("should return true for custom providers with transient scope", () => {
            const customProvider = {
                token: "token",
                useValue: "value",
                scope: Scope.TRANSIENT,
            };

            expect(isTransientProviderType(customProvider)).toBe(true);
        });
    });

    describe("isGlobalProviderType", () => {
        it("should return true for global providers", () => {
            class GlobalService {}

            registerInjectable(GlobalService, { scope: Scope.GLOBAL });

            expect(isGlobalProviderType(GlobalService)).toBe(true);
        });

        it("should return false for non-global providers", () => {
            class TransientService {}
            class InjectorService {}

            registerInjectable(TransientService, { scope: Scope.TRANSIENT });
            registerInjectable(InjectorService, { scope: Scope.INJECTOR });

            expect(isGlobalProviderType(TransientService)).toBe(false);
            expect(isGlobalProviderType(InjectorService)).toBe(false);
        });

        it("should return true for custom providers without scope (default is GLOBAL)", () => {
            const customProvider = {
                token: "token",
                useValue: "value",
            };

            expect(isGlobalProviderType(customProvider)).toBe(false);
        });

        it("should return true for custom providers with global scope", () => {
            const customProvider = {
                token: "token",
                useValue: "value",
                scope: Scope.GLOBAL,
            };

            expect(isGlobalProviderType(customProvider)).toBe(true);
        });
    });

    describe("Integration with Injectable decorator", () => {
        it("should correctly register classes decorated with @Injectable()", () => {
            @Injectable()
            class TestService {}

            expect(getScope(TestService)).toBe(Scope.GLOBAL);
            expect(isGlobalProviderType(TestService)).toBe(true);
            expect(isTransientProviderType(TestService)).toBe(false);
        });

        it("should correctly register classes with explicit scope", () => {
            @Injectable({ scope: Scope.TRANSIENT })
            class TransientService {}

            expect(getScope(TransientService)).toBe(Scope.TRANSIENT);
            expect(isTransientProviderType(TransientService)).toBe(true);
            expect(isGlobalProviderType(TransientService)).toBe(false);
        });

        it("should correctly register classes with scope-specific decorators", () => {
            @Injectable.global()
            class GlobalService {}

            @Injectable.transient()
            class TransientService {}

            @Injectable.injector()
            class InjectorService {}

            expect(getScope(GlobalService)).toBe(Scope.GLOBAL);
            expect(getScope(TransientService)).toBe(Scope.TRANSIENT);
            expect(getScope(InjectorService)).toBe(Scope.INJECTOR);

            expect(isGlobalProviderType(GlobalService)).toBe(true);
            expect(isTransientProviderType(TransientService)).toBe(true);
            expect(isGlobalProviderType(InjectorService)).toBe(false);
            expect(isTransientProviderType(InjectorService)).toBe(false);
        });
    });
});
