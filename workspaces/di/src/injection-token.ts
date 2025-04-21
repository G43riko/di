export class InjectionToken<T> {
    public constructor(
        public readonly name: string,
        public readonly options: {
            readonly defaultValue?: T | (() => T);
            /**
             * If true, injector.get(token) will throw if a token is not found in an injector
             */
            readonly required?: boolean;
        } = {},
    ) {
    }

    public toString(): string {
        return `InjectionToken[${this.name}]`;
    }
}
