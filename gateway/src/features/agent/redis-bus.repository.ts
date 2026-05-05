import { Inject, Singleton } from "../../infrastructure"
import { UtilDataBusRepository } from "../utils/util.data-bus.repository"

export type ChunkHandler = (chunk: string, done: boolean) => void

@Singleton()
export class RedisBus {
    private readonly pending = new Map<string, (ts: number) => void>()
    private readonly chunkHandlers = new Map<string, ChunkHandler>()

    constructor(@Inject(UtilDataBusRepository) private readonly bus: UtilDataBusRepository) {
        this.bus.subscribe("bus:pong", (data) => {
            const { id, ts } = data as { id: string; ts: number }
            const resolve = this.pending.get(id)
            if (!resolve) return
            this.pending.delete(id)
            resolve(ts)
        })

        this.bus.subscribe("bus:chat:chunk", (data) => {
            const { id, chunk, done } = data as { id: string; chunk: string; done: boolean }
            const handler = this.chunkHandlers.get(id)
            if (!handler) return
            if (done) this.chunkHandlers.delete(id)
            handler(chunk, done)
        })
    }

    async ping(timeoutMs = 5_000): Promise<number> {
        const id = crypto.randomUUID()
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id)
                reject(new Error("agent ping timeout"))
            }, timeoutMs)

            this.pending.set(id, (ts) => {
                clearTimeout(timer)
                resolve(ts)
            })

            this.bus.publish("bus:ping", { id, ts: Date.now() })
        })
    }

    async chat(
        userId: string,
        message: string,
        onChunk: ChunkHandler,
        timeoutMs = 30_000,
    ): Promise<void> {
        const id = crypto.randomUUID()
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.chunkHandlers.delete(id)
                reject(new Error("agent chat timeout"))
            }, timeoutMs)

            this.chunkHandlers.set(id, (chunk, done) => {
                onChunk(chunk, done)
                if (done) {
                    clearTimeout(timer)
                    resolve()
                }
            })

            this.bus.publish("bus:chat", { id, userId, message })
        })
    }
}
