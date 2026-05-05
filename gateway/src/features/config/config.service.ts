import { Inject, Singleton } from "../../infrastructure";
import { ConfigProvider } from "./config.provider";
import { Telegraf } from "telegraf";
import mongoose from "mongoose"

@Singleton()
export class ConfigService {
    private readonly tgBot: Telegraf
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider
    ) {
        this.tgBot = new Telegraf(config.TG_BOT_TOKEN)
    }


    async connectDB() {
        const uri = this.config.DB_URI;

        await mongoose.connect(uri);
        console.log("🍃 MongoDB connected successfully");
    }

    getTGBot() {
        return this.tgBot
    }
}


