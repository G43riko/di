import { type ProviderToken, StringifyProviderToken } from "./types.ts";

export const Errors = {
    OUTSIDE_INJECTION_CONTEXT: () => "It is not in injection context",
    CANNOT_REGISTER_MULTIPLE_TIMES: (token: ProviderToken) =>
        `Cannot register provider '${StringifyProviderToken(token)}' multiple times`,
    CANNOT_FIND_TOKEN: (token: ProviderToken) => `Cannot find ${StringifyProviderToken(token)}`,
    CANNOT_RESOLVE_PARAMS: (token: ProviderToken, resolvedParams: unknown[]) => {
        const msg = resolvedParams.map((e: any) => e ? String(e) : "?").join(", ");

        return `Cannot resolve parameters of ${StringifyProviderToken(token)}(${msg})`;
    },
    GLOBAL_PROVIDER_DEPENDS_ON_NON_GLOBAL: (provider: ProviderToken, dependency: ProviderToken) =>
        `Global provider '${StringifyProviderToken(provider)}' cannot depend on non-global provider '${
            StringifyProviderToken(dependency)
        }'`,
    SERVICE_CANNOT_HAVE_CONSTRUCTOR_PARAMS: (provider: ProviderToken) =>
        `Service '${
            StringifyProviderToken(provider)
        }' cannot have constructor dependencies; use inject() or a factory instead`,
    CIRCULAR_DEPENDENCY: (stack: ProviderToken[]) =>
        `Circular dependency detected: ${stack.map(StringifyProviderToken).join(" -> ")}`,
};
