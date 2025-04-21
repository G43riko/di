/**
 * A token that can be used to identify a dependency when the type is not available.
 * Useful for injecting primitive values, interfaces, or third-party services.
 *
 * @template T - The type of value this token represents
 *
 * @example
 * ```ts
 * // Create a token for a configuration object
 * const CONFIG_TOKEN = new InjectionToken<AppConfig>('APP_CONFIG');
 *
 * // Register a provider for the token
 * injector.registerProvider({
 *   token: CONFIG_TOKEN,
 *   useValue: { apiUrl: 'https://api.example.com' }
 * });
 *
 * // Inject the value
 * const config = injector.get(CONFIG_TOKEN);
 * ```
 */
export class InjectionToken<T> {
    /**
     * Creates a new injection token.
     *
     * @param name - A descriptive name for debugging purposes
     * @param options - Configuration options for the token
     * @param options.defaultValue - Optional default value to use if the token is not found in an injector
     * @param options.required - If true, injector.get(token) will throw if the token is not found
     */
    public constructor(
        public readonly name: string,
        public readonly options: {
            /** Optional default value or factory function to use if the token is not found */
            readonly defaultValue?: T | (() => T);
            /**
             * If true, injector.get(token) will throw if a token is not found in an injector
             */
            readonly required?: boolean;
        } = {},
    ) {
    }

    /**
     * Returns a string representation of this token for debugging purposes.
     *
     * @returns A string representation of the token
     */
    public toString(): string {
        return `InjectionToken[${this.name}]`;
    }
}
