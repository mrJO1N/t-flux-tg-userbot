import { tool } from "@langchain/core/tools";
import { z } from "zod"
import { Inject, Singleton } from "../../../infrastructure";
import { ConfigProvider } from "../../config/config.provider";

@Singleton()
export class AgentToolsProvider {
    constructor(
        @Inject(ConfigProvider) private config: ConfigProvider,
    ) {
    }

    private getCurrentTimeTool = tool(
        async () => new Date().toISOString(),
        {
            name: "get_current_time",
            description: "Returns the current UTC date and time.",
            schema: z.object({}),
        }
    );

    private calculatorTool = tool(
        async ({ expression }: { expression: string }) => {
            try {
                const result = Function(`"use strict"; return (${expression})`)();
                return String(result);
            } catch {
                return "Invalid expression";
            }
        },
        {
            name: "calculator",
            description: "Evaluates a math expression and returns the result.",
            schema: z.object({
                expression: z.string().describe("A math expression, e.g. '2 + 2 * 10'"),
            }),
        }
    );

    private searchRealityObjectsTool = tool(
        async ({ query }: { query: string }) => {
            try {
                const url = `${this.config.REALITY_BACKEND_URL}/api/reality/search?query=${encodeURIComponent(query)}`;
                const res = await fetch(url);
                if (!res.ok) return `Error: server responded with ${res.status}`;
                return JSON.stringify(await res.json());
            } catch (e) {
                return `Error: ${(e as Error).message}`;
            }
        },
        {
            name: "search_reality_objects",
            description: "Search real estate listings by a text query (city, street, district, etc.). Returns a list of matching objects.",
            schema: z.object({
                query: z.string().describe("Search query, e.g. 'Краснодар 2-комнатная' or a street name"),
            }),
        }
    );

    private getRealityObjectTool = tool(
        async ({ id }: { id: string }) => {
            try {
                const url = `${this.config.REALITY_BACKEND_URL}/api/reality/${encodeURIComponent(id)}`;
                const res = await fetch(url);
                if (!res.ok) return `Error: server responded with ${res.status}`;
                return JSON.stringify(await res.json());
            } catch (e) {
                return `Error: ${(e as Error).message}`;
            }
        },
        {
            name: "get_reality_object",
            description: "Get a single real estate object by its ID. Returns full details including address, area, price and deal type.",
            schema: z.object({
                id: z.string().describe("The ID of the reality object"),
            }),
        }
    );

    get tools() {
        return [
            this.getCurrentTimeTool,
            this.calculatorTool,
            this.searchRealityObjectsTool,
            this.getRealityObjectTool,
        ]
    }
}


