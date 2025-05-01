/**
 * Defines the lifetime and sharing behavior of a provider.
 * The scope determines how instances are created and shared across injectors.
 */
export enum Scope {
    /**
     * Global scope means that the service will be created once per application.
     * All injectors will share the same instance of the service.
     */
    GLOBAL = "global",
    /**
     * Local scope means that the service will be created once per injector. All children injectors will share the same instance of the service.
     * This is the default scope for services.
     */
    INJECTOR = "injector",
    /**
     * Transient scope means that a new instance of the service will be created each time it is requested.
     */
    TRANSIENT = "transient",
}
