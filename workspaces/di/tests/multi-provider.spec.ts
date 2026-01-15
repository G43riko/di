import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createInjector } from "../src/create-injector.ts";
import { InjectionToken } from "../src/injection-token.ts";

describe("MultiProvider", () => {
    it("Should test basic usage", () => {
        const COLORS = new InjectionToken<string[]>("COLORS");
        const injector = createInjector({
            providers: [
                { token: COLORS, useValue: "red", multi: true },
                { token: COLORS, useValue: "blue", multi: true },
            ],
        });

        const colors = injector.get(COLORS);
        expect(colors).toEqual(["red", "blue"]);
    });

    it("Shoould test providers with classes", () => {
        abstract class Handler {
            abstract handle(): string;
        }

        class HandlerA extends Handler {
            handle() {
                return "A";
            }
        }

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
    it("Shoult throw error if not all providers have multi flag set to true", () => {
        const COLORS = new InjectionToken<string[]>("COLORS");
        expect(() =>
            createInjector({
                providers: [
                    { token: COLORS, useValue: "red", multi: true },
                    { token: COLORS, useValue: "blue" },
                ],
            })
        ).toThrow("multiple times");
    });
});
