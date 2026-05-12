import { Types } from "mongoose";
import { type IModelOptions } from "@typegoose/typegoose/lib/types";
import { ModelOptions, Prop } from "@typegoose/typegoose";

export const objectIdFieldProps = {
    type: Types.ObjectId,

    set: (val: string | Types.ObjectId) => (typeof val === 'string' ? new Types.ObjectId(val) : val),

    get: (val: Types.ObjectId | undefined) => val?.toString(),
}

function stripMongoFields(ret: Record<string, unknown>): Record<string, unknown> {
    delete ret._id;
    delete ret.__v;
    for (const key of Object.keys(ret)) {
        const val = ret[key];
        if (Array.isArray(val)) {
            val.forEach(item => { if (item && typeof item === 'object') stripMongoFields(item as Record<string, unknown>); });
        } else if (val && typeof val === 'object') {
            stripMongoFields(val as Record<string, unknown>);
        }
    }
    return ret;
}

const commonModelOptions: IModelOptions = {
    schemaOptions: {
        timestamps: true,
        toJSON: {
            getters: true,
            virtuals: true,
            transform: (_doc, ret) => stripMongoFields(ret)
        },
        toObject: {
            getters: true,
            virtuals: true,
            transform: (_doc, ret) => stripMongoFields(ret)
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
    // 1. Оставляем _id как он есть в базе, но помечаем его как private, 
    // чтобы он не мешался в коде (или просто не используем его).
    @Prop({
        type: Types.ObjectId,
        default: () => new Types.ObjectId()
    })
    private _id!: Types.ObjectId;

    // 2. Используем геттер 'id'. 
    // Mongoose по умолчанию делает виртуал 'id' из '_id'.
    // Мы просто объявляем его здесь для TypeScript.
    get id(): string {
        return this._id?.toString();
    }
}

export type RemoveIdFields<T extends BaseModel> = Omit<T, "_id">