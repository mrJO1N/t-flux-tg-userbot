import { getModelForClass, Prop } from "@typegoose/typegoose";
import { BaseModel, Model, type RemoveIdFields } from "../utils";

@Model("users")
export class User extends BaseModel {
    @Prop({ required: true, unique: true })
    tgId!: number;

    @Prop({ required: true, unique: true })
    phone!: number;
}
export type IUser = RemoveIdFields<User>
export const UserModel = getModelForClass(User)