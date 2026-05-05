import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { RedisChatMessageHistory } from "@langchain/community/stores/message/ioredis";
import { Redis } from "ioredis";
import { agentTools } from "./tools/index.ts";

const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379");

const llm = new ChatOpenAI({
  model: "gemini-3-flash",
  temperature: 0.3,
  apiKey: process.env["OPENAI_API_KEY"],
  configuration: {
    baseURL: process.env["OPENAI_BASE_URL"],
  },
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful AI assistant. Be concise and accurate."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const agentRunnable = await createOpenAIToolsAgent({ llm, tools: agentTools, prompt });

const executor = new AgentExecutor({
  agent: agentRunnable,
  tools: agentTools,
  maxIterations: 5,
});

const agentWithHistory = new RunnableWithMessageHistory({
  runnable: executor,
  getMessageHistory: (sessionId: string) =>
    new RedisChatMessageHistory({
      sessionId,
      client: redis,
      ttl: 60 * 60 * 24, // 24h
    }),
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
});

export async function runAgent(userId: string, message: string): Promise<string> {
  const result = await agentWithHistory.invoke(
    { input: message },
    { configurable: { sessionId: `agent:session:${userId}` } }
  );
  return String(result["output"] ?? "");
}

export async function* streamAgent(userId: string, message: string): AsyncGenerator<string> {
  const stream = agentWithHistory.streamEvents(
    { input: message },
    { version: "v2", configurable: { sessionId: `agent:session:${userId}` } }
  );

  for await (const event of stream) {
    if (
      event.event === "on_chat_model_stream" &&
      typeof event.data?.chunk?.content === "string" &&
      event.data.chunk.content.length > 0
    ) {
      yield event.data.chunk.content;
    }
  }
}
