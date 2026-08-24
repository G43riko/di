[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/G43riko/di/blob/master/LICENSE)
[![Build and test](https://github.com/G43riko/di/actions/workflows/publish.yml/badge.svg)](https://github.com/G43riko/di/actions/workflows/publish.yml)
![REPO SIZE](https://img.shields.io/github/repo-size/G43riko/di.svg?style=flat-square)
![CODE SIZE](https://img.shields.io/github/languages/code-size/G43riko/di.svg?style=flat-square)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=coverage)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=G43riko_di)

# @g43/di — Dependency Injection for Deno

A lightweight, powerful, and fully type-safe dependency injection library for Deno, inspired by Angular's DI system.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [The `@Injectable` Decorator](#the-injectable-decorator)
  - [Injectors](#injectors)
  - [InjectionToken](#injectiontoken)
  - [Scopes](#scopes)
  - [The `inject()` Function](#the-inject-function)
- [Provider Types](#provider-types)
  - [Class Provider](#class-provider)
  - [Value Provider](#value-provider)
  - [Factory Provider](#factory-provider)
  - [Existing Provider (Alias)](#existing-provider-alias)
  - [Multi-Provider](#multi-provider)
- [Hierarchical Injectors](#hierarchical-injectors)
- [Root Injector](#root-injector)
- [Abstract Classes as Tokens](#abstract-classes-as-tokens)
- [Circular Dependency Detection](#circular-dependency-detection)
- [Async Context Support](#async-context-support)
- [API Reference](#api-reference)
- [Error Reference](#error-reference)
- [Project Structure](#project-structure)
- [Development Scripts](#development-scripts)
- [License](#license)

---

## Overview

`@g43/di` is a zero-boilerplate dependency injection container that brings Angular-style DI to Deno. It provides:

- **Decorator-based registration** via `@Injectable()`
- **Hierarchical injector trees** with parent/child relationships
- **Multiple provider strategies** (`useClass`, `useValue`, `factory`, `useExisting`)
- **Three lifetime scopes** (`GLOBAL`, `INJECTOR`, `TRANSIENT`)
- **First-class async support** using `AsyncLocalStorage` so concurrent async contexts each see their own injector
- **Circular dependency detection** with descriptive error messages

---

## Features

| Feature | Description |
|---|---|
| **`@Injectable` decorator** | Marks a class as injectable and sets its scope |
| **Scoped decorators** | `@Injectable.global()`, `@Injectable.injector()`, `@Injectable.transient()` |
| **`createInjector()`** | Factory to create a named injector with providers and optional parent |
| **`InjectionToken<T>`** | Type-safe token for injecting non-class values (strings, configs, interfaces) |
| **`inject(token)`** | Functional injection — retrieve a dependency without constructor parameters |
| **`inject.optional(token)`** | Like `inject()` but returns `undefined` instead of throwing when not found |
| **Multi-providers** | Collect multiple implementations under a single token as an array |
| **Hierarchical injectors** | Child injectors inherit providers from parent; useful for feature modules |
| **Root injector** | Singleton container that automatically resolves global providers |
| **`resolveAll()`** | Eagerly instantiate all registered providers at once |
| **`run()` / `runAsync()`** | Execute a callback inside an injector context so `inject()` works inside it |
| **Circular dependency detection** | Throws a descriptive error showing the full dependency chain |
| **Async isolation** | Each `runAsync()` call gets an isolated injector context via `AsyncLocalStorage` |
| **Abstract class tokens** | Use an abstract class as a token and bind a concrete implementation |
| **Debug helper** | `injector.printDebug()` prints all registered tokens and their resolution state |

---

## Requirements

- [Deno](https://deno.land/) v2+ (latest recommended)
- `experimentalDecorators` and `emitDecoratorMetadata` enabled (see below)

Add the following to your `deno.json` / `deno.jsonc`:

```jsonc
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

---

## Installation

Import directly from [JSR](https://jsr.io/@g43/di):

```ts
import { createInjector, inject, Injectable, InjectionToken, RootInjector, Scope } from "jsr:@g43/di";
```

Or add it to your `deno.json` imports map:

```jsonc
{
    "imports": {
        "@g43/di": "jsr:@g43/di@^0.0.9"
    }
}
```

Then import normally:

```ts
import { createInjector, inject, Injectable, InjectionToken, RootInjector, Scope } from "@g43/di";
```

---

## Quick Start

```ts
import { createInjector, Injectable } from "@g43/di";

@Injectable()
class UserService {
    getUsers(): string[] {
        return ["Alice", "Bob", "Charlie"];
    }
}

@Injectable()
class AppComponent {
    constructor(private readonly userService: UserService) {}

    displayUsers(): void {
        console.log("Users:", this.userService.getUsers());
    }
}

const injector = createInjector({
    providers: [UserService, AppComponent],
});

const app = injector.get(AppComponent);
app?.displayUsers();
// Output: Users: [ "Alice", "Bob", "Charlie" ]
```

---

## Core Concepts

### The `@Injectable` Decorator

Mark a class with `@Injectable()` so the injector knows how to instantiate it and what scope to assign.

```ts
import { Injectable } from "@g43/di";

// Default: GLOBAL scope (single instance shared across all injectors)
@Injectable()
class MyService {}

// Explicit GLOBAL scope
@Injectable.global()
class GlobalService {}

// INJECTOR scope: one instance per injector
@Injectable.injector()
class PerInjectorService {}

// TRANSIENT scope: new instance on every request
@Injectable.transient()
class TransientService {}
```

You can also pass the scope through the decorator options:

```ts
import { Injectable, Scope } from "@g43/di";

@Injectable({ scope: Scope.INJECTOR })
class MyService {}
```

> **Note:** Classes must be annotated with `@Injectable` (or registered via a custom provider) before they can be resolved by an injector. Attempting to register an unannotated class will throw an error.

---

### Injectors

An **injector** is a container that holds provider registrations and resolves dependencies on demand. Injectors are created with `createInjector()`.

```ts
import { createInjector } from "@g43/di";

const injector = createInjector({
    name: "MyInjector",          // optional — shown in debug output
    providers: [ServiceA, ServiceB],
    parentInjector: anotherInjector, // optional — defaults to RootInjector
    instantiateImmediately: true,    // optional — eagerly instantiate all providers
    ignoreDuplicates: false,         // optional — suppress duplicate registration errors
    allowUnresolved: false,          // optional — skip unresolvable providers during eager init
});
```

#### Resolving dependencies

```ts
// Returns the instance or undefined if not found
const service = injector.get(MyService);

// Returns the instance or throws if not found
const required = injector.require(MyService);
```

#### Dynamic registration

Providers can be added after the injector is created:

```ts
injector.registerProvider({ token: MY_TOKEN, useValue: 42 });
```

#### Debugging

```ts
injector.printDebug();
// Prints all registered tokens and their resolution state
```

---

### InjectionToken

Use `InjectionToken<T>` when you need to inject a value that doesn't have a class constructor — such as a configuration object, a primitive, or a third-party service.

```ts
import { InjectionToken } from "@g43/di";

interface AppConfig {
    apiUrl: string;
    timeout: number;
}

const APP_CONFIG = new InjectionToken<AppConfig>("APP_CONFIG");

injector.registerProvider({
    token: APP_CONFIG,
    useValue: { apiUrl: "https://api.example.com", timeout: 3000 },
});

const config = injector.get(APP_CONFIG);
// config.apiUrl === "https://api.example.com"
```

#### Default values

```ts
const THEME = new InjectionToken<string>("THEME", {
    defaultValue: "light",
});

// Returns "light" even if not registered
const theme = injector.get(THEME);
```

#### Required tokens

```ts
const API_KEY = new InjectionToken<string>("API_KEY", {
    required: true,
});

// Throws if API_KEY is not registered
RootInjector.get(API_KEY);
```

#### Factory default

The `defaultValue` can also be a factory function, which will be called inside the current injector context:

```ts
const DB_URL = new InjectionToken<string>("DB_URL", {
    defaultValue: () => Deno.env.get("DATABASE_URL") ?? "sqlite://local.db",
});
```

---

### Scopes

Scopes control when and how often a provider creates a new instance.

| Scope | Enum value | Behaviour |
|---|---|---|
| `GLOBAL` | `Scope.GLOBAL` | **One instance** shared across the entire application. Stored in `RootInjector`. |
| `INJECTOR` | `Scope.INJECTOR` | **One instance per injector** (and its children). This is the default. |
| `TRANSIENT` | `Scope.TRANSIENT` | **New instance on every request**. Never cached. |

#### Global scope example

```ts
@Injectable.global()
class DatabasePool {}

const pool1 = injector1.get(DatabasePool);
const pool2 = injector2.get(DatabasePool);
console.log(pool1 === pool2); // true — same instance
```

#### Injector scope example

```ts
@Injectable.injector()
class RequestContext {}

const ctx1 = injector1.get(RequestContext);
const ctx2 = injector2.get(RequestContext);
console.log(ctx1 === ctx2); // false — different injectors
console.log(injector1.get(RequestContext) === ctx1); // true — same within one injector
```

#### Transient scope example

```ts
@Injectable.transient()
class UniqueId {}

const id1 = injector.get(UniqueId);
const id2 = injector.get(UniqueId);
console.log(id1 === id2); // false — always a new instance
```

#### Scope via provider configuration

You can also override the scope when registering a provider:

```ts
import { InjectionToken, Scope } from "@g43/di";

const MY_TOKEN = new InjectionToken("MY_TOKEN");

injector.registerProvider({
    token: MY_TOKEN,
    useClass: MyService,
    scope: Scope.TRANSIENT,
});
```

---

### The `inject()` Function

`inject()` lets you retrieve dependencies without constructor parameters. It must be called while an injector is active in the current context (e.g., during class instantiation or inside `injector.run()` / `injector.runAsync()`).

```ts
import { inject } from "@g43/di";

@Injectable()
class ApiService {
    private readonly config = inject(APP_CONFIG);
    private readonly logger = inject.optional(LOGGER_TOKEN); // undefined if not provided

    fetchData(): Promise<Response> {
        this.logger?.log("Fetching data…");
        return fetch(this.config.apiUrl);
    }
}
```

#### `inject.optional()`

Returns `undefined` instead of throwing when the token is not found:

```ts
const maybeLogger = inject.optional(LOGGER_TOKEN);
maybeLogger?.log("This is optional");
```

#### Manual injection context

Use `injector.run()` to execute arbitrary code inside an injection context:

```ts
injector.run(() => {
    const value = inject(MY_TOKEN); // works here
    console.log(value);
});
```

---

## Provider Types

### Class Provider

Register a class directly or with the verbose `useClass` syntax:

```ts
@Injectable.injector()
class UserService {}

// Shorthand — registers UserService under its own token
injector.registerProvider(UserService);

// Verbose form
injector.registerProvider({
    token: UserService,
    useClass: UserService,
});

// Bind an interface/abstract token to a concrete class
injector.registerProvider({
    token: BaseUserService,
    useClass: UserService,
});
```

### Value Provider

Register any static value:

```ts
injector.registerProvider({
    token: APP_CONFIG,
    useValue: { apiUrl: "https://api.example.com", timeout: 5000 },
});

// Strings and symbols work too
injector.registerProvider({ token: "VERSION", useValue: "1.0.0" });
```

### Factory Provider

Use a factory function when instantiation requires custom logic:

```ts
injector.registerProvider({
    token: DatabaseService,
    factory: () => {
        const config = loadConfigFromEnvironment();
        return new DatabaseService(config);
    },
});
```

#### Factory with injected dependencies (`deps`)

Declare dependencies using the `deps` array — the resolved instances are passed as arguments to the factory:

```ts
injector.registerProvider({
    token: UserRepository,
    factory: (db: DatabaseService, logger: LoggerService) =>
        new UserRepository(db, logger),
    deps: [DatabaseService, LoggerService],
});
```

### Existing Provider (Alias)

Create an alias so that resolving one token returns the same instance as another:

```ts
@Injectable.injector()
class ConsoleLogger {}

// Both "LOGGER" and ConsoleLogger resolve to the same instance
injector.registerProvider({
    token: "LOGGER",
    useExisting: ConsoleLogger,
});

const logger = injector.get("LOGGER"); // ConsoleLogger instance
```

### Multi-Provider

Collect multiple implementations under a single token. Each registration with `multi: true` appends to an array:

```ts
import { InjectionToken } from "@g43/di";

interface Validator {
    validate(value: unknown): boolean;
}

const VALIDATORS = new InjectionToken<Validator[]>("VALIDATORS");

injector.registerProvider({ token: VALIDATORS, useClass: RequiredValidator, multi: true });
injector.registerProvider({ token: VALIDATORS, useClass: EmailValidator, multi: true });
injector.registerProvider({ token: VALIDATORS, useClass: LengthValidator, multi: true });

const validators = injector.get(VALIDATORS);
// validators === [RequiredValidator instance, EmailValidator instance, LengthValidator instance]
```

> **Note:** Either all registrations for a token must use `multi: true`, or none of them may. Mixing the two throws an error.

Multi-providers also work with `useValue` and factory providers:

```ts
const PLUGINS = new InjectionToken<string[]>("PLUGINS");

injector.registerProvider({ token: PLUGINS, useValue: "plugin-a", multi: true });
injector.registerProvider({ token: PLUGINS, useValue: "plugin-b", multi: true });

const plugins = injector.get(PLUGINS); // ["plugin-a", "plugin-b"]
```

---

## Hierarchical Injectors

Injectors form a tree. When a token is not found in a child injector, resolution automatically walks up to the parent.

```ts
const parentInjector = createInjector({
    name: "Parent",
    providers: [SharedService],
});

const childInjector = createInjector({
    name: "Child",
    providers: [ChildOnlyService],
    parentInjector,
});

// ChildOnlyService is available only in the child
childInjector.get(ChildOnlyService); // ✓
parentInjector.get(ChildOnlyService); // undefined

// SharedService is inherited from the parent
childInjector.get(SharedService); // ✓ — resolved via parent
parentInjector.get(SharedService); // ✓
```

A typical pattern is a root module injector with child injectors per feature or per request:

```ts
const appInjector = createInjector({
    name: "App",
    providers: [DatabaseService, ConfigService],
});

// One child injector per HTTP request
async function handleRequest(req: Request): Promise<Response> {
    const requestInjector = createInjector({
        name: "Request",
        parentInjector: appInjector,
        providers: [{ token: REQUEST_TOKEN, useValue: req }],
    });

    return requestInjector.run(() => {
        const handler = requestInjector.require(RequestHandler);
        return handler.handle();
    });
}
```

---

## Root Injector

`RootInjector` is the top-level singleton container. It is the default parent for every injector created by `createInjector()`.

- `GLOBAL` scope providers are automatically stored in `RootInjector`.
- When you call `RootInjector.get(SomeGlobalClass)`, it auto-registers the class if it has `GLOBAL` scope and wasn't registered yet.

```ts
import { RootInjector } from "@g43/di";

@Injectable()
class GlobalConfig {}

// Auto-registers and resolves
const config = RootInjector.get(GlobalConfig);

// Manual registration
RootInjector.registerProvider({ token: "API_URL", useValue: "https://api.example.com" });
const url = RootInjector.get("API_URL");
```

> **Warning:** The name `"RootInjector"` is reserved. Passing it as the `name` option of `createInjector()` throws an error.

---

## Abstract Classes as Tokens

Abstract classes can be used as provider tokens with all four provider strategies. This is useful for programming to interfaces:

```ts
abstract class BaseLogger {
    abstract log(msg: string): void;
}

@Injectable.injector()
class ConsoleLogger extends BaseLogger {
    log(msg: string): void {
        console.log("[LOG]", msg);
    }
}

const injector = createInjector({
    providers: [
        { token: BaseLogger, useClass: ConsoleLogger },
    ],
});

const logger = injector.get(BaseLogger);
// logger is a ConsoleLogger instance
logger?.log("Hello!");
```

This also works with `useValue`, `factory`, and `useExisting`:

```ts
// useValue
injector.registerProvider({ token: BaseLogger, useValue: new ConsoleLogger() });

// factory
injector.registerProvider({ token: BaseLogger, factory: () => new ConsoleLogger() });

// useExisting (alias)
injector.registerProvider({ token: BaseLogger, useExisting: ConsoleLogger });
```

---

## Circular Dependency Detection

The library detects circular dependencies and throws a descriptive error showing the full chain:

```ts
@Injectable()
class ServiceA {
    readonly b = inject(ServiceB); // A depends on B
}

@Injectable()
class ServiceB {
    readonly a = inject(ServiceA); // B depends on A → circular!
}

// Throws: "Circular dependency detected: ServiceA -> ServiceB -> ServiceA"
RootInjector.get(ServiceA);
```

---

## Async Context Support

`inject()` is backed by `AsyncLocalStorage`, so each concurrent async execution context maintains its own injector reference. This means you can safely run multiple async operations with different injectors at the same time:

```ts
const injector1 = createInjector({ providers: [{ token: "T", useValue: "V1" }] });
const injector2 = createInjector({ providers: [{ token: "T", useValue: "V2" }] });

const [r1, r2] = await Promise.all([
    injector1.runAsync(async () => {
        await delay(10);
        return inject<string>("T"); // "V1"
    }),
    injector2.runAsync(async () => {
        await delay(20);
        return inject<string>("T"); // "V2"
    }),
]);

console.log(r1, r2); // "V1" "V2"
```

#### Using `run()` for synchronous contexts

```ts
injector.run(() => {
    const service = inject(MyService);
    service.doWork();
});
```

---

## API Reference

### `createInjector(options)`

Creates a new dependency injection container.

| Option | Type | Default | Description |
|---|---|---|---|
| `providers` | `ProviderType[]` | `[]` | Providers to register immediately |
| `name` | `string` | — | Human-readable name for debug output |
| `parentInjector` | `Injector` | `RootInjector` | Parent injector for hierarchical lookup |
| `instantiateImmediately` | `boolean` | `false` | Eagerly resolve all providers after creation |
| `ignoreDuplicates` | `boolean` | `false` | Silently skip duplicate registrations |
| `allowUnresolved` | `boolean` | `false` | Skip unresolvable providers during eager init |

Returns: `SimpleInjector`

---

### `Injector` interface

| Method | Signature | Description |
|---|---|---|
| `get` | `get<T>(token): T \| undefined` | Resolve a token; returns `undefined` if not found |
| `require` | `require<T>(token): T` | Resolve a token; throws if not found |
| `registerProvider` | `registerProvider(provider): void` | Register a provider at runtime |
| `resolveAll` | `resolveAll(allowUnresolved?): ProviderToken[]` | Eagerly resolve all registered providers |
| `run` | `run<T>(callback: () => T): T` | Execute a callback in this injector's context |
| `runAsync` | `runAsync<T>(callback: () => Promise<T>): Promise<T>` | Execute an async callback in this injector's context |
| `printDebug` | `printDebug(): void` | Print all registered tokens and their state to the console |

---

### `Injectable`

| Usage | Scope |
|---|---|
| `@Injectable()` | `GLOBAL` (default) |
| `@Injectable({ scope: Scope.INJECTOR })` | `INJECTOR` |
| `@Injectable.global()` | `GLOBAL` |
| `@Injectable.injector()` | `INJECTOR` |
| `@Injectable.transient()` | `TRANSIENT` |

---

### `InjectionToken<T>`

```ts
const TOKEN = new InjectionToken<T>(name, options?)
```

| Option | Type | Description |
|---|---|---|
| `defaultValue` | `T \| (() => T)` | Value (or factory) returned when the token is not registered |
| `required` | `boolean` | If `true`, `RootInjector.get(token)` throws when not found |

---

### `inject<T>(token)`

Retrieves a dependency from the active injector. Must be called inside an injector context.

```ts
const value = inject<T>(token);            // throws if not found
const value = inject.optional<T>(token);   // returns undefined if not found
```

---

### `Scope` enum

```ts
enum Scope {
    GLOBAL    = "global",    // One instance per application
    INJECTOR  = "injector",  // One instance per injector (default)
    TRANSIENT = "transient", // New instance on every request
}
```

---

### Provider configuration reference

#### Class provider

```ts
{
    token: ProviderToken,
    useClass: Type<T>,
    scope?: Scope,
    multi?: boolean,
}
```

#### Value provider

```ts
{
    token: ProviderToken,
    useValue: T,
    scope?: Scope,
    multi?: boolean,
}
```

#### Factory provider

```ts
{
    token: ProviderToken,
    factory: (...deps: any[]) => T,
    deps?: ProviderToken[],
    scope?: Scope,
    multi?: boolean,
}
```

#### Existing provider (alias)

```ts
{
    token: ProviderToken,
    useExisting: ProviderToken<T>,
    scope?: Scope,
    multi?: boolean,
}
```

---

## Error Reference

| Error message | Cause |
|---|---|
| `Class 'X' must be annotated with @Injectable decorator` | Registering a class that has no `@Injectable` (when provider validation is enabled) |
| `Cannot register provider 'X' multiple times` | Registering the same token twice without `multi: true` |
| `Cannot find X` | `injector.require(token)` when the token is not registered |
| `Circular dependency detected: A -> B -> A` | A dependency chain that refers back to itself |
| `Failed to resolve parameter at index N: X` | A constructor parameter or factory dep could not be resolved |
| `It is not in injection context` | `inject()` called outside an active injector context |
| `Provider must have exactly one strategy among: useClass, useValue, factory, useExisting` | A custom provider object is missing (or has multiple) strategy keys |
| `'X' cannot alias to itself` | A `useExisting` provider points to its own token |
| `Injector name 'RootInjector' is reserved` | Passing `"RootInjector"` as the `name` to `createInjector()` |

---

## Project Structure

```
workspaces/
  di/
    src/          Core library source
      index.ts              Public API exports
      injectable.decorator.ts  @Injectable decorator and scoped variants
      injector.ts           Injector interface
      simple-injector.ts    Concrete injector implementation
      create-injector.ts    createInjector() factory
      root-injector.ts      Singleton RootInjector
      injection-token.ts    InjectionToken class
      injections.ts         inject() and inject.optional()
      current-injector.ts   AsyncLocalStorage context management
      injectable.holder.ts  Metadata storage for @Injectable
      scope.ts              Scope enum
      types.ts              Provider types and type guards
      errors.ts             Error message constants
      config.ts             Internal configuration flags
    tests/        Integration tests
  examples/
    src/          Example applications
deno.jsonc        Workspace configuration and task definitions
```

---

## Development Scripts

All commands are run via `deno task`:

| Command | Description |
|---|---|
| `deno task check` | Type-check, lint, and format-check the entire workspace |
| `deno task check:fix` | Type-check, then auto-fix linting and formatting issues |
| `deno task test` | Run all tests in parallel |
| `deno task test:coverage` | Run tests and generate coverage data |
| `deno task coverage` | Generate an HTML coverage report (requires `test:coverage` first) |
| `deno task coverage:lcov` | Generate an LCOV coverage report for CI integration |
| `deno task doc` | Generate HTML API documentation |
| `deno task serve:doc` | Serve the generated API documentation locally |
| `deno task serve:coverage` | Serve the generated coverage report locally |

---

## License

This project is licensed under the [MIT License](LICENSE).
