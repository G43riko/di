import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
    getTokenFromProvider,
    isCustomProvider,
    isType,
    StringifyProviderToken,
    StringifyProviderType,
} from "./types.ts";
import { InjectionToken } from "./injection-token.ts";

class MyService {}
class AnotherService {}

class MockInjectionToken<T = any> extends InjectionToken<T> {
    public constructor(desc: string) {
        super(desc);
    }

    public override toString(): string {
        return `InjectionToken(${this.name})`;
    }
}
describe("Types", () => {
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

        it("stringifies class provider", () => {
            const provider = { token: "T", useClass: AnotherService };
            expect(StringifyProviderType(provider)).toBe("ClassProvider[AnotherService]");
        });

        it("stringifies factory provider", () => {
            const factory = () => "yo";
            const provider = { token: "T", factory };
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

        it("returns true for factory provider", () => {
            expect(isCustomProvider({ token: "T", factory: () => "hi" })).toBe(true);
        });

        it("returns true for provider with token as string", () => {
            expect(isCustomProvider({ token: "T" } as any)).toBe(true);
        });

        it("returns true for provider with token as function", () => {
            expect(isCustomProvider({ token: MyService } as any)).toBe(true);
        });

        it("returns false for invalid object", () => {
            expect(isCustomProvider({} as any)).toBe(false);
        });
    });
});
