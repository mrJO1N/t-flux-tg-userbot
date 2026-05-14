import { getModelForClass, Prop } from "@typegoose/typegoose";
import { BaseModel, Model } from "../utils";

@Model("rag_chunks", { excludeId: true })
export class RagChunk extends BaseModel {
    @Prop({ required: true })
    content!: string;

    @Prop({ type: () => [Number], required: true })
    embedding!: number[];

    @Prop({ type: Object, default: {} })
    metadata!: Record<string, unknown>;
}

@Model("rag_meta", { excludeId: true })
export class RagMeta extends BaseModel {
    @Prop({ required: true, unique: true })
    key!: string;

    @Prop({ required: true })
    value!: string;
}

export const RagChunkModel = getModelForClass(RagChunk);
export const RagMetaModel = getModelForClass(RagMeta);
