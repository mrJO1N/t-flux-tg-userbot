import { type QueryFilter, type UpdateQuery } from "mongoose";
import { type AnyParamConstructor, type BeAnObject } from "@typegoose/typegoose/lib/types";
import { type ReturnModelType } from "@typegoose/typegoose";
import { type UnitOfWork } from "./util.uow";

export type RepoOptions = { uow?: UnitOfWork };

export abstract class UtilBaseRepo<T extends BeAnObject> {
    constructor(protected readonly model: ReturnModelType<AnyParamConstructor<T>>) {}

    async findOne(filter: QueryFilter<T>): Promise<T | null> {
        return this.model.findOne(filter).exec() as Promise<T | null>;
    }

    async findAll(filter: QueryFilter<T> = {}): Promise<T[]> {
        return this.model.find(filter).exec() as unknown as Promise<T[]>;
    }

    async create(data: Partial<T>, opts?: RepoOptions): Promise<T> {
        const [doc] = await this.model.create([data], { session: opts?.uow?.transaction });
        return doc as unknown as T;
    }

    async upsert(filter: QueryFilter<T>, data: UpdateQuery<T>, opts?: RepoOptions): Promise<void> {
        await this.model.updateOne(filter, data, { upsert: true, session: opts?.uow?.transaction }).exec();
    }

    async deleteMany(filter: QueryFilter<T> = {}, opts?: RepoOptions): Promise<void> {
        await this.model.deleteMany(filter, { session: opts?.uow?.transaction }).exec();
    }
}
