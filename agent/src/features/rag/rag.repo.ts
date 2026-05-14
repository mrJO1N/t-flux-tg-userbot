import { Injectable } from "../../infrastructure";
import { UtilBaseRepo, type RepoOptions } from "../utils";
import { RagChunk, RagChunkModel, RagMeta, RagMetaModel } from "./rag.model";

@Injectable()
export class RagChunkRepo extends UtilBaseRepo<RagChunk> {
    constructor() {
        super(RagChunkModel);
    }

    async bulkInsert(
        docs: { content: string; embedding: number[]; metadata: Record<string, unknown> }[],
        opts?: RepoOptions,
    ) {
        return RagChunkModel.insertMany(docs, { session: opts?.uow?.transaction });
    }
}

@Injectable()
export class RagMetaRepo extends UtilBaseRepo<RagMeta> {
    constructor() {
        super(RagMetaModel);
    }

    async getHash(): Promise<string | null> {
        const doc = await this.findOne({ key: "hash" } as any);
        return doc?.value ?? null;
    }

    async setHash(hash: string, opts?: RepoOptions): Promise<void> {
        await this.upsert(
            { key: "hash" } as any,
            { $set: { key: "hash", value: hash } } as any,
            opts,
        );
    }
}
