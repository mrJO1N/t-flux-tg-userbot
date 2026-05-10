export default {
    // Node.js base
    NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'] as const },
    PORT: "number",

    TG_BOT_TOKEN: { type: 'string', required: true },
    LOG_LEVEL: "string",
    DB_URI: { type: "string", required: true },
    REDIS_URL: { type: "string", required: true },

} as const
