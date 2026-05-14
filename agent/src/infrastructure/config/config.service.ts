import mongoose from "mongoose";
import { Inject, Singleton } from "..";
import { ConfigProvider } from "./config.provider";

@Singleton()
export class ConfigService {
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider
    ) {}

    async connectDB(): Promise<void> {
        await mongoose.connect(this.config.DB_URL);
    }
}


