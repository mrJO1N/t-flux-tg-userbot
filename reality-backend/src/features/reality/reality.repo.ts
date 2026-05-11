import { Injectable } from "../../infrastructure";
import { getModelForClass } from "@typegoose/typegoose";
import { Reality, RealityModel, type IReality } from "./reality.model";
import { UtilBaseRepo } from "../utils";

@Injectable()
export class RealityRepo extends UtilBaseRepo<IReality> {
    private readonly db = getModelForClass(Reality);

    constructor(
    ) {
        super(RealityModel)
    }

    async search(query: string) {
        return this.innerSearch(["area"], query)
    }
}