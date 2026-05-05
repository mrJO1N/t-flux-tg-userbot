import pino from "pino";
import { runAgent } from "./agent.ts";

const log = pino({ transport: { target: "pino-pretty" } });
const PORT = Number(process.env["PORT"] ?? 3001);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      if (
        typeof body !== "object" ||
        body === null ||
        typeof (body as Record<string, unknown>)["userId"] !== "string" ||
        typeof (body as Record<string, unknown>)["message"] !== "string"
      ) {
        return Response.json({ error: "userId and message are required" }, { status: 400 });
      }

      const { userId, message } = body as { userId: string; message: string };

      try {
        const reply = await runAgent(userId, message);
        log.info({ userId, message, reply }, "agent response");
        return Response.json({ reply });
      } catch (err) {
        log.error({ err, userId }, "agent error");
        return Response.json({ error: "Agent error" }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

log.info(`Agent listening on port ${PORT}`);
