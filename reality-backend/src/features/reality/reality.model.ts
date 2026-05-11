import { getModelForClass, Prop } from "@typegoose/typegoose";
import { BaseModel, Model, type RemoveIdFields } from "../utils";

@Model("reality")
export class Reality extends BaseModel {
    @Prop({ required: true, unique: true })
    address!: string;

    @Prop({required:true})
    area!: number
}
export type IReality = RemoveIdFields<Reality>
export const RealityModel = getModelForClass(Reality)