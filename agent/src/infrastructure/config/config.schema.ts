export const rawConfigSchema = {
    LOG_LEVEL: "string",
    REDIS_URL: { type: "string", required: true },
    DB_URL: { type: "string", required: true },
    OPENAI_API_KEY: { type: "string", required: true },
    OPENAI_BASE_URL: { type: "string", required: true },
    OPENAI_EMBEDDINGS_MODEL: "string",
    REALITY_BACKEND_URL: { type: "string", required: true },
    YANDEX_MAPS_API_KEY: { type: "string", required: true },
} as const

