import { Injectable } from "../../infrastructure";
import { getModelForClass } from "@typegoose/typegoose";
import { Reality, RealityModel, type IReality } from "./reality.model";
import { UtilBaseRepo } from "../utils";

const ADDRESS_EXPR = {
    $concat: [
        "$fullAddress.city", " ",
        "$fullAddress.district", " ",
        "$fullAddress.street", " ",
        { $toString: "$fullAddress.houseNumber" }
    ]
}

@Injectable()
export class RealityRepo extends UtilBaseRepo<IReality> {
    private readonly db = getModelForClass(Reality);

    constructor(
    ) {
        super(RealityModel)
    }

    async search(query: string) {
        return this.innerSearch([{ name: "address", expr: ADDRESS_EXPR }], query)
    }
}