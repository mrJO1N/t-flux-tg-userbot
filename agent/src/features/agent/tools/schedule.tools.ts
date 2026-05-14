import { tool } from "@langchain/core/tools";
import { z } from "zod"
import { Inject, Singleton } from "../../../infrastructure";
import { UtilCacheRepository } from "../../utils/util.cache.repository";
import { UtilDataBusRepository } from "../../utils/util.data-bus.repository";

interface ScheduledView {
    id: string;
    address: string;
    time: string;
    notes: string;
    createdAt: string;
}

function dayKey(isoDate: string): string {
    return `schedule:views:${isoDate.slice(0, 10)}`;
}

function formatViewMessage(label: string, view: ScheduledView): string {
    return `📅 ${label}\nАдрес: ${view.address}\nВремя: ${view.time}\nЗаметки агенту: ${view.notes}`;
}

@Singleton()
export class ScheduledToolsProvider {
    constructor(
        @Inject(UtilCacheRepository) private cache: UtilCacheRepository,
        @Inject(UtilDataBusRepository) private bus: UtilDataBusRepository,
    ) {}

    private async getViewsForDay(day: string): Promise<ScheduledView[]> {
        return (await this.cache.get<ScheduledView[]>(dayKey(day))) ?? [];
    }

    private async saveViewsForDay(day: string, views: ScheduledView[]): Promise<void> {
        await this.cache.set(dayKey(day), views);
    }

    private scheduleViewTool = tool(
        async ({ address, time, notes }: { address: string; time: string; notes: string }) => {
            try {
                const day = time.slice(0, 10);
                const views = await this.getViewsForDay(day);
                const view: ScheduledView = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    address,
                    time,
                    notes,
                    createdAt: new Date().toISOString(),
                };
                views.push(view);
                await this.saveViewsForDay(day, views);
                await this.bus.publish("bus:notify", {
                    text: formatViewMessage("Новый просмотр записан", view),
                });
                return JSON.stringify({ ok: true, id: view.id });
            } catch (e) {
                return `Error: ${(e as Error).message}`;
            }
        },
        {
            name: "schedule_view",
            description: "Schedule a property viewing at a given address and time. Sends a Telegram notification to the employee agent with the notes.",
            schema: z.object({
                address: z.string().describe("Property address, e.g. 'ул. Горького 60, Сочи'"),
                time: z.string().describe("Viewing datetime in ISO 8601 format, e.g. '2025-06-10T14:00:00'"),
                notes: z.string().describe("AI agent notes for the employee agent: client wishes, context, things to pay attention to"),
            }),
        }
    );

    private getScheduledViewsTool = tool(
        async ({ day }: { day: string }) => {
            try {
                const views = await this.getViewsForDay(day);
                if (!views.length) return `No viewings scheduled for ${day}`;
                return JSON.stringify(views);
            } catch (e) {
                return `Error: ${(e as Error).message}`;
            }
        },
        {
            name: "get_scheduled_views",
            description: "Get all property viewings scheduled for a specific day.",
            schema: z.object({
                day: z.string().describe("Date in YYYY-MM-DD format, e.g. '2025-06-10'"),
            }),
        }
    );

    private changeTimeOfScheduledViewTool = tool(
        async ({ address, oldTime, newTime, notes }: { address: string; oldTime: string; newTime: string; notes: string }) => {
            try {
                const oldDay = oldTime.slice(0, 10);
                const newDay = newTime.slice(0, 10);

                const oldViews = await this.getViewsForDay(oldDay);
                const idx = oldViews.findIndex(
                    v => v.address === address && v.time === oldTime,
                );
                if (idx === -1) return `Error: no viewing found for address "${address}" at ${oldTime}`;

                const [view] = oldViews.splice(idx, 1) as [ScheduledView];
                await this.saveViewsForDay(oldDay, oldViews);

                const updated: ScheduledView = { ...view, time: newTime, notes };
                const newViews = await this.getViewsForDay(newDay);
                newViews.push(updated);
                await this.saveViewsForDay(newDay, newViews);

                await this.bus.publish("bus:notify", {
                    text: formatViewMessage(
                        `Просмотр перенесён (было: ${oldTime})`,
                        updated,
                    ),
                });
                return JSON.stringify({ ok: true, id: updated.id });
            } catch (e) {
                return `Error: ${(e as Error).message}`;
            }
        },
        {
            name: "change_time_of_scheduled_view",
            description: "Reschedule an existing property viewing to a new time. Sends a Telegram notification with updated info.",
            schema: z.object({
                address: z.string().describe("Property address identifying the viewing"),
                oldTime: z.string().describe("Current viewing datetime in ISO 8601 format"),
                newTime: z.string().describe("New viewing datetime in ISO 8601 format"),
                notes: z.string().describe("Updated AI agent notes for the employee agent"),
            }),
        }
    );

    get tools() {
        return [
            this.scheduleViewTool,
            this.getScheduledViewsTool,
            this.changeTimeOfScheduledViewTool,
        ];
    }
}
