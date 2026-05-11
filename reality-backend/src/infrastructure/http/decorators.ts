import { Injectable } from '../injector'
import { CONTROLLER_PREFIX, ROUTE_METHODS, VALIDATE_SCHEMA } from './metadata-keys'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RouteDefinition {
    method: HttpMethod
    path: string
    handlerName: string
}

export interface ValidateSchema {
    query?: { safeParse(data: unknown): { success: boolean; data?: any; error?: unknown } }
    body?: { safeParse(data: unknown): { success: boolean; data?: any; error?: unknown } }
    params?: { safeParse(data: unknown): { success: boolean; data?: any; error?: unknown } }
}

const controllerRegistry: Function[] = []

export function getControllerRegistry(): Function[] {
    return controllerRegistry
}

export function Controller(prefix: string): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(CONTROLLER_PREFIX, prefix, target)
        Injectable()(target as any)
        controllerRegistry.push(target)
    }
}

function routeDecorator(method: HttpMethod, path: string): MethodDecorator {
    return (target, propertyKey) => {
        const routes: RouteDefinition[] = Reflect.getMetadata(ROUTE_METHODS, target.constructor) ?? []
        routes.push({ method, path, handlerName: propertyKey as string })
        Reflect.defineMetadata(ROUTE_METHODS, routes, target.constructor)
    }
}

export const Get = (path: string) => routeDecorator('GET', path)
export const Post = (path: string) => routeDecorator('POST', path)
export const Put = (path: string) => routeDecorator('PUT', path)
export const Delete = (path: string) => routeDecorator('DELETE', path)
export const Patch = (path: string) => routeDecorator('PATCH', path)

export function Validate(schema: ValidateSchema): ParameterDecorator {
    return (target, propertyKey) => {
        Reflect.defineMetadata(VALIDATE_SCHEMA, schema, target, propertyKey!)
    }
}
