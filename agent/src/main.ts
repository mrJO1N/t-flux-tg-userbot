import "reflect-metadata"
import "./features"

import { Inject, resolveDep, Singleton, LoggerService } from "./infrastructure";
import { AgentProvider } from "./features/agent";
import { MessageBusRepo } from "./message-bus.repo";

@Singleton()
class App {
    constructor(
        @Inject(AgentProvider) private readonly agentProvider: AgentProvider,
        @Inject(MessageBusRepo) private readonly messageBusRepo: MessageBusRepo,
        @Inject(LoggerService) private readonly logger: LoggerService
    ) { }

    async run() {
        await this.agentProvider.init()
        this.messageBusRepo.listen()
    }
}

const app = resolveDep(App)
const logger = resolveDep(LoggerService)
app.run()
    .then(() => logger.info("run"))
    .catch(err => logger.error("Fatal error", err))