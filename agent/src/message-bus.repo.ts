import { Redis } from "ioredis";
import { AgentProvider, ConfigProvider } from "./features"
import { Inject, Injectable, LoggerService } from "./infrastructure";

@Injectable()
export class MessageBusRepo {
    private readonly pub: Redis;
    private readonly sub: Redis;

    constructor(
        @Inject(ConfigProvider) config: ConfigProvider,
        @Inject(LoggerService) private readonly logger: LoggerService,
        @Inject(AgentProvider) private readonly agentProvider: AgentProvider
    ) {
        const redisUrl = config.REDIS_URL

        this.pub = new Redis(redisUrl);
        this.sub = new Redis(redisUrl);
    }

    listen() {
        this.sub.subscribe("bus:chat", (err) => {
            if (err) { this.logger.error("message bus subscribe error", err); return; }
            this.logger.info("message bus listening on bus:chat");
        });

        this.sub.on("message", (_channel, msg) => {
            const { id, userId, message } = JSON.parse(msg) as { id: string; userId: string; message: string };
            this.handleChat(id, userId, message);
        });
    }

    private async handleChat(id: string, userId: string, message: string) {
        try {
            for await (const chunk of this.agentProvider.stream(userId, message)) {
                await this.pub.publish("bus:chat:chunk", JSON.stringify({ id, chunk, done: false }));
            }
            await this.pub.publish("bus:chat:chunk", JSON.stringify({ id, chunk: "", done: true }));
            this.logger.info("chat stream done", { id, userId });
        } catch (err) {
            this.logger.error("chat stream error", err, { id, userId });
            await this.pub.publish("bus:chat:chunk", JSON.stringify({ id, chunk: "Sorry, something went wrong.", done: true }));
        }
    }
}
