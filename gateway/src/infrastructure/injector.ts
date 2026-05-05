import { injectable, container, inject, type InjectionToken, singleton, delay } from "tsyringe";

export const forwardRef = delay
export const resolveDep = <T>(token: InjectionToken<T>): T => container.resolve(token)
export const Inject = inject
export const Injectable = injectable
export const Singleton = singleton;
export type DependencyToken = InjectionToken

export function InjectableFunction<T extends any[], R>(
    tokens: { [K in keyof T]: InjectionToken<T[K]> },
    fn: (...args: T) => R
) {
    return () => {
        const resolvedDeps = tokens.map(token => container.resolve(token)) as T;
        return fn(...resolvedDeps);
    };
}

export default {
    Inject, Injectable, InjectableFunction, resolveDep
}