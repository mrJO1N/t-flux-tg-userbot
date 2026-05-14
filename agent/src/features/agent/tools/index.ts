import { tool } from "@langchain/core/tools";
import { z } from "zod"
import { Inject, Singleton, ConfigProvider } from "../../../infrastructure";
import { RealityToolsProvider } from "./reality.tools";
import { MapToolsProvider } from "./maps.tools";
import { ScheduledToolsProvider } from "./schedule.tools";
import { RagToolsProvider } from "./rag.tools";

@Singleton()
export class AgentToolsProvider {
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
        @Inject(RealityToolsProvider) private readonly realityToolsProvider: RealityToolsProvider,
        @Inject(MapToolsProvider) private readonly mapsToolsProvider: MapToolsProvider,
        @Inject(ScheduledToolsProvider) private readonly scheduledToolsProvider: ScheduledToolsProvider,
        @Inject(RagToolsProvider) private readonly ragToolsProvider: RagToolsProvider,
    ) {
    }

    get tools() {
        return [
            this.getCurrentTimeTool,
            this.calculatorTool,
            ...this.ragToolsProvider.tools,
            ...this.realityToolsProvider.tools,
            ...this.mapsToolsProvider.tools,
            ...this.scheduledToolsProvider.tools
        ]
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


}


