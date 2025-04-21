import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
    getTokenFromProvider,
    isCustomProvider,
    isType,
    StringifyProviderToken,
    StringifyProviderType,
    validateCustomProvider,
} from "./types.ts";
import { InjectionToken } from "./injection-token.ts";

class MyService {}
class AnotherService {}

const dummyToken = Symbol("DummyToken");
const DummyClass = class {};

class MockInjectionToken<T = any> extends InjectionToken<T> {
    public constructor(desc: string) {
        super(desc);
    }

    public override toString(): string {
        return `InjectionToken(${this.name})`;
    }
}
describe("Types", () => {
    describe("validateCustomProvider", () => {
        it("throws if no provider or token", () => {
            expect(() => validateCustomProvider(undefined as any)).toThrow("Provider must have a valid token");
            expect(() => validateCustomProvider({} as any)).toThrow("Provider must have a valid token");
        });

        it("throws if multiple strategies are defined", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useClass: DummyClass,
                    useValue: 123,
                })
            ).toThrow(/exactly one strategy/);
        });

        it("throws if no strategy is defined", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                } as any)
            ).toThrow(/exactly one strategy/);
        });

        it("throws if scope is invalid", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useClass: DummyClass,
                    scope: "INVALID_SCOPE",
                } as any)
            ).toThrow(/'scope' must be a valid Scope enum value/);
        });

        it("throws if useClass is not a function", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useClass: 123,
                } as any)
            ).toThrow(/'useClass' must be a constructor/);
        });

        it("throws if factory is not a function", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    factory: 123,
                } as any)
            ).toThrow(/'factory' must be a function/);
        });

        it("throws if deps is not an array in factory", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    factory: () => {},
                    deps: "not-array",
                } as any)
            ).toThrow(/'deps' must be an array of tokens/);
        });

        it("throws if useExisting is same as token", () => {
            const token = "MyToken";
            expect(() =>
                validateCustomProvider({
                    token,
                    useExisting: token,
                } as any)
            ).toThrow(/cannot alias to itself/);
        });

        it("throws if useValue is undefined", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useValue: undefined,
                })
            ).toThrow(/'useValue' cannot be undefined/);
        });

        // ✅ Valid cases
        it("passes with a valid useClass provider", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useClass: DummyClass,
                })
            ).not.toThrow();
        });

        it("passes with a valid useValue provider", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useValue: 42,
                })
            ).not.toThrow();
        });

        it("passes with a valid factory provider and deps", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    factory: () => "hello",
                    deps: [],
                })
            ).not.toThrow();
        });

        it("passes with a valid useExisting provider", () => {
            expect(() =>
                validateCustomProvider({
                    token: dummyToken,
                    useExisting: Symbol("OtherToken"),
                })
            ).not.toThrow();
        });
    });
    describe("isType", () => {
        it("returns true for classes/functions", () => {
            expect(isType(MyService)).toBe(true);
            expect(isType(function () {})).toBe(true);
        });

        it("returns false for objects and primitives", () => {
            expect(isType({})).toBe(false);
            expect(isType(42)).toBe(false);
            expect(isType("hello")).toBe(false);
        });
    });

    describe("getTokenFromProvider", () => {
        it("returns the class if provider is a type", () => {
            expect(getTokenFromProvider(MyService)).toBe(MyService);
        });

        it("returns token from a custom provider", () => {
            const provider = { token: "MyToken", useValue: 123 };
            expect(getTokenFromProvider(provider)).toBe("MyToken");
        });
    });

    describe("StringifyProviderType", () => {
        it("returns class name if provider is a type", () => {
            expect(StringifyProviderType(MyService)).toBe("MyService");
        });

        it("stringifies value provider", () => {
            const provider = { token: "T", useValue: 42 };
            expect(StringifyProviderType(provider)).toBe("ValueProvider[42]");
        });

        it("stringifies existing provider", () => {
            const provider = { token: "T", useExisting: "S" };
            expect(StringifyProviderType(provider)).toBe("ExistingProvider[S]");
        });
        it("stringifies class provider", () => {
            const provider = { token: "T", useClass: AnotherService };
            expect(StringifyProviderType(provider)).toBe("ClassProvider[AnotherService]");
        });

        it("stringifies factory provider", () => {
            const factory = () => "yo";
            const provider = { token: "T", factory: () => "yo" };
            expect(StringifyProviderType(provider)).toBe(`FactoryProvider[${factory}]`);
        });

        it("throws on unknown provider", () => {
            expect(() => StringifyProviderType({ token: "T" } as any)).toThrow(/Unknown provider type/);
        });
    });

    describe("StringifyProviderToken", () => {
        it("returns class name if token is a type", () => {
            expect(StringifyProviderToken(MyService)).toBe("MyService");
        });

        it("returns injection token string", () => {
            const token = new MockInjectionToken("TestToken");
            expect(StringifyProviderToken(token)).toBe("InjectionToken(TestToken)");
        });

        it("returns string representation for string token", () => {
            expect(StringifyProviderToken("MyToken")).toBe("MyToken");
        });

        it("returns string representation for symbol token", () => {
            const token = Symbol("sym");
            expect(StringifyProviderToken(token)).toBe(String(token));
        });
    });

    describe("isCustomProvider", () => {
        it("returns true for useValue provider", () => {
            expect(isCustomProvider({ token: "T", useValue: 123 })).toBe(true);
        });

        it("returns true for useClass provider", () => {
            expect(isCustomProvider({ token: "T", useClass: MyService })).toBe(true);
        });

        it("returns true for useExisting provider", () => {
            expect(isCustomProvider({ token: "T", useExisting: "AAAA" })).toBe(true);
        });

        it("returns true for factory provider", () => {
            expect(isCustomProvider({ token: "T", factory: () => "hi" })).toBe(true);
        });

        it("returns false for provider with token as string", () => {
            expect(isCustomProvider({ token: "T" } as any)).toBe(false);
        });

        it("returns false for provider with token as function", () => {
            expect(isCustomProvider({ token: MyService } as any)).toBe(false);
        });

        it("returns false for invalid object", () => {
            expect(isCustomProvider({} as any)).toBe(false);
        });
    });
});
