import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Inject, Singleton } from "../../../infrastructure";
import { RagProvider } from "../../rag";

@Singleton()
export class RagToolsProvider {
    constructor(
        @Inject(RagProvider) private readonly ragProvider: RagProvider,
    ) {}

    private searchKnowledgeBaseTool = tool(
        async ({ query }: { query: string }) => {
            const result = await this.ragProvider.query(query);
            return result || "No relevant information found.";
        },
        {
            name: "search_knowledge_base",
            description: "Search the internal knowledge base for information such as addresses, contacts, prices, policies, or any domain-specific facts. Use this whenever the user asks about specific details you may not know.",
            schema: z.object({
                query: z.string().describe("The question or topic to search for"),
            }),
        }
    );

    get tools() {
        return [this.searchKnowledgeBaseTool];
    }
}
