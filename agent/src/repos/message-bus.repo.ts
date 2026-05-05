import { Redis } from "ioredis";
import type { Logger } from "pino";
import { runAgent } from "../agent.ts";

export class MessageBusRepo {
    private readonly pub: Redis;
    private readonly sub: Redis;

    constructor(redisUrl: string, private readonly log: Logger) {
        this.pub = new Redis(redisUrl);
        this.sub = new Redis(redisUrl);
    }

    listen() {
        this.sub.subscribe("bus:ping", "bus:chat", (err) => {
            if (err) { this.log.error(err, "message bus subscribe error"); return; }
            this.log.info("message bus listening on bus:ping, bus:chat");
        });

        this.sub.on("message", (channel, msg) => {
            if (channel === "bus:ping") {
                const payload = JSON.parse(msg) as { id: string; ts: number };
                this.pub.publish("bus:pong", JSON.stringify(payload));
                return;
            }

            if (channel === "bus:chat") {
                const { id, userId, message } = JSON.parse(msg) as { id: string; userId: string; message: string };
                this.handleChat(id, userId, message);
            }
        });
    }

    private async handleChat(id: string, userId: string, message: string) {
        try {
            const reply = await runAgent(userId, message);
            this.log.info({ id, userId }, "chat reply sent");
            await this.pub.publish("bus:chat:reply", JSON.stringify({ id, reply }));
        } catch (err) {
            this.log.error({ err, id, userId }, "chat error");
            await this.pub.publish("bus:chat:reply", JSON.stringify({ id, reply: "Sorry, something went wrong." }));
        }
    }
}
