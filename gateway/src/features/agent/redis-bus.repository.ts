import { Inject, Singleton } from "../../infrastructure"
import { UtilDataBusRepository } from "../utils/util.data-bus.repository"

@Singleton()
export class RedisBus {
    private readonly pending = new Map<string, (ts: number) => void>()

    constructor(@Inject(UtilDataBusRepository) private readonly bus: UtilDataBusRepository) {
        this.bus.subscribe("bus:pong", (data) => {
            const { id, ts } = data as { id: string; ts: number }
            const resolve = this.pending.get(id)
            if (!resolve) return
            this.pending.delete(id)
            resolve(ts)
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
}
