import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { BaseMessage, mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { Inject, Singleton } from "../../infrastructure";
import { ConfigProvider } from "../config";
import { UtilCacheRepository } from "../utils";
import { AgentToolsProvider } from "./tools";

const SESSION_TTL_MS = 60 * 60 * 24 * 1000

class RepoChatHistory extends BaseListChatMessageHistory {
    lc_namespace = ["agent", "chat_history"]

    constructor(
        private readonly cache: UtilCacheRepository,
        private readonly key: string,
    ) {
        super()
    }

    async getMessages(): Promise<BaseMessage[]> {
        const stored = await this.cache.get<ReturnType<typeof mapChatMessagesToStoredMessages>>(this.key)
        return stored ? mapStoredMessagesToChatMessages(stored) : []
    }

    async addMessage(message: BaseMessage): Promise<void> {
        const messages = await this.getMessages()
        messages.push(message)
        await this.cache.set(this.key, mapChatMessagesToStoredMessages(messages), SESSION_TTL_MS)
    }

    async clear(): Promise<void> {
        await this.cache.delete(this.key)
    }
}

@Singleton()
export class AgentProvider {
    private agentWithHistory!: RunnableWithMessageHistory<{ input: string }, Record<string, unknown>>

    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
        @Inject(UtilCacheRepository) private readonly cache: UtilCacheRepository,
        @Inject(AgentToolsProvider) private readonly agentToolsProvider: AgentToolsProvider
    ) { }

    async init(): Promise<void> {
        const llm = new ChatOpenAI({
            model: "gemini-3-flash",
            temperature: 0.3,
            apiKey: this.config.OPENAI_API_KEY,
            configuration: { baseURL: this.config.OPENAI_BASE_URL },
        })

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful AI assistant. Be concise and accurate."],
            new MessagesPlaceholder("chat_history"),
            ["human", "{input}"],
            new MessagesPlaceholder("agent_scratchpad"),
        ])

        const agentRunnable = await createOpenAIToolsAgent({ llm, tools: this.agentToolsProvider.tools, prompt })

        const executor = new AgentExecutor({ agent: agentRunnable, tools: this.agentToolsProvider.tools, maxIterations: 5 })

        this.agentWithHistory = new RunnableWithMessageHistory({
            runnable: executor,
            getMessageHistory: (sessionId) =>
                new RepoChatHistory(this.cache, `agent:session:${sessionId}`),
            inputMessagesKey: "input",
            historyMessagesKey: "chat_history",
        })
    }

    async *stream(userId: string, message: string): AsyncGenerator<string> {
        const events = this.agentWithHistory.streamEvents(
            { input: message },
            { version: "v2", configurable: { sessionId: userId } },
        )

        for await (const event of events) {
            if (
                event.event === "on_chat_model_stream" &&
                typeof event.data?.chunk?.content === "string" &&
                event.data.chunk.content.length > 0
            ) {
                yield event.data.chunk.content
            }
        }
    }
}
