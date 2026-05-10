import { Inject, Injectable, ConfigProvider } from "../../infrastructure";
import { Context, Telegraf } from "telegraf";
import { UserCacheRepo, type IUser } from "../user";

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input"; // npm i input

const sleepByText = (text: string) => {
    const base = (text.length / 20) * 2_000
    return new Promise((r) => setTimeout(r, base * (0.5 + Math.random())))
}

interface AppContext extends Context {
    session: {
        user: IUser
    };
}

function parsePhone(text: string): string | undefined {
    const digits = text.replace(/\D/g, '')

    if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
        return '+7' + digits.slice(1)
    }
    if (digits.length === 10) {
        return '+7' + digits
    }

    return undefined
}

@Injectable()
export class TgUserBotService {
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
        @Inject(UserCacheRepo) private readonly userCacheRepo: UserCacheRepo
    ) { }

    async init() {
        const apiId = 123456;
        const apiHash = "123456abcdfg";
        const stringSession = new StringSession(""); // fill this later with the value from session.save()

        console.log("Loading interactive example...");
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.start({
            phoneNumber: async () => await input.text("Please enter your number: "),
            password: async () => await input.text("Please enter your password: "),
            phoneCode: async () =>
                await input.text("Please enter the code you received: "),
            onError: (err) => console.log(err),
        });
        console.log("You should now be connected.");
        console.log(client.session.save()); // Save this string to avoid logging in again
        await client.sendMessage("me", { message: "Hello!" });

    }
}