import { Inject, Singleton } from "..";
import { ConfigProvider } from "./config.provider";
import mongoose from "mongoose"

@Singleton()
export class ConfigService {
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider
    ) {
    }


    async connectDB() {
        const uri = this.config.DB_URI;

        await mongoose.connect(uri);
        await mongoose.connection.syncIndexes();
        console.log("🍃 MongoDB connected successfully");
    }
}


