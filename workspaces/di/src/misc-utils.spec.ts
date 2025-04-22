import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { GAssertRequire, assignProperty } from "./misc-utils.ts";

describe("Misc Utils", () => {
    describe("GAssertRequire", () => {
        it("should return the value if it's not null or undefined", () => {
            expect(GAssertRequire("test")).toBe("test");
            expect(GAssertRequire(123)).toBe(123);
            expect(GAssertRequire(0)).toBe(0);
            expect(GAssertRequire(false)).toBe(false);
            expect(GAssertRequire({})).toEqual({});
            expect(GAssertRequire([])).toEqual([]);
        });

        it("should throw an error if the value is null", () => {
            expect(() => GAssertRequire(null)).toThrow();
        });

        it("should throw an error if the value is undefined", () => {
            expect(() => GAssertRequire(undefined)).toThrow();
        });

        it("should use the provided error message", () => {
            const customMessage = "Custom error message";
            try {
                GAssertRequire(null, customMessage);
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect((error as Error).message).toBe(customMessage);
            }
        });
    });

    describe("assignProperty", () => {
        it("should assign a property to an object", () => {
            const obj = {};
            const result = assignProperty(obj, "testProp", "testValue");

            // Should return the same object
            expect(result).toBe(obj);

            // Property should be set
            expect((obj as any).testProp).toBe("testValue");
        });

        it("should make the property non-enumerable", () => {
            const obj = {};
            assignProperty(obj, "testProp", "testValue");

            // Property should not be enumerable
            expect(Object.keys(obj)).not.toContain("testProp");
        });

        it("should make the property non-writable", () => {
            const obj = {};
            assignProperty(obj, "testProp", "testValue");

            // Attempt to modify the property
            try {
                (obj as any).testProp = "newValue";
            } catch (e) {
                // Some environments throw, others silently fail
            }

            // Property should still have the original value
            expect((obj as any).testProp).toBe("testValue");
        });

        it("should make the property non-configurable", () => {
            const obj = {};
            assignProperty(obj, "testProp", "testValue");

            // Attempt to delete the property
            try {
                delete (obj as any).testProp;
            } catch (e) {
                // Some environments throw, others silently fail
            }

            // Property should still exist
            expect((obj as any).testProp).toBe("testValue");
        });

        it("should work with symbol properties", () => {
            const obj = {};
            const symbol = Symbol("test");
            assignProperty(obj, symbol, "testValue");

            // Property should be set
            expect((obj as any)[symbol]).toBe("testValue");
        });

        it("should work with existing objects", () => {
            const obj = { existingProp: "existingValue" };
            assignProperty(obj, "testProp", "testValue");

            // Existing property should be unchanged
            expect(obj.existingProp).toBe("existingValue");

            // New property should be set
            expect((obj as any).testProp).toBe("testValue");
        });
    });
});
