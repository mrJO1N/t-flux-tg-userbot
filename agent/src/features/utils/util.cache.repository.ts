import Redis from "ioredis"
import { Inject, Singleton } from "../../infrastructure"
import { ConfigProvider } from "../config"

@Singleton()
export class UtilCacheRepository {
    private readonly client: Redis

    constructor(@Inject(ConfigProvider) config: ConfigProvider) {
        this.client = new Redis(config.REDIS_URL)
    }

    async get<T>(key: string): Promise<T | null> {
        const raw = await this.client.get(key)
        if (raw === null) return null
        return JSON.parse(raw) as T
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        const serialized = JSON.stringify(value)
        if (ttlMs !== undefined) {
            await this.client.set(key, serialized, "PX", ttlMs)
        } else {
            await this.client.set(key, serialized)
        }
    }

    async delete(key: string): Promise<void> {
        await this.client.del(key)
    }
}
