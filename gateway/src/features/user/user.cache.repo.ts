import { Inject, Injectable } from "../../infrastructure";
import { UtilCacheRepository } from "../utils";
import type { User } from "./user.model";
import { UserRepo } from "./user.repo";

const TTL = 5 * 60 * 1_000

@Injectable()
export class UserCacheRepo {
    constructor(
        @Inject(UserRepo) private readonly userRepo: UserRepo,
        @Inject(UtilCacheRepository) private readonly cache: UtilCacheRepository,
    ) {}

    public async findByTgId(tgId: number) {
        const key = `user:${tgId}`
        const cached = await this.cache.get<User>(key)
        if (cached) return cached

        const user = await this.userRepo.findByTgId(tgId)
        if (user) await this.cache.set(key, user, TTL)

        return user
    }

    public async create(tgId: number, phone: number) {
        const user = await this.userRepo.create({ tgId, phone })
        await this.cache.set(`user:${tgId}`, user, TTL)
        return user
    }
}
