import { Types } from "mongoose";
import { type IModelOptions } from "@typegoose/typegoose/lib/types";
import { ModelOptions, Prop } from "@typegoose/typegoose";

const commonModelOptions: IModelOptions = {
    schemaOptions: {
        timestamps: true,
        toJSON: {
            getters: true,
            virtuals: true,
            transform: (doc, ret) => { delete ret._id; return ret; }
        },
        toObject: {
            getters: true,
            virtuals: true,
            transform: (doc, ret) => { delete ret._id; return ret; }
        },
    }
};

export function Model(collection: string, options = { excludeId: false }) {
    const modelOptions = {
        ...commonModelOptions,
        schemaOptions: {
            ...commonModelOptions.schemaOptions,
            collection
        }
    }

    if (!options.excludeId)
        modelOptions.schemaOptions._id = false

    return ModelOptions(modelOptions);
}

@ModelOptions(commonModelOptions)
export abstract class BaseModel {
    @Prop({
        type: Types.ObjectId,
        default: () => new Types.ObjectId()
    })
    private _id!: Types.ObjectId;

    get id(): string {
        return this._id?.toString();
    }
}

export type RemoveIdFields<T extends BaseModel> = Omit<T, "_id">
