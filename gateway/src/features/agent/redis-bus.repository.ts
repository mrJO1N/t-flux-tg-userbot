import { Inject, Singleton } from "../../infrastructure"
import { UtilDataBusRepository } from "../utils/util.data-bus.repository"

@Singleton()
export class RedisBus {
    private readonly pending = new Map<string, (ts: number) => void>()
    private readonly chatPending = new Map<string, (reply: string) => void>()

    constructor(@Inject(UtilDataBusRepository) private readonly bus: UtilDataBusRepository) {
        this.bus.subscribe("bus:pong", (data) => {
            const { id, ts } = data as { id: string; ts: number }
            const resolve = this.pending.get(id)
            if (!resolve) return
            this.pending.delete(id)
            resolve(ts)
        })

        this.bus.subscribe("bus:chat:reply", (data) => {
            const { id, reply } = data as { id: string; reply: string }
            const resolve = this.chatPending.get(id)
            if (!resolve) return
            this.chatPending.delete(id)
            resolve(reply)
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

    async chat(userId: string, message: string, timeoutMs = 30_000): Promise<string> {
        const id = crypto.randomUUID()
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.chatPending.delete(id)
                reject(new Error("agent chat timeout"))
            }, timeoutMs)

            this.chatPending.set(id, (reply) => {
                clearTimeout(timer)
                resolve(reply)
            })

            this.bus.publish("bus:chat", { id, userId, message })
        })
    }
}
