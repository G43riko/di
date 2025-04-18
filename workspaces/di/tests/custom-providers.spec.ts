import { describe, it } from "@std/testing/bdd";
import { createInjector } from "../src/create-injector.ts";
import { Injectable } from "../src/injectable.decorator.ts";
import { expect } from "@std/expect";
import { SimpleInjector } from "../src/injector.ts";

@Injectable()
class DepA {
    public readonly key = "PARAMS"
}
@Injectable.local()
class DepC {
    public readonly key = "VALUE"
}
class DepB {
    public readonly key = "AAAA"
}
const injector = createInjector({
    providers: [
        {
            token: "CUSTOM_TOKEN_VALUE",
            useValue: "CUSTOM_VALUE"
        },
        {
            token: "CUSTOM_CLASS_VALUE",
            useClass: DepB,
        },
        {
            token: "CUSTOM_TOKEN_FACTORY_NO_PARAMS",
            factory() {
                return "FACTORY_VALUE_NO_PARAMS"
            },
        },
        {
            token: "CUSTOM_TOKEN_FACTORY_PARAMS",
            deps: [DepA, DepC],
            factory(a: DepA, c: DepC) {
                return `FACTORY_${c.key}_${a.key}`
            },
        },
    ]
})

describe("CustomDecorators", () => {
    it("Should resolve all values", () => {
        expect(injector.get("CUSTOM_TOKEN_VALUE")).toBe("CUSTOM_VALUE")
        expect(injector.get("CUSTOM_CLASS_VALUE")).toBeInstanceOf(DepB)
        expect(injector.get("CUSTOM_TOKEN_FACTORY_NO_PARAMS")).toBe("FACTORY_VALUE_NO_PARAMS");

        expect(() => injector.get("CUSTOM_TOKEN_FACTORY_PARAMS")).toThrow();

        (injector as SimpleInjector).registerProvider(DepC);
        expect(injector.get("CUSTOM_TOKEN_FACTORY_PARAMS")).toBe("FACTORY_VALUE_PARAMS");

    })
})