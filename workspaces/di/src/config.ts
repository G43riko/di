import { Scope } from "./scope.ts";

export const strictMode = false;
export const validateProviders = true;
export const enableConstructorInjection = true;
export const enableInject = true;
export const enableInjectDecorator = false;

export const defaultScope = Scope.INJECTOR;

export const rootInjectorName = "RootInjector";
