import { Inject, Injectable, ConfigProvider } from "../../infrastructure";
import { Context, Telegraf } from "telegraf";
import { UserCacheRepo, type IUser } from "../user";
import { RedisBusRepo } from "../agent";

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
export class TgBotService {
    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
        @Inject(UserCacheRepo) private readonly userCacheRepo: UserCacheRepo,
        @Inject(RedisBusRepo) private readonly redisBus: RedisBusRepo,
    ) { }

    async init() {
        const bot = new Telegraf<AppContext>(this.config.TG_BOT_TOKEN)

        bot.use(async (ctx, next) => {
            let user = await this.userCacheRepo.findByTgId(ctx.from!.id)

            if (user) {
                ctx.session = { user }
                return next()
            }

            const phoneCandidate = parsePhone(ctx.text!)
            if (phoneCandidate) {
                user = await this.userCacheRepo.create(ctx.from!.id, Number(phoneCandidate))
                ctx.session = { user }
                return next()
            }

            ctx.reply("give number")
        })

        bot.use(async (ctx, next) => {
            const originalReply = ctx.reply.bind(ctx)
            ctx.reply = async (text, extra?) => {
                const parts = String(text).split('</new>').map(p => p.trim()).filter(Boolean)
                let result: any
                for (const part of parts) {
                    await ctx.sendChatAction("typing")
                    // await sleepByText(part)
                    result = await originalReply(part, extra)
                }
                return result
            }
            return next()
        })

        bot.on("message", (ctx) => this.handleMessage(ctx))

        bot.launch()
    }

    private async handleMessage(ctx: AppContext) {
        const text = ctx.text
        if (!text) return

        const phone = String(ctx.session.user.phone)
        const userId = phone

        let accumulated = ""
        await this.redisBus.chat(userId, text, "tg", phone, (chunk) => {
            accumulated += chunk
        })

        ctx.reply(accumulated)
    }
}
