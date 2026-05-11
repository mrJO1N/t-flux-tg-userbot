import { Singleton, container } from '../injector'
import { type HttpMethod, type ValidateSchema, type RouteDefinition, getControllerRegistry } from './decorators'
import { CONTROLLER_PREFIX, ROUTE_METHODS, VALIDATE_SCHEMA } from './metadata-keys'
import { HttpRequest, HttpResponse } from './context'

interface CompiledRoute {
    method: string
    pattern: RegExp
    paramNames: string[]
    handler: Function
    validateSchema?: ValidateSchema
}

@Singleton()
export class HttpServer {
    private routes: CompiledRoute[] = []

    private compilePath(prefix: string, path: string): { pattern: RegExp; paramNames: string[] } {
        const full = (prefix + path).replace(/\/+/g, '/')
        const paramNames: string[] = []
        const regexStr = full.replace(/:([^/]+)/g, (_, name) => {
            paramNames.push(name)
            return '([^/]+)'
        })
        return { pattern: new RegExp(`^${regexStr}$`), paramNames }
    }

    bootstrap(): void {
        for (const ControllerClass of getControllerRegistry()) {
            const instance = container.resolve(ControllerClass as any)
            const prefix: string = Reflect.getMetadata(CONTROLLER_PREFIX, ControllerClass) ?? ''
            const routeDefs: RouteDefinition[] = Reflect.getMetadata(ROUTE_METHODS, ControllerClass) ?? []

            for (const route of routeDefs) {
                const { pattern, paramNames } = this.compilePath(prefix, route.path)
                const validateSchema: ValidateSchema | undefined = Reflect.getMetadata(
                    VALIDATE_SCHEMA,
                    (ControllerClass as any).prototype,
                    route.handlerName
                )
                this.routes.push({
                    method: route.method,
                    pattern,
                    paramNames,
                    handler: (instance as any)[route.handlerName].bind(instance),
                    validateSchema,
                })
            }
        }
    }

    addRoute(method: HttpMethod, path: string, handler: (req: HttpRequest, res: HttpResponse) => void | Promise<void>): void {
        const { pattern, paramNames } = this.compilePath('', path)
        this.routes.push({ method, pattern, paramNames, handler })
    }

    listen(port: number): void {
        this.bootstrap()
        Bun.serve({ port, fetch: (req) => this.handle(req) })
    }

    private async handle(bunReq: Request): Promise<Response> {
        const url = new URL(bunReq.url)
        const method = bunReq.method.toUpperCase()

        for (const route of this.routes) {
            if (route.method !== method) continue
            const match = url.pathname.match(route.pattern)
            if (!match) continue

            const params: Record<string, string> = {}
            route.paramNames.forEach((name, i) => { params[name] = match[i + 1] ?? '' })

            const req = new HttpRequest(bunReq, params)
            await req.parseBody()
            const res = new HttpResponse()

            const validationError = this.validate(route.validateSchema, req)
            if (validationError) {
                return new Response(JSON.stringify({ error: validationError }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                })
            }

            let nextError: unknown = undefined
            const next = (err?: unknown) => { nextError = err }

            try {
                await route.handler(req, res, next)
            } catch (err) {
                return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                })
            }

            if (nextError) {
                const msg = nextError instanceof Error ? nextError.message : 'Internal Server Error'
                return new Response(JSON.stringify({ error: msg }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                })
            }

            return res.toBunResponse()
        }

        return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    private validate(schema: ValidateSchema | undefined, req: HttpRequest): unknown {
        if (!schema) return null

        for (const part of ['query', 'body', 'params'] as const) {
            const partSchema = schema[part]
            if (!partSchema) continue

            const result = partSchema.safeParse(req[part])
            if (!result.success) return result.error
            req[part] = result.data
        }

        return null
    }
}
