import express, { type Request as ExpressRequest, type Response as ExpressResponse } from 'express'
import { Singleton, container, Inject } from '../injector'
import { type HttpMethod, type ValidateSchema, type RouteDefinition, getControllerRegistry } from './decorators'
import { CONTROLLER_PREFIX, ROUTE_METHODS, VALIDATE_SCHEMA } from './metadata-keys'
import { HttpRequest, HttpResponse } from './context'
import { LoggerProvider } from '../logger'
import { ConfigProvider } from '../config'

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

    constructor(
        @Inject(LoggerProvider) private readonly logger: LoggerProvider,
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
    ) { }

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
        const app = express()
        app.use(express.json())
        app.use((req, res, next) => {
            this.handle(req, res).catch(next)
        })
        app.listen(port)
    }

    private async handle(expressReq: ExpressRequest, expressRes: ExpressResponse): Promise<void> {
        const method = expressReq.method.toUpperCase()
        const pathname = expressReq.path

        for (const route of this.routes) {
            if (route.method !== method) continue
            const match = pathname.match(route.pattern)
            if (!match) continue

            const params: Record<string, string> = {}
            route.paramNames.forEach((name, i) => { params[name] = match[i + 1] ?? '' })

            const req = new HttpRequest(expressReq, params)
            await req.parseBody()
            const res = new HttpResponse(expressRes)

            const validationError = this.validate(route.validateSchema, req)
            if (validationError) {
                expressRes.status(400).json({ error: validationError })
                return
            }

            let nextError: unknown = undefined
            const next = (err?: unknown) => { nextError = err }

            try {
                await route.handler(req, res, next)
            } catch (err) {
                if (this.config.ENABLE_EXTENDED_ERROR_LOGS) {
                    this.logger.error('Unhandled route error', err, { method, pathname })
                }
                expressRes.status(500).json({ error: 'Internal Server Error' })
                return
            }

            if (nextError) {
                if (this.config.ENABLE_EXTENDED_ERROR_LOGS) {
                    this.logger.error('Route middleware error', nextError, { method, pathname })
                }
                const msg = nextError instanceof Error ? nextError.message : 'Internal Server Error'
             
                expressRes.status(500).json({ error: msg })
            }

            return
        }

        expressRes.status(404).json({ error: 'Not Found' })
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
