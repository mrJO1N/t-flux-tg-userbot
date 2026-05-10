import "reflect-metadata"
import "./features"

import { Inject, resolveDep, Singleton, LoggerProvider, ConfigService } from "./infrastructure";
import { TgBotService } from "./features/tg-bot"
import { TgUserBotService } from "./features/tg-user-bot";
import { RedisBusRepo } from "./features/agent";


@Singleton()
class App {

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(TgBotService) private readonly tgBotService: TgBotService,
        @Inject(TgUserBotService) private readonly tgUserBotService: TgUserBotService,
        @Inject(RedisBusRepo) private readonly redisBus: RedisBusRepo,
        @Inject(LoggerProvider) private readonly logger: LoggerProvider
    ) { }

    async run() {
        await this.configService.connectDB()
        await this.tgBotService.init()
        // await this.tgUserBotService.init()

        this.logger.info("run!")
    }
}

const app = resolveDep(App)
const logger = resolveDep(LoggerProvider)
app.run()
    .catch(err => logger.error("Fatal error", err))