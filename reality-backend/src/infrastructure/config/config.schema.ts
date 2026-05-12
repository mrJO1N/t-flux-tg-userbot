export default {
    // Node.js base
    NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'] as const },

    DB_URI: { type: "string", required: true },
    REDIS_URL: { type: "string", required: true },
    HTTP_PORT: { type: "number" },
    ENABLE_EXTENDED_ERROR_LOGS: { type: "boolean" },
} as const
