import { Inject, Injectable } from "../../infrastructure";
import { UserModel, type User } from "./user.model";
import { UserRepo } from "./user.repo";

const TTL = 5 * 60 * 1_000

@Injectable()
export class UserCacheRepo {
    private cache = new Map<string, { value: User; timer: ReturnType<typeof setTimeout> }>()

    constructor(
        @Inject(UserRepo) private readonly userRepo: UserRepo
    ) {
    }

    private async setOne(key: string, val: User) {
        const existing = this.cache.get(key)
        if (existing) clearTimeout(existing.timer)

        const timer = setTimeout(() => this.cache.delete(key), TTL)
        this.cache.set(key, { value: val, timer })
    }

    private async getOne(key: string) {
        const entry = this.cache.get(key)
        if (!entry) return undefined

        clearTimeout(entry.timer)
        entry.timer = setTimeout(() => this.cache.delete(key), TTL)

        return entry.value
    }

    public async findByTgId(tgId: number) {
        const cacheKey = String(tgId)
        let user = await this.getOne(cacheKey) ?? null

        if (!user) {
            user = await this.userRepo.findByTgId(tgId)
            if (user) await this.setOne(cacheKey, user)
        }

        return user
    }

    public async create(tgId: number, phone: number) {
        const user = await this.userRepo.create({ tgId, phone })
        await this.setOne(String(tgId), user)

        return user
    }
}