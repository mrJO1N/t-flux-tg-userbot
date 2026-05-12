import { Singleton } from "../../infrastructure/injector"

// config.ts
const rawConfigSchema = {
    LOG_LEVEL: "string",
    REDIS_URL: { type: "string", required: true },
    OPENAI_API_KEY: { type: "string", required: true },
    OPENAI_BASE_URL: { type: "string", required: true },
    REALITY_BACKEND_URL: { type: "string", required: true },
} as const




const configSchema = Object.entries(rawConfigSchema).reduce(
    (acc, [key, value]) => {
        const isString = typeof value === 'string'
        acc[key as keyof typeof rawConfigSchema] = {
            type: (isString ? value : value.type) as 'string' | 'number' | 'boolean',
            required: isString ? false : value.required ?? false,
        }
        return acc
    },
    {} as Record<string, { type: 'string' | 'number' | 'boolean'; required: boolean }>
)

type ConfigSchema = typeof configSchema

type MapType<T extends 'string' | 'number' | 'boolean'> = T extends 'string'
    ? string
    : T extends 'number'
    ? number
    : T extends 'boolean'
    ? boolean
    : never

type IConfig = {
    [K in keyof ConfigSchema]: ConfigSchema[K]['required'] extends true
    ? MapType<ConfigSchema[K]['type']>
    : MapType<ConfigSchema[K]['type']> | undefined
}

@Singleton()
export class ConfigProvider implements IConfig {
    [key: string]: any

    constructor() {
        this.validate()
        this.load()
    }

    private validate(): void {
        const missing: string[] = []

        for (const [key, schema] of Object.entries(configSchema)) {
            const value = process.env[key]

            if (schema.required && !value) {
                missing.push(key)
                continue
            }

            if (value && !this.isValidType(value, schema.type)) {
                throw new Error(
                    `Environment variable "${key}" has invalid type. Expected ${schema.type}, got ${typeof value}`
                )
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
        }
    }

    private isValidType(value: string, type: string): boolean {
        if (type === 'string') return true
        if (type === 'number') return !isNaN(Number(value))
        if (type === 'boolean') return ['true', 'false'].includes(value.toLowerCase())
        return false
    }

    private load(): void {
        for (const [key, schema] of Object.entries(configSchema)) {
            const value = process.env[key]

            if (!value) continue

            switch (schema.type) {
                case 'number':
                    this[key] = Number(value)
                    break
                case 'boolean':
                    this[key] = value.toLowerCase() === 'true'
                    break
                default:
                    this[key] = value
            }
        }
    }
}

export { configSchema }
