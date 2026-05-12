import { getModelForClass, index, Prop } from "@typegoose/typegoose";
import { BaseModel, Model, type RemoveIdFields } from "../utils";

class FullAddress {
    @Prop({ required: true })
    city!: string

    @Prop({ required: true })
    district!: string

    @Prop({ required: true })
    street!: string

    @Prop({ required: true })
    houseNumber!: number

    @Prop()
    seaDistance?: number

    @Prop({ required: true })
    floor!: number

    @Prop({ required: true })
    floorTotal!: number

    @Prop({ required: true, enum: ["monolith", "panel", "brick", "new building"] })
    buildingType!: "monolith" | "panel" | "brick" | "new building"

    @Prop({ type: [String] })
    metroStations?: string[]

    @Prop()
    metroDistanceMin?: number
}

class Area {
    @Prop({ required: true })
    totalSqm!: number

    @Prop()
    kitchenSqm?: number

    @Prop({ required: true })
    livingSqm!: number

    @Prop({ required: true })
    roomsCount!: number

    @Prop()
    ceilingHeight?: number

    @Prop({ required: true, enum: ["separate", "adjacent", "studio", "euro"] })
    layout!: "separate" | "adjacent" | "studio" | "euro"

    @Prop()
    balconySqm?: number

    @Prop({ enum: ["balcony", "loggia"] })
    balconyType?: "balcony" | "loggia"

    @Prop({
        required: true, enum: ["sea", "mountains", "courtyard", "street"]
    })
    view!: "sea" | "mountains" | "courtyard" | "street"

    @Prop({ required: true })
    bathroomSqm!: number

    @Prop({ required: true, enum: ["combined", "separate"] })
    bathroomType!: "combined" | "separate"

    //     @Prop()
    // renovation!:"no" |"cosmetic" | "euro" | "designer"

    // furniture!: "no" | "partially" | "fully"

    // appliances!:bool

    // condition!: "primary"|"secondary"



    // Состояние и ремонт

    // renovation — без ремонта / косметический / евро / дизайнерский
    // furniture — без мебели / частично / полностью
    // appliances — техника (bool или список)
    // condition — первичка / вторичка

    // Дом и инфраструктура

    // year_built — год постройки
    // elevator — есть / нет
    // parking — нет / наземная / подземная / гараж
    // closed_yard — закрытый двор (bool)

    // Для агента (служебные)

    @Prop({ default: "" })
    description!: string

    @Prop({ default: "" })
    agentNotes!: string

    // description — текстовое описание(для LLM-контекста)
    // photos — массив URL фото
    // contact_name, contact_phone
    // agent_notes — внутренние заметки(не показывать пользователю)
    // tags — массив тегов (["море рядом", "тихий двор", "новострой"])
    // status — активно / снято / продано
}

@index(
    { "fullAddress.city": 1, "fullAddress.district": 1, "fullAddress.street": 1, "fullAddress.houseNumber": 1 },
    { unique: true }
)
@Model("reality")
export class Reality extends BaseModel {
    @Prop({ required: true })
    fullAddress!: FullAddress;

    @Prop()
    area!: Area

    @Prop({ enum: ["avito", "cian", "own-base"], default: "own-base" })
    source!: "avito" | "cian" | "own-base"

    @Prop({ required: true })
    sourceUrl!: string

    @Prop({ required: true })
    price!: number

    @Prop({ default: false })
    negotiable!: boolean

    @Prop({ enum: ["rent-daily", "rent-monthly", "sale"], required: true })
    dealType!: "rent-daily" | "rent-monthly" | "sale"
}
export type IReality = RemoveIdFields<Reality>
export const RealityModel = getModelForClass(Reality)