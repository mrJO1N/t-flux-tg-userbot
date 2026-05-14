import Redis from "ioredis"
import { Inject, Singleton } from "../../infrastructure"
import { ConfigProvider } from "../../infrastructure"

type Handler = (data: unknown) => void

@Singleton()
export class UtilDataBusRepository {
    private readonly pub: Redis
    private readonly sub: Redis
    private readonly handlers = new Map<string, Set<Handler>>()

    constructor(@Inject(ConfigProvider) config: ConfigProvider) {
        this.pub = new Redis(config.REDIS_URL)
        this.sub = new Redis(config.REDIS_URL)

        this.sub.on("message", (channel, raw) => {
            const handlers = this.handlers.get(channel)
            if (!handlers) return
            const data = JSON.parse(raw) as unknown
            for (const handler of handlers) handler(data)
        })
    }

    async publish(channel: string, data: unknown): Promise<void> {
        await this.pub.publish(channel, JSON.stringify(data))
    }

    async subscribe(channel: string, handler: Handler): Promise<void> {
        if (!this.handlers.has(channel)) {
            this.handlers.set(channel, new Set())
            await this.sub.subscribe(channel)
        }
        this.handlers.get(channel)!.add(handler)
    }

    async unsubscribe(channel: string, handler: Handler): Promise<void> {
        const handlers = this.handlers.get(channel)
        if (!handlers) return
        handlers.delete(handler)
        if (handlers.size === 0) {
            this.handlers.delete(channel)
            await this.sub.unsubscribe(channel)
        }
    }
}
