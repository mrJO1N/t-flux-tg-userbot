import { Inject, Singleton } from "../../infrastructure";
import { ConfigProvider } from "./config.provider";

@Singleton()
export class ConfigService {
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider
    ) {
    }
}


