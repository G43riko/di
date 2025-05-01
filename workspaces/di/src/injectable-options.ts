import type { InjectableParams } from "./injectable.decorator.ts";
import type { Scope } from "./scope.ts";

export interface InjectableOptions extends InjectableParams {
    readonly scope: Scope;
}
