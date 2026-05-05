import { Injectable } from "../../infrastructure";
import { getModelForClass } from "@typegoose/typegoose";
import { User, UserModel } from "./user.model";
import { UtilBaseRepo } from "../utils";

@Injectable()
export class UserRepo extends UtilBaseRepo<User> {
    private readonly db = getModelForClass(User);

    constructor(
    ) {
        super(UserModel)
    }

    async findByTgId(tgId: number) {
        return await this.findOne({ tgId })
    }
}