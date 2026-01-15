import { describe, it } from "@std/testing/bdd";

import { expect } from "@std/expect";
import { createInjector } from "../src/create-injector.ts";
import { inject } from "../src/injections.ts";
import { Injectable } from "../src/injectable.decorator.ts";

describe("AsyncContext", () => {
    describe("Basic usage", () => {
        it("Should work after async delay if supported", async () => {
            const TOKEN = "TOKEN";

            @Injectable()
            class MyService {
                public readonly value = inject(TOKEN);
            }

            const injector = createInjector({
                providers: [
                    { token: TOKEN, useValue: "resolved" },
                    MyService
                ],
            });

            await injector.runAsync(async () => {
                const value1 = inject(TOKEN);
                expect(value1).toBe("resolved");

                await new Promise(resolve => setTimeout(resolve, 10));

                // This currently fails if another injector.runAsync was called in between,
                // or simply because currentInjector was reset by finally block of runAsync
                // Wait, runAsync DOES reset it.

                const value2 = inject(TOKEN);
                expect(value2).toBe("resolved");
            });
        })
    })
    describe("Overlap", () => {
        it("Should fail when multiple async contexts overlap", async () => {
            const injector1 = createInjector({
                name: "Injector1",
                providers: [{ token: "T", useValue: "V1" }],
            });
            const injector2 = createInjector({
                name: "Injector2",
                providers: [{ token: "T", useValue: "V2" }],
            });

            const results: string[] = [];

            const p1 = injector1.runAsync(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                results.push(inject<string>("T"));
            });

            const p2 = injector2.runAsync(async () => {
                await new Promise(resolve => setTimeout(resolve, 20));
                results.push(inject<string>("T"));
            });

            await Promise.all([p1, p2]);

            expect(results).toEqual(["V1", "V2"]);
        })
    })
})
