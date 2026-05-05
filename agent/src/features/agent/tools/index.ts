import { tool } from "@langchain/core/tools";
import { z } from "zod"
import { Singleton } from "../../../infrastructure";

@Singleton()
export class AgentToolsProvider {
    constructor(
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
        async ({ expression }) => {
            try {
                // Safe eval: only allow math expressions
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

    get tools() {
        return [this.getCurrentTimeTool, this.calculatorTool]
    }
}


