import { Redis } from "ioredis";
import type { Logger } from "pino";

export class MessageBusRepo {
    private readonly pub: Redis;
    private readonly sub: Redis;

    constructor(redisUrl: string, private readonly log: Logger) {
        this.pub = new Redis(redisUrl);
        this.sub = new Redis(redisUrl);
    }

    listen() {
        this.sub.subscribe("bus:ping", (err) => {
            if (err) { this.log.error(err, "message bus subscribe error"); return; }
            console.log("subscribe")
            this.log.info("message bus listening on bus:ping");
        });

        this.sub.on("message", (_ch, msg) => {
            const payload = JSON.parse(msg) as { id: string; ts: number };
            console.log(`on message`, msg)
            this.pub.publish("bus:pong", JSON.stringify(payload));
        });
    }
}
