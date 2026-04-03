import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Errors } from "./errors.ts";
import { InjectionToken } from "./injection-token.ts";

class MyService {}

describe("Errors", () => {
    it("OUTSIDE_INJECTION_CONTEXT returns expected message", () => {
        expect(Errors.OUTSIDE_INJECTION_CONTEXT()).toBe("It is not in injection context");
    });

    it("CANNOT_REGISTER_MULTIPLE_TIMES formats class token correctly", () => {
        expect(Errors.CANNOT_REGISTER_MULTIPLE_TIMES(MyService)).toContain("MyService");
        expect(Errors.CANNOT_REGISTER_MULTIPLE_TIMES(MyService)).toContain("multiple times");
    });

    it("CANNOT_REGISTER_MULTIPLE_TIMES formats string token correctly", () => {
        expect(Errors.CANNOT_REGISTER_MULTIPLE_TIMES("MY_TOKEN")).toContain("MY_TOKEN");
    });

    it("CANNOT_FIND_TOKEN formats class token correctly", () => {
        expect(Errors.CANNOT_FIND_TOKEN(MyService)).toContain("MyService");
    });

    it("CANNOT_FIND_TOKEN formats InjectionToken correctly", () => {
        const token = new InjectionToken("MY_DEP");
        expect(Errors.CANNOT_FIND_TOKEN(token)).toContain("MY_DEP");
    });

    it("CANNOT_RESOLVE_PARAMS formats message with resolved params", () => {
        const msg = Errors.CANNOT_RESOLVE_PARAMS(MyService, [undefined, "resolved"]);
        expect(msg).toContain("MyService");
        expect(msg).toContain("?");
        expect(msg).toContain("resolved");
    });

    it("CANNOT_RESOLVE_PARAMS handles all-undefined params", () => {
        const msg = Errors.CANNOT_RESOLVE_PARAMS(MyService, [undefined, undefined]);
        expect(msg).toContain("?");
    });

    it("CIRCULAR_DEPENDENCY formats dependency chain", () => {
        class ServiceA {}
        class ServiceB {}
        const msg = Errors.CIRCULAR_DEPENDENCY([ServiceA, ServiceB, ServiceA]);
        expect(msg).toContain("ServiceA");
        expect(msg).toContain("ServiceB");
        expect(msg).toContain("->");
    });
});
