import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import type { ValidateSchema } from './decorators'

export class HttpRequest<TQuery = Record<string, string>, TBody = unknown, TParams = Record<string, string>> {
    query!: TQuery
    params!: TParams
    body!: TBody
    headers: Record<string, string | string[] | undefined>

    constructor(req: ExpressRequest, params: Record<string, string> = {}) {
        this.query = req.query as unknown as TQuery
        this.params = params as TParams
        this.body = req.body as TBody
        this.headers = req.headers
    }

    async parseBody(): Promise<void> {
        // body already parsed by express.json() middleware
    }
}

type InferSchema<T> = T extends { parse(...args: any[]): infer R } ? R : never

export type Typed<TSchema extends ValidateSchema> = HttpRequest<
    [InferSchema<TSchema['query']>] extends [never] ? Record<string, string> : InferSchema<TSchema['query']>,
    [InferSchema<TSchema['body']>] extends [never] ? unknown : InferSchema<TSchema['body']>,
    [InferSchema<TSchema['params']>] extends [never] ? Record<string, string> : InferSchema<TSchema['params']>
>

export class HttpResponse {
    private _expressRes: ExpressResponse
    private _statusCode = 200
    private _sent = false

    constructor(res: ExpressResponse) {
        this._expressRes = res
    }

    get sent() { return this._sent }

    status(code: number): this {
        this._statusCode = code
        return this
    }

    send(data: unknown): this {
        this._expressRes.status(this._statusCode).send(data)
        this._sent = true
        return this
    }

    json(data: unknown): this {
        this._expressRes.status(this._statusCode).json(data)
        this._sent = true
        return this
    }

    setHeader(key: string, value: string): this {
        this._expressRes.setHeader(key, value)
        return this
    }
}
