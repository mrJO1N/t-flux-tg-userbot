import "reflect-metadata"
import "./features"

import { Inject, resolveDep, Singleton, LoggerService } from "./infrastructure";
import { TgBotService } from "./features/tg-bot"
import { TgUserBotService } from "./features/tg-user-bot";
import { ConfigService } from "./features";


@Singleton()
class App {

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(TgBotService) private readonly tgBotService: TgBotService,
        @Inject(TgUserBotService) private readonly tgUserBotService: TgUserBotService
    ) { }

    async run() {
        await this.tgBotService.init()
        // await this.tgUserBotService.init()
        await this.configService.connectDB()
    }
}

const app = resolveDep(App)
const logger = resolveDep(LoggerService)
app.run()
    .then(() => logger.info("run"))
    .catch(err => logger.error("Fatal error", err))