import { Types, type QueryFilter, type UpdateQuery } from "mongoose"
import { type AnyParamConstructor, type BeAnObject } from "@typegoose/typegoose/lib/types";
import { type ReturnModelType } from "@typegoose/typegoose";

export abstract class UtilBaseRepo<T extends BeAnObject> {
    constructor(protected readonly model: ReturnModelType<AnyParamConstructor<T>>) { }

    protected sanitizeInput(input: string) {
        // just screening
        return input.replace(/([(){}*/\[\]№?+$^\\|])/g, "\\$1");
    }

    async findById(id: string): Promise<T | null> {
        return this.model.findById(new Types.ObjectId(id)).exec() as Promise<T | null>;
    }

    async findOne(filter: QueryFilter<T>): Promise<T | null> {
        return this.model.findOne(filter).exec() as Promise<T | null>;
    }

    /**
     * Ищет запись по фильтру. Если не находит — создает.
     * @param filter Поля для поиска (они же попадут в документ при создании)
     * @param defaults Опциональные дополнительные поля, которые добавятся только при создании
     */
    async findOrCreate(filter: QueryFilter<T>, defaults?: Partial<T>): Promise<T> {
        const doc = await this.model.findOneAndUpdate(
            filter,
            {
                // $setOnInsert гарантирует, что эти поля не затрут существующие при повторном вызове
                $setOnInsert: { ...filter, ...defaults }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        ).exec();

        return doc as unknown as T;
    }

    async create(data: Partial<T>): Promise<T> {
        return this.model.create(data) as unknown as T
    }

    async updateOne(filter: QueryFilter<T>, data: UpdateQuery<T>) {
        return this.model.findOneAndUpdate(filter, data, { new: true }).exec();
    }

    async updateById(id: string, data: UpdateQuery<T>) {
        return this.model.findByIdAndUpdate(id, data)
    }

    async delete(filter: QueryFilter<T>) {
        return this.model.deleteOne(filter).exec();
    }

    async findAll(filter: QueryFilter<T> = {}): Promise<T[]> {
        return this.model.find(filter).exec() as unknown as Promise<T[]>
    }

    protected async innerSearch(fieldsToSearch: Array<string | { name: string; expr: unknown }>, query: string) {
        const terms = query
            .split(" ")
            .map(term => this.sanitizeInput(term.trim()))
            .filter(Boolean)

        const whereCondition = {
            $or: fieldsToSearch.flatMap(field => {
                const input = typeof field === "string"
                    ? { $toString: "$" + field }
                    : field.expr
                return terms.map(term => ({
                    $expr: {
                        $regexMatch: {
                            input,
                            regex: term,
                            options: "i"
                        }
                    }
                }))
            })
        }

        return this.findAll(whereCondition)
    }
}