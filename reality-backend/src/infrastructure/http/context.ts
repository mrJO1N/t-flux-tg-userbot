import type { ValidateSchema } from './decorators'

export class HttpRequest<TQuery = Record<string, string>, TBody = unknown, TParams = Record<string, string>> {
    query!: TQuery
    params!: TParams
    body!: TBody
    headers: Headers

    constructor(private _raw: Request, rawParams: Record<string, string> = {}) {
        const url = new URL(_raw.url)
        this.query = Object.fromEntries(url.searchParams) as TQuery
        this.params = rawParams as TParams
        this.headers = _raw.headers
    }

    async parseBody(): Promise<void> {
        const ct = this.headers.get('content-type') ?? ''
        if (ct.includes('application/json')) {
            this.body = await this._raw.json()
        } else if (ct.includes('text/')) {
            this.body = await this._raw.text() as TBody
        } else {
            this.body = null as TBody
        }
    }
}

type InferSchema<T> = T extends { parse(...args: any[]): infer R } ? R : never

export type Typed<TSchema extends ValidateSchema> = HttpRequest<
    [InferSchema<TSchema['query']>] extends [never] ? Record<string, string> : InferSchema<TSchema['query']>,
    [InferSchema<TSchema['body']>] extends [never] ? unknown : InferSchema<TSchema['body']>,
    [InferSchema<TSchema['params']>] extends [never] ? Record<string, string> : InferSchema<TSchema['params']>
>

export class HttpResponse {
    private _status = 200
    private _body: string | null = null
    private _headers: Record<string, string> = { 'Content-Type': 'application/json' }
    private _sent = false

    get sent() { return this._sent }

    status(code: number): this {
        this._status = code
        return this
    }

    send(data: unknown): this {
        this._body = typeof data === 'string' ? data : JSON.stringify(data)
        this._sent = true
        return this
    }

    json(data: unknown): this {
        this._body = JSON.stringify(data)
        this._headers['Content-Type'] = 'application/json'
        this._sent = true
        return this
    }

    setHeader(key: string, value: string): this {
        this._headers[key] = value
        return this
    }

    toBunResponse(): Response {
        return new Response(this._body, {
            status: this._status,
            headers: this._headers,
        })
    }
}
