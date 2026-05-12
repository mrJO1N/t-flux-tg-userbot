import { Singleton } from "../injector"
import rawConfigSchema from "./config.schema"

type GetTypeName<T> = T extends string ? T : T extends { type: string } ? T['type'] : never
type IsRequired<T> = T extends { required: true } ? true : false
type GetEnum<T> = T extends { enum: readonly (infer U)[] } ? U : never
type HasEnum<T> = [GetEnum<T>] extends [never] ? false : true
type MapType<T extends string> =
    T extends 'string' ? string :
    T extends 'number' ? number :
    T extends 'boolean' ? boolean :
    never
type ResolveType<T> =
    HasEnum<T> extends true
        ? GetEnum<T>
        : MapType<GetTypeName<T> & string>

export type IConfig = {
    [K in keyof typeof rawConfigSchema]:
        IsRequired<typeof rawConfigSchema[K]> extends true
            ? ResolveType<typeof rawConfigSchema[K]>
            : ResolveType<typeof rawConfigSchema[K]> | undefined
}

type RuntimeEntry = { type: 'string' | 'number' | 'boolean'; required: boolean; enum?: readonly string[] }

const configSchema = Object.entries(rawConfigSchema).reduce(
    (acc, [key, value]) => {
        const isString = typeof value === 'string'
        const v = value as { type?: string; required?: boolean; enum?: readonly string[] }
        const entry: RuntimeEntry = {
            type: (isString ? value : v.type) as 'string' | 'number' | 'boolean',
            required: isString ? false : v.required ?? false,
        }
        if (!isString && v.enum) entry.enum = v.enum
        acc[key] = entry
        return acc
    },
    {} as Record<string, RuntimeEntry>
)

// Declaration merging: attaches IConfig properties to ConfigProvider without [key: string]: any
export interface ConfigProvider extends IConfig { }

@Singleton()
export class ConfigProvider {
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

            if (value && schema.enum && !schema.enum.includes(value)) {
                throw new Error(
                    `Environment variable "${key}" must be one of: ${schema.enum.join(', ')}. Got "${value}"`
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
        if (type === 'boolean') return ['true', 'false', '1', '0'].includes(value.toLowerCase())
        return false
    }

    private load(): void {
        for (const [key, schema] of Object.entries(configSchema)) {
            const value = process.env[key]

            if (!value) continue

            const self = this as Record<string, unknown>
            switch (schema.type) {
                case 'number':
                    self[key] = Number(value)
                    break
                case 'boolean':
                    self[key] = value === '1' || value.toLowerCase() === 'true'
                    break
                default:
                    self[key] = value
            }
        }
    }
}

export { configSchema }
