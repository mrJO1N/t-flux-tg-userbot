import "reflect-metadata"
import "./features"

import { Inject, resolveDep, Singleton, LoggerProvider, ConfigService, ConfigProvider, HttpServer } from "./infrastructure";
import { RedisBusRepo } from "./features/agent";

@Singleton()
class App {

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
        @Inject(RedisBusRepo) private readonly redisBus: RedisBusRepo,
        @Inject(LoggerProvider) private readonly logger: LoggerProvider,
        @Inject(HttpServer) private readonly httpServer: HttpServer,
    ) { }

    async run() {
        await this.configService.connectDB()

        const port = this.config.HTTP_PORT ?? 3000

        this.httpServer.addRoute('GET', '/healthcheck', (_, res) => {
            res.json({ status: 'ok', uptime: process.uptime() })
        })

        this.httpServer.listen(port)
        this.logger.info(`HTTP server listening on port ${port}`)
    }
}

const app = resolveDep(App)
const logger = resolveDep(LoggerProvider)
app.run()
    .catch(err => logger.error("Fatal error", err))
