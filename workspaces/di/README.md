[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/G43riko/di/blob/master/LICENSE)
[![Buld and test](https://github.com/G43riko/di/actions/workflows/publish.yml/badge.svg)](https://github.com/G43riko/di/actions/workflows/publish.yml)
![REPO SIZE](https://img.shields.io/github/repo-size/G43riko/di.svg?style=flat-square)
![CODE SIZE](https://img.shields.io/github/languages/code-size/G43riko/di.svg?style=flat-square)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=coverage)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=G43riko_di)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=G43riko_di&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=G43riko_di)

# Dependency Injection for Deno

A lightweight, powerful dependency injection library for Deno applications, inspired by Angular's DI system.

## Overview

This library provides a robust and flexible dependency injection system for Deno. It supports hierarchical injectors, multiple provider types, and different lifetime scopes, all with first-class TypeScript support.

## Features

- **Simple API**: Intuitive and easy to use.
- **Type-safe**: Full TypeScript support for dependency resolution.
- **Multiple Provider Types**: Support for `useValue`, `useClass`, `factory`, and `useExisting`.
- **Hierarchical Injectors**: Parent-child injector relationships.
- **Configurable Scopes**: `GLOBAL`, `INJECTOR`, and `TRANSIENT` scopes.
- **Injection Tokens**: Support for non-class dependencies.
- **Functional Injection**: Use `inject()` for more flexible dependency retrieval.
- **Asynchronous Support**: Correctly handles asynchronous boundaries using `AsyncLocalStorage`.

## Requirements

- [Deno](https://deno.land/) (recommended version: latest)

## Installation

You can import the library directly from the workspace or via its entry point:

```ts
import { createInjector, inject, Injectable } from "@g43/di";
```

*Note: For production use, you would typically import from a published JSR or deno.land/x URL.*

## Basic Usage

### Creating a Simple Service

```ts
import { Injectable, createInjector } from "@g43/di";

@Injectable()
class UserService {
    getUsers() {
        return ["Alice", "Bob", "Charlie"];
    }
}

@Injectable()
class AppComponent {
    constructor(private userService: UserService) {}

    displayUsers() {
        const users = this.userService.getUsers();
        console.log("Users:", users);
    }
}

// Create an injector and register providers
const injector = createInjector({
    providers: [UserService, AppComponent],
});

// Get the component and use it
const app = injector.get(AppComponent);
app.displayUsers(); // Output: Users: ["Alice", "Bob", "Charlie"]
```

## Provider Types

### Class Providers

```ts
@Injectable()
class UserService {}

// Register the class directly
injector.registerProvider(UserService);

// Or using the verbose form
injector.registerProvider({
    token: UserService,
    useClass: UserService,
});
```

### Value Providers

```ts
import { InjectionToken } from "@g43/di";

const API_URL = new InjectionToken<string>("API_URL");

// Register a value
injector.registerProvider({
    token: API_URL,
    useValue: "https://api.example.com",
});

// Use it
@Injectable()
class ApiService {
    private apiUrl = inject(API_URL);
}
```

### Factory Providers

```ts
injector.registerProvider({
    token: DatabaseService,
    factory: () => {
        const config = loadConfigFromFile();
        return new DatabaseService(config);
    },
});

// With dependencies
injector.registerProvider({
    token: UserRepository,
    factory: (db: DatabaseService) => new UserRepository(db),
    deps: [DatabaseService],
});
```

### Existing Providers

```ts
// LoggerService is already registered
injector.registerProvider({
    token: "LOGGER",
    useExisting: LoggerService,
});
```

### Multi-providers

```ts
const VALIDATOR = new InjectionToken<Validator[]>("VALIDATOR");

injector.registerProvider({
    token: VALIDATOR,
    useClass: RequiredValidator,
    multi: true,
});

injector.registerProvider({
    token: VALIDATOR,
    useClass: EmailValidator,
    multi: true,
});

const validators = injector.get(VALIDATOR); // [RequiredValidator instance, EmailValidator instance]
```

## Scopes

### Global Scope (Default)

A single instance shared across all injectors.

```ts
@Injectable()
class GlobalService {}

// Or explicitly
@Injectable.global()
class ExplicitGlobalService {}
```

### Injector Scope

A new instance for each injector.

```ts
@Injectable.injector()
class PerInjectorService {}

// Or via provider configuration
injector.registerProvider({
    token: PerInjectorService,
    useClass: PerInjectorService,
    scope: Scope.INJECTOR,
});
```

### Transient Scope

A new instance each time it's requested.

```ts
@Injectable.transient()
class TransientService {}

// Or via provider configuration
injector.registerProvider({
    token: TransientService,
    useClass: TransientService,
    scope: Scope.TRANSIENT,
});
```

## Injection Tokens

```ts
import { InjectionToken } from "@g43/di";

interface Config {
    apiUrl: string;
    timeout: number;
}

const CONFIG = new InjectionToken<Config>("CONFIG");

// Register with a value
injector.registerProvider({
    token: CONFIG,
    useValue: { apiUrl: "https://api.example.com", timeout: 3000 },
});

// With a default value
const THEME = new InjectionToken<string>("THEME", {
    defaultValue: "light",
});
```

## Function-based Injection

Use the `inject()` function for more flexible injection:

```ts
import { inject } from "@g43/di";

@Injectable()
class UserService {
    // Inject using the function instead of constructor parameters
    private config = inject(CONFIG);
    private logger = inject.optional(LoggerService); // Optional dependency

    getUsers() {
        this.logger?.log("Getting users");
        return ["Alice", "Bob"];
    }
}
```

## Hierarchical Injectors

```ts
const parentInjector = createInjector({
    providers: [SharedService],
});

const childInjector = createInjector({
    providers: [ChildService],
    parentInjector,
});
```

## Root Injector

Access the global root injector:

```ts
import { RootInjector } from "@g43/di";

// Register a global provider
RootInjector.registerProvider({
    token: GlobalService,
    useClass: GlobalService,
});

// Access it from anywhere
const globalService = RootInjector.get(GlobalService);
```

## Project Structure

- `workspaces/di/src/`: Core library source code.
- `workspaces/di/tests/`: Unit and integration tests.
- `workspaces/examples/src/`: Example applications and usage demonstrations.
- `deno.jsonc`: Main Deno configuration and task definitions.

## Scripts

This project uses Deno tasks for development and maintenance.

- `deno task check`: Runs type checking, linting, and formatting checks.
- `deno task check:fix`: Runs type checking, and applies linting and formatting fixes.
- `deno task test`: Runs all tests in parallel.
- `deno task test:coverage`: Runs tests and generates coverage data.
- `deno task coverage`: Generates a HTML coverage report.
- `deno task doc`: Generates HTML documentation.
- `deno task serve:doc`: Serves the generated documentation.
- `deno task serve:coverage`: Serves the coverage report.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## TODO:

- [ ] add support for abstract types as token
- [ ] async injector
- [x] Handle circular dependencies
- [x] add useExisting provider
- [x] Support for async hooks support
- [x] support for multiple instances of the same value
- [x] add scope support
