# Codebase Review: @g43/di — Dependency Injection Library

Analysis of the Deno TypeScript DI library.

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Bugs & Logic Errors](#2-bugs--logic-errors)
3. [Missing Features / Incomplete Code](#3-missing-features--incomplete-code)
4. [Code Quality & Consistency](#4-code-quality--consistency)
5. [Type Safety](#5-type-safety)
6. [Security & Robustness](#6-security--robustness)
7. [Missing Tests (inferred)](#7-missing-tests-inferred)
8. [Documentation Issues](#8-documentation-issues)
9. [Step-by-Step Fix Plan](#9-step-by-step-fix-plan)

---

## 1. Critical Issues

### 1.1 `SimpleInjector.get` — `undefined` resolution is ambiguous with "not found"

**File:** `src/simple-injector.ts`

```ts
public get<T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
    // ...
    if ("cachedResolution" in entry) {
        return entry.cachedResolution as TypeResolution<T>;
    }
```

If a `ValueCustomProvider` is registered with `useValue: undefined`, the value is cached correctly but
`"cachedResolution" in entry` is `true` while `entry.cachedResolution` is `undefined`. This is fine.

However, on the **first resolution** of `useValue: undefined`:

```ts
const newResolution = this.resolveEntry(entry);
// newResolution === undefined

if (!isTransient) {
    // cachedResolution is set to undefined — correct
}
return newResolution as TypeResolution<T>; // returns undefined
```

The **caller** now receives `undefined` and thinks the token was not found. `require()` will throw. Any `get()` caller
will try the parent injector unnecessarily. Registering `useValue: undefined` is explicitly validated against
(`validateCustomProvider` throws `'useValue' cannot be undefined`), but a `factory` returning `undefined` or a
`useClass` constructor whose instance evaluates to falsy would hit the same ambiguity.

**Fix:** Use a sentinel / `Option<T>` wrapper internally:

```ts
const NOT_FOUND: unique symbol = Symbol("DI_NOT_FOUND");

// Store resolutions as { value: T } to distinguish undefined from missing
interface CachedEntry<T> {
    readonly value: TypeResolution<T> | TypeResolution<T>[];
}
```

Or document clearly that `undefined` is forbidden as a resolved value and add a runtime guard in `resolveEntry`.

---

### 1.2 `_dependencyResolutionStack` is shared across concurrent `get()` calls

**File:** `src/simple-injector.ts`

```ts
private readonly _dependencyResolutionStack: ProviderToken[] = [];
```

The stack is an instance-level mutable array. If two async resolutions run concurrently on the **same injector** (which
is plausible via `runAsync`), they share this stack and can produce false circular-dependency errors or miss real ones.

**Fix:** Pass the stack as a parameter through the resolution chain instead of storing it on the instance:

```ts
public get<T>(token: ProviderToken<T>, ignoreParent = false, _stack: ProviderToken[] = []): TypeResolution<T> | undefined {
    if (_stack.includes(token)) {
        throw new Error(Errors.CIRCULAR_DEPENDENCY([..._stack, token]));
    }
    // ...
    _stack.push(token);
    try {
        return this.resolveEntry(entry, _stack);
    } finally {
        _stack.pop();
    }
}
```

Propagate `_stack` to all recursive calls (`resolveParameters`, `resolveCustomProvider`, `resolveTypeProvider`).

---

### 1.3 `RootInjector` is a module-level singleton — test pollution across test files

**File:** `src/root-injector.ts`

```ts
export const RootInjector: SimpleInjector = new RootInjectorImpl();
```

Because `RootInjector` is a module singleton, providers registered in one test file's `@Injectable()` decorators persist
into all subsequent test files (decorators run at class definition time, before any test setup). There is no public
`reset()` / `clear()` API.

**Fix:** Add an `@internal` reset method for test use:

```ts
/** @internal For testing only. Clears all registered providers. */
public _reset(): void {
    this._providerEntries.clear();
}
```

And export a test helper:

```ts
// src/testing.ts (new file, excluded from publish)
export function resetRootInjector(): void {
    (RootInjector as any)._reset();
}
```

---

### 1.4 `validateCustomProvider` — `useValue: false` and `useValue: 0` are accepted but `useValue: null` is not guarded

**File:** `src/types.ts`

```ts
if (isValueProvider(provider) && provider.useValue === undefined) {
    throw new Error(`'useValue' cannot be undefined`);
}
```

This only rejects `undefined`. Providing `null` is silently accepted, then when resolved the `undefined` check in
`get()` reads it as `null` (not `undefined`) so it works — but `null` can flow through the parent chain check:

```ts
if (parentResolution !== undefined) {
    return parentResolution; // null passes this check
}
```

While technically correct, this is a footgun. Consider documenting or guarding:

```ts
if (isValueProvider(provider) && provider.useValue == null) {
    throw new Error(`'useValue' cannot be null or undefined`);
}
```

Or accept `null` explicitly and update the `TypeResolution` type accordingly.

---

## 2. Bugs & Logic Errors

### 2.1 `RootInjectorImpl.get` — throws for string and symbol tokens

**File:** `src/root-injector.ts`

```ts
public override get<T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
    // ...
    if (isType(token)) { return this.resolveTypeToken(token); }
    if (token instanceof InjectionToken) { return this.resolveInjectionToken(token); }

    throw new Error("Unsupported token type for resolution");
}
```

If a string or symbol token is registered via `RootInjector.registerProvider({ token: 'MY_TOKEN', useValue: 42 })` and
then retrieved with `RootInjector.get('MY_TOKEN')`, the code reaches the `throw` even though the token was registered
and cached. The `super.get(token)` at the top should have returned the cached value for known tokens, but only works
**after** the first resolution. On first call: the value isn't cached yet → `super.get` returns `undefined` → falls
through to the `throw`.

**Fix:** Add a string/symbol branch before throwing:

```ts
// After the InjectionToken check:
if (typeof token === "string" || typeof token === "symbol") {
    return undefined; // not found in root; no auto-registration possible
}
throw new Error("Unsupported token type for resolution");
```

---

### 2.2 `createInjector` — global providers are registered in `RootInjector` but not the local injector, silently

**File:** `src/create-injector.ts`

```ts
function registerProviders(injector: SimpleInjector, providers: readonly ProviderType<unknown>[]): void {
    for (const provider of providers) {
        if (isGlobalProviderType(provider)) {
            RootInjector.registerProvider(provider); // registered globally
        } else {
            injector.registerProvider(provider); // registered locally
        }
    }
}
```

If a user passes a global-scoped class in `providers`, it silently registers in `RootInjector` instead of `injector`.
The user gets no feedback, and querying `injector.get(GlobalService)` works (via parent chain) but
`injector._providerEntries` doesn't contain it — which can surprise users calling `injector.resolveAll()` or
`injector.printDebug()`.

**Fix:** At minimum, emit a warning:

```ts
if (isGlobalProviderType(provider)) {
    console.warn(
        `[DI] Provider '${
            StringifyProviderType(provider)
        }' has GLOBAL scope and will be registered in RootInjector, not '${injector}'.`,
    );
    RootInjector.registerProvider(provider);
}
```

Or surface this as a `strictMode` error regardless of current strict setting.

---

### 2.3 `getResolvedConstructorParams` — resolves `undefined` params without checking which ones are unresolvable

**File:** `src/simple-injector.ts`

```ts
if (resolvedParams.some((param: TypeResolution) => typeof param === "undefined")) {
    throw new Error(Errors.CANNOT_RESOLVE_PARAMS(type, resolvedParams));
}
```

The check happens **after** `resolveParameters`, but `resolveParameters` already throws:

```ts
if (resolved === undefined) {
    throw new Error(`Failed to resolve parameter at index ${index}: ...`);
}
```

So the `some(undefined)` check in `getResolvedConstructorParams` is **dead code** — it can never be reached because
`resolveParameters` throws first. This creates false confidence that error handling is layered when it isn't.

**Fix:** Remove the redundant check in `getResolvedConstructorParams`, or make `resolveParameters` return a mixed array
and let the caller decide whether to throw.

---

### 2.4 `InjectionToken` — `defaultValue` factory runs in injector context but only when resolved through the injector cache miss

**File:** `src/simple-injector.ts`

```ts
// In get(), when there's no entry:
if (token instanceof InjectionToken && token.options?.defaultValue !== undefined) {
    return this.resolveInjectionTokenDefault(token.options?.defaultValue);
}
```

```ts
private resolveInjectionTokenDefault<T>(defaultValue: T | (() => T)): TypeResolution<T> {
    if (typeof defaultValue !== "function") {
        return defaultValue;
    }
    return runWithInjector(this, () => (defaultValue as any)());
}
```

The default value factory is called every time the token is requested and not registered (no caching). For expensive
factories this is a performance problem. For factories with side effects this is a correctness problem.

**Fix:** Cache the default-value resolution in the entry map on first use:

```ts
if (token instanceof InjectionToken && token.options?.defaultValue !== undefined) {
    const resolved = this.resolveInjectionTokenDefault(token.options.defaultValue);
    // cache it so subsequent calls don't re-invoke the factory
    this._providerEntries.set(token, {
        token,
        providerType: { token, useValue: resolved },
        cachedResolution: resolved,
    } as InjectorEntry<unknown>);
    return resolved as TypeResolution<T>;
}
```

---

### 2.5 `SimpleInjector.printDebug` — resolves all providers as a side effect

**File:** `src/simple-injector.ts`

```ts
public printDebug(): void {
    const debugData = Object.fromEntries(
        this._providerEntries.entries().map(([token]) => {
            return [StringifyProviderToken(token), String(this.get(token))];
        }),
    );
```

`this.get(token)` triggers instantiation of every provider that hasn't been resolved yet. This means calling
`printDebug()` on an injector **before** any services are used will eagerly create all instances, which defeats lazy
resolution and can cause unexpected side effects (e.g., database connections, file reads).

**Fix:** Only print metadata, not resolved values:

```ts
public printDebug(): void {
    const debugData = Object.fromEntries(
        this._providerEntries.entries().map(([token, entry]) => {
            const status = "cachedResolution" in entry ? `resolved: ${String(entry.cachedResolution)}` : "pending";
            return [StringifyProviderToken(token), status];
        }),
    );
    console.log(`Injector '${this.name ?? "SimpleInjector"}': ${JSON.stringify(debugData, null, 4)}`);
}
```

---

## 3. Missing Features / Incomplete Code

### 3.1 TODO: `enableInjectDecorator` config flag — documented but not implemented

**File:** `src/config.ts`

```ts
/**
 * TODO: add enableInjectDecorator
 */
export let strictMode = false;
```

The `inject()` function can be disabled via `enableInject`, but there is no equivalent for constructor parameter
injection via `@Inject()` decorator. The TODO has been there since the project started. Implement or remove the comment.

**Implementation sketch:**

```ts
// src/inject.decorator.ts  (new file)
import { InjectionToken } from "./injection-token.ts";
import type { ProviderToken } from "./types.ts";

const INJECT_METADATA_KEY = "DI:inject_tokens";

export function Inject<T>(token: ProviderToken<T>): ParameterDecorator {
    return (target, _propertyKey, parameterIndex) => {
        const existing: Map<number, ProviderToken> = Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) ?? new Map();
        existing.set(parameterIndex, token);
        Reflect.defineMetadata(INJECT_METADATA_KEY, existing, target);
    };
}

export function getInjectTokens(target: object): Map<number, ProviderToken> {
    return Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) ?? new Map();
}
```

Then in `getResolvedConstructorParams`, merge the `@Inject` overrides with `design:paramtypes`:

```ts
const injectTokens = getInjectTokens(type);
const params = constructorParamTypes.map((pt: ProviderToken, i: number) => injectTokens.get(i) ?? pt);
```

---

### 3.2 TODO: async injector — documented in README

**File:** `README.md`

```md
## TODO:

- [ ] async injector
```

`runAsync` exists but there is no `getAsync` or `resolveAsync` for providers that need to do async work during
initialization (e.g., connecting to a database). This is a common need.

**Minimal API sketch:**

```ts
// On SimpleInjector
public async getAsync<T>(token: ProviderToken<T>): Promise<TypeResolution<T> | undefined> {
    // ... same as get() but awaits the factory result
}
```

---

### 3.3 TODO: abstract types as tokens — documented in README

**File:** `README.md`

```md
- [ ] add support for abstract types as token
```

Currently only concrete classes, strings, symbols, and `InjectionToken` work as tokens. Abstract classes or interfaces
cannot be used directly. An `AbstractToken<T>` or extending `InjectionToken` to accept abstract constructors would
address this.

---

### 3.4 `inject.optional` — should not require a current injector

**File:** `src/injections.ts`

```ts
inject.optional = function <T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
    const injector = requireCurrentInjector(); // throws if no injector
    return injector.get(token);
};
```

`inject.optional` is designed to allow missing dependencies. But if there is **no current injector**, it throws
`OUTSIDE_INJECTION_CONTEXT` rather than returning `undefined`. An "optional" function that throws is surprising.

**Fix:**

```ts
inject.optional = function <T>(token: ProviderToken<T>): TypeResolution<T> | undefined {
    try {
        const injector = requireCurrentInjector();
        return injector.get(token);
    } catch {
        return undefined;
    }
};
```

---

### 3.5 No way to list or iterate registered tokens from outside the injector

There is no public `tokens()` or `has(token)` API. External code cannot check whether a token is registered without
calling `get()` and checking for `undefined` (which also triggers resolution).

**Fix — add to `SimpleInjector`:**

```ts
public has(token: ProviderToken): boolean {
    return this._providerEntries.has(token);
}

public tokens(): IterableIterator<ProviderToken<unknown>> {
    return this._providerEntries.keys();
}
```

---

## 4. Code Quality & Consistency

### 4.1 `assignProperty` accepts `value: any`

**File:** `src/misc-utils.ts`

```ts
export function assignProperty<T>(object: T, property: PropertyKey, value: any): T {
```

The function is used to attach typed metadata but loses type safety on `value`. Since the callers always pass a known
type, generify it:

```ts
export function assignProperty<T, V>(object: T, property: PropertyKey, value: V): T {
    return Object.defineProperty(object, property, {
        value,
        enumerable: false,
        writable: false,
        configurable: false,
    });
}
```

---

### 4.2 `InjectableDecorator` default scope differs from `createScopedDecorator` documentation

**File:** `src/injectable.decorator.ts`

The JSDoc for `InjectableDecorator` says:

```ts
/** Defaults to Scope.GLOBAL if not specified. */
```

But `Scope` enum documentation says:

```ts
// Scope.INJECTOR is the default scope for services.
```

And `config.ts` has:

```ts
export const defaultScope = Scope.INJECTOR;
```

However, `InjectableDecorator` explicitly hard-codes:

```ts
scope: params.scope ?? Scope.GLOBAL;
```

This is inconsistent. Either:

- `@Injectable()` should use `defaultScope` (INJECTOR), matching the rest of the system
- Or the `defaultScope` config should be `GLOBAL`

The inconsistency means `@Injectable()` without arguments behaves differently from the documented `defaultScope`.

**Fix:** Use `defaultScope` in the decorator:

```ts
registerInjectable(constructor as any, { ...params, scope: params.scope ?? defaultScope });
```

And update JSDoc to say "Defaults to `defaultScope` (currently INJECTOR)".

---

### 4.3 `SimpleInjector` constructor — `options` object accepted but only one option exists

```ts
public constructor(
    protected readonly parent?: Injector,
    protected readonly name?: string,
    private readonly options?: { readonly ignoreDuplicates?: boolean },
)
```

`options` is a bag with one field. As more options are added they'll be baked into this anonymous type. Define a named
interface:

```ts
export interface SimpleInjectorOptions {
    readonly ignoreDuplicates?: boolean;
    // future: readonly allowPartialResolution?: boolean;
}
```

---

### 4.4 `resolveAll` — runs in injector context but the comment says it's needed for resolution

**File:** `src/simple-injector.ts`

```ts
// we have to run resolution in the context of this injector to allow resolving
// dependencies of providers during instantiation
this.run(() => {
    for (const [token] of this._providerEntries.entries()) {
```

`this.run()` sets the current injector for `inject()` calls. But `this.get()` already uses `runWithInjector` internally
during class instantiation (`createClassInstance`). The outer `this.run()` wrapper is redundant for the instantiation
path, but is necessary for `inject()` calls inside constructors that happen to be executed during `resolveAll`. This is
correct but the comment is incomplete — add a note explaining this:

```ts
// We run in injector context so that inject() calls inside constructors
// executed during resolveAll() can find this injector via requireCurrentInjector().
// Note: createClassInstance() already wraps individual instantiations, but this
// ensures the outer forEach loop itself is also within context.
```

---

### 4.5 GitHub Actions workflow name has a typo

**File:** `.github/workflows/publish.yml`

```yaml
name: Buld and test
```

Should be `Build and test`.

---

### 4.6 `workspaces/examples/deno.json` is empty

```json
{
}
```

This should at minimum reference the workspace dependency on `@g43/di`:

```json
{
    "imports": {
        "@g43/di": "../di/src/index.ts"
    }
}
```

Without this, the example files rely on path resolution that may break.

---

### 4.7 `.gitpod` uses `yarn` but the project uses `deno`

**File:** `.gitpod`

```yaml
tasks:
    - init: yarn install && yarn run build
    - command: curl -fsSL https://deno.land/install.sh | sh
```

The `yarn install && yarn run build` step will fail (no `package.json`). This is a stale config from before the Deno
migration.

**Fix:**

```yaml
tasks:
    - init: curl -fsSL https://deno.land/install.sh | sh && deno install
    - command: deno task check
```

---

## 5. Type Safety

### 5.1 `errors.ts` — `resolvedParams` typed as `unknown[]` but cast with `any` inline

**File:** `src/errors.ts`

```ts
CANNOT_RESOLVE_PARAMS: (token: ProviderToken, resolvedParams: unknown[]) => {
    const msg = resolvedParams.map((e: any) => e ? String(e) : "?").join(", ");
```

The `(e: any)` cast is unnecessary since `String(e)` works on `unknown`. Replace:

```ts
const msg = resolvedParams.map((e) => e != null ? String(e) : "?").join(", ");
```

---

### 5.2 `StringifyProviderType` — `FactoryProvider` stringified with `String(factory)` (full function source)

**File:** `src/types.ts`

```ts
if (isFactoryProvider(type)) {
    return `FactoryProvider[${type.factory}]`;
}
```

`String(type.factory)` outputs the entire function body in the error message. For large factories this is noise in
logs/errors.

**Fix:**

```ts
return `FactoryProvider[${type.factory.name || "anonymous"}]`;
```

---

### 5.3 `isType` accepts `any` — could be tightened

**File:** `src/types.ts`

```ts
export function isType(v: any): v is Type<any> {
    return typeof v === "function";
}
```

This returns `true` for any function (arrow functions, plain functions, etc.), not just constructors. In practice this
is fine since DI tokens that are functions are expected to be constructors, but the type guard is overly broad.

---

### 5.4 `InjectorEntry.cachedResolution` uses the presence-in-object check rather than a sentinel

**File:** `src/simple-injector.ts`

```ts
if ("cachedResolution" in entry) {
    return entry.cachedResolution as TypeResolution<T>;
}
```

This is fragile — TypeScript allows `cachedResolution` to be `undefined` even when the key is present. Use a sentinel:

```ts
const UNRESOLVED: unique symbol = Symbol("DI_UNRESOLVED");

interface InjectorEntry<T> {
    readonly cachedResolution?: TypeResolution<T> | typeof UNRESOLVED;
}

if (entry.cachedResolution !== UNRESOLVED && entry.cachedResolution !== undefined) { ... }
```

Or restructure the type so the key is absent until resolved.

---

## 6. Security & Robustness

### 6.1 `resolveParameters` — error message leaks internal parameter index without context

**File:** `src/simple-injector.ts`

```ts
throw new Error(`Failed to resolve parameter at index ${index}: ${StringifyProviderToken(parameter)}`);
```

The error does not say **which class** failed to resolve. When the error bubbles up through multiple layers it loses
context.

**Fix:** Pass the parent token through:

```ts
private resolveParameters<T extends readonly ProviderToken[]>(
    parameters: T,
    forToken?: ProviderToken,
): MapArray<T> {
    return parameters.map((parameter, index) => {
        const resolved = this.get(parameter);
        if (resolved === undefined) {
            const ctx = forToken ? ` (while resolving ${StringifyProviderToken(forToken)})` : "";
            throw new Error(
                `Failed to resolve parameter at index ${index}: ${StringifyProviderToken(parameter)}${ctx}`
            );
        }
        return resolved;
    }) as MapArray<T>;
}
```

---

### 6.2 `SimpleInjector._providerEntries` is `protected` — subclasses can corrupt internal state

**File:** `src/simple-injector.ts`

```ts
protected readonly _providerEntries: Map<ProviderToken<unknown>, InjectorEntry<unknown>> = new Map();
```

Marking it `protected` allows subclasses (`RootInjectorImpl`) to directly manipulate the Map. `RootInjectorImpl` only
calls `super.*` methods, but the `_` prefix convention (private by convention) combined with `protected` access is
contradictory.

**Fix:** Make it `private` and expose a protected `_getEntry` helper if subclasses need read access:

```ts
private readonly _providerEntries: Map<...> = new Map();

protected _getEntry<T>(token: ProviderToken<T>): InjectorEntry<T> | undefined {
    return this._providerEntries.get(token) as InjectorEntry<T> | undefined;
}
```

---

## 7. Missing Tests (inferred from code patterns)

The spec files are excluded from this analysis, but based on the source the following scenarios are likely untested or
under-tested:

### 7.1 String and symbol tokens in `RootInjector`

Based on bug §2.1, a test registering `{ token: "MY_STRING", useValue: 42 }` in `RootInjector` and calling
`RootInjector.get("MY_STRING")` should throw but should not.

### 7.2 Concurrent async resolution on the same injector

No test for two overlapping `runAsync` calls creating race conditions on `_dependencyResolutionStack` (bug §1.2).

### 7.3 `inject.optional` outside injection context

Should return `undefined`, currently throws (bug §3.4).

### 7.4 `printDebug` on an injector with unresolved providers

Should not cause side-effect instantiation (bug §2.5).

### 7.5 `InjectionToken` with a factory `defaultValue` called multiple times

Each call currently re-invokes the factory (bug §2.4).

### 7.6 Global provider registered via `createInjector` providers array

Should end up in `RootInjector._providerEntries`, not the local injector.

### 7.7 `resolveAll` with `allowUnresolved: true`

Should skip unresolvable tokens and return only the tokens that succeeded.

---

## 8. Documentation Issues

### 8.1 README — `@Injectable()` default scope is documented as GLOBAL but should be INJECTOR

The README says:

```ts
// Global Scope (Default)
@Injectable()
class GlobalService {}
```

But based on §4.2, the `defaultScope` config is `INJECTOR`. The decorator hard-codes `GLOBAL`, making it inconsistent
with the config. The README reinforces the wrong impression. After fixing §4.2, update the README.

---

### 8.2 `Scope.INJECTOR` JSDoc is imprecise about child injector behavior

```ts
/**
 * Local scope means that the service will be created once per injector.
 * All children injectors will share the same instance of the service.
 */
INJECTOR = "injector",
```

"All children injectors will share the same instance" is incorrect — child injectors resolve from their parent chain, so
they will use the **parent's** instance. But if a child injector has its **own** registration of the same token, it gets
its own instance. The description should clarify:

```ts
/**
 * INJECTOR scope means a single instance is created per injector that has
 * the provider registered. Child injectors that do not re-register the provider
 * will resolve to the parent's instance via the parent chain.
 */
```

---

### 8.3 `inject.optional` — JSDoc says it throws if no injector, implementation confirms it (should not)

```ts
/**
 * @throws Error if there is no current injector
 */
inject.optional = function ...
```

Per §3.4, this should return `undefined` instead of throwing when outside injection context. The JSDoc will also need
updating after the fix.

---

### 8.4 `InjectorEntry.cachedResolution` — JSDoc says "if available" but undefined means unresolved

```ts
/** The cached resolved instance(s), if available */
readonly cachedResolution?: TypeResolution<T> | TypeResolution<T>[];
```

The optional `?` combined with the comment is ambiguous — `undefined` here means "not yet resolved", but if a resolution
legitimately returned `undefined` it would be indistinguishable. Per §1.1, this is a design flaw that the JSDoc should
at minimum warn about.

---

## 9. Step-by-Step Fix Plan

Work through in priority order. Each step is self-contained.

---

### Step 1 — Fix `RootInjector.get` crash for string/symbol tokens _(Critical, ~20min)_

- Add the `string | symbol` guard before the `throw` in `RootInjectorImpl.get` (§2.1)
- Add a test: `RootInjector.registerProvider({ token: "X", useValue: 1 }); RootInjector.get("X")` must return `1`

### Step 2 — Fix `inject.optional` outside injection context _(Critical, ~10min)_

- Wrap `requireCurrentInjector()` in try/catch and return `undefined` on error (§3.4)
- Update the JSDoc `@throws` annotation
- Add a test verifying `inject.optional(SomeToken)` returns `undefined` when called outside any context

### Step 3 — Fix `printDebug` side-effect instantiation _(High, ~20min)_

- Change `printDebug` to read entry metadata without calling `this.get()` (§2.5)
- Add a test verifying that calling `printDebug()` on an unresolved injector does not instantiate anything

### Step 4 — Fix concurrent async resolution race on `_dependencyResolutionStack` _(High, ~45min)_

- Replace the instance-level stack with a parameter passed through the resolution chain (§1.2)
- Update `get`, `resolveEntry`, `resolveParameters`, `resolveCustomProvider`, `resolveTypeProvider`
- Add a test with two overlapping `runAsync` resolutions on the same injector

### Step 5 — Add `RootInjector._reset()` for test isolation _(High, ~20min)_

- Add the `_reset()` internal method to `SimpleInjector` and expose a `resetRootInjector()` test helper (§1.3)
- Add `src/testing.ts` (excluded from publish in `deno.json`)
- Ensure existing test files call `resetRootInjector()` in `beforeEach`

### Step 6 — Fix `@Injectable()` default scope inconsistency _(Medium, ~15min)_

- Change `InjectableDecorator` to use `defaultScope` instead of hard-coding `Scope.GLOBAL` (§4.2)
- Update JSDoc on `InjectableDecorator`
- Update README "Global Scope (Default)" section

### Step 7 — Fix `InjectionToken` default value factory re-invocation _(Medium, ~30min)_

- Cache the resolved default value in `_providerEntries` on first use (§2.4)
- Add a test verifying the factory is only called once across multiple `get()` calls

### Step 8 — Remove dead `resolvedParams.some(undefined)` check _(Low, ~10min)_

- Delete the unreachable check in `getResolvedConstructorParams` (§2.3)
- Leave a comment referencing `resolveParameters`'s error handling

### Step 9 — Add `has(token)` and `tokens()` to `SimpleInjector` _(Low, ~15min)_

- Implement both public methods (§3.5)
- Export from `index.ts`

### Step 10 — Fix `assignProperty` value type to be generic _(Low, ~10min)_

- Remove the `any` from `assignProperty`'s `value` parameter (§4.1)

### Step 11 — Implement `@Inject()` parameter decorator _(Medium, ~1h)_

- Create `src/inject.decorator.ts` with `@Inject(token)` decorator (§3.1)
- Integrate with `getResolvedConstructorParams` to override `design:paramtypes` per index
- Export from `index.ts`
- Add to README usage examples

### Step 12 — Fix `FactoryProvider` stringification _(Low, ~5min)_

- Change `${type.factory}` to `${type.factory.name || "anonymous"}` (§5.2)

### Step 13 — Improve `resolveParameters` error context _(Low, ~15min)_

- Pass `forToken` context through to the error message (§6.1)

### Step 14 — Add `SimpleInjectorOptions` named interface _(Low, ~10min)_

- Extract the anonymous options type to `SimpleInjectorOptions` (§4.3)
- Export from `index.ts`

### Step 15 — Fix `.gitpod` and stale CI workflow name _(Trivial, ~5min)_

- Replace `yarn install && yarn run build` with Deno commands (§4.7)
- Fix `name: Buld and test` typo in `publish.yml` (§4.5)

### Step 16 — Fix `workspaces/examples/deno.json` empty config _(Trivial, ~5min)_

- Add workspace import for `@g43/di` (§4.6)

### Step 17 — Update `Scope.INJECTOR` JSDoc _(Trivial, ~5min)_

- Clarify child-injector behaviour (§8.2)

### Step 18 — Warn when global provider is silently redirected to RootInjector _(Low, ~15min)_

- Add `console.warn` in `registerProviders` for global providers (§2.2)

---

_Total estimated effort: ~7–9 hours for a single developer._
