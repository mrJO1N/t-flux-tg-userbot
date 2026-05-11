import { ConfigProvider } from "./config";
import { forwardRef, Inject, Injectable } from "./index";
import pino, { type Logger } from "pino";

@Injectable()
export class LoggerProvider {
    public readonly pino: Logger;

    constructor(
        @Inject(forwardRef(() => ConfigProvider)) private readonly config: ConfigProvider
    ) {
        const isDev = this.config.NODE_ENV !== "production";

        if (isDev) {
            this.pino = pino({
                level: 'debug',
                transport: {
                    target: 'pino-pretty',
                    options: { colorize: true }
                }
            });
        } else {
            this.pino = pino({
                level: config.LOG_LEVEL || "info",
            });
        }
    }

    info(msg: string, payload?: object) {
        this.pino.info(payload || {}, msg);
    }

    error(msg: string, error?: unknown, payload?: object) {
        this.pino.error({ err: error, ...payload }, msg);
    }

    warn(msg: string, payload?: object) {
        this.pino.warn(payload || {}, msg);
    }

    debug(msg: string, payload?: object) {
        this.pino.debug(payload || {}, msg);
    }

    debugError(msg: string, error?: unknown, payload?: object) {
        if (this.pino.isLevelEnabled("debug"))
            this.error(msg, error, payload)
    }
}