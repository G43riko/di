# Dependency Injection for Deno

A lightweight, powerful dependency injection library for Deno applications, inspired by Angular's DI system.

## Features

- Simple and intuitive API
- Type-safe dependency resolution
- Support for various provider types (value, class, factory, existing)
- Hierarchical injector system
- Configurable provider scopes (global, injector, transient)
- Injection tokens for non-class dependencies
- Function-based injection with `inject()`

## Installation

```ts
// Import from deno.land
import { createInjector, inject, Injectable } from "https://deno.land/x/di/mod.ts";
```

## Basic Usage

### Creating a Simple Service

```ts
import { Injectable } from "https://deno.land/x/di/mod.ts";

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
import { createInjector } from "https://deno.land/x/di/mod.ts";

const injector = createInjector({
    providers: [UserService, AppComponent],
});

// Get the component and use it
const app = injector.get(AppComponent);
app.displayUsers(); // Output: Users: ["Alice", "Bob", "Charlie"]
```

## Provider Types

### Class Providers

The simplest form is using the class itself:

```ts
@Injectable()
class UserService {}

// Register the class directly
injector.registerProvider(UserService);
```

Or using the verbose form:

```ts
injector.registerProvider({
    token: UserService,
    useClass: UserService,
});
```

### Value Providers

For providing simple values:

```ts
// Create a token
import { InjectionToken } from "https://deno.land/x/di/mod.ts";

const API_URL = new InjectionToken<string>("API_URL");

// Register a value
injector.registerProvider({
    token: API_URL,
    useValue: "https://api.example.com",
});

// Use it
@Injectable()
class ApiService {
    constructor(@Inject(API_URL) private apiUrl: string) {}
}
```

### Factory Providers

For more complex creation logic:

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

For aliasing one token to another:

```ts
// LoggerService is already registered
injector.registerProvider({
    token: "LOGGER",
    useExisting: LoggerService,
});
```

## Scopes

Control the lifetime of your services:

### Global Scope (Default)

A single instance shared across all injectors:

```ts
@Injectable()
class GlobalService {}

// Or explicitly
@Injectable.global()
class ExplicitGlobalService {}
```

### Injector Scope

A new instance for each injector:

```ts
@Injectable.injector()
class PerInjectorService {}

// Or
injector.registerProvider({
    token: PerInjectorService,
    useClass: PerInjectorService,
    scope: Scope.INJECTOR,
});
```

### Transient Scope

A new instance each time it's requested:

```ts
@Injectable.transient()
class TransientService {}

// Or
injector.registerProvider({
    token: TransientService,
    useClass: TransientService,
    scope: Scope.TRANSIENT,
});
```

## Injection Tokens

For non-class dependencies:

```ts
import { InjectionToken } from "https://deno.land/x/di/mod.ts";

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

// With a required flag
const REQUIRED_SERVICE = new InjectionToken<Service>("REQUIRED_SERVICE", {
    required: true,
});
```

## Function-based Injection

Use the `inject()` function for more flexible injection:

```ts
import { inject } from "https://deno.land/x/di/mod.ts";

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

Create parent-child relationships between injectors:

```ts
const parentInjector = createInjector({
    providers: [SharedService],
});

const childInjector = createInjector({
    providers: [ChildService],
    parentInjector,
});

// ChildService can inject SharedService
```

## Root Injector

Access the global root injector:

```ts
import { RootInjector } from "https://deno.land/x/di/mod.ts";

// Register a global provider
RootInjector.registerProvider({
    token: GlobalService,
    useClass: GlobalService,
});

// Access it from anywhere
const globalService = RootInjector.get(GlobalService);
```

## Advanced Usage

### Running Code with an Injector Context

```ts
const result = injector.run(() => {
    // Inside this function, inject() will use the specified injector
    const service = inject(UserService);
    return service.processData();
});

// Async version
const asyncResult = await injector.runAsync(async () => {
    const service = inject(UserService);
    return await service.fetchDataAsync();
});
```

### Debugging

Print the contents of an injector:

```ts
injector.printDebug();
// Output: Injector 'MyInjector' contains: { "UserService": "[object Object]", ... }
```

## TODO:

- [ ] async injector
- [ ] Handle circular dependencies
- [x] add useExisting provider
- [ ] Support for async hooks support
- [ ] support for multiple instances of the same value
- [x] add scope support
