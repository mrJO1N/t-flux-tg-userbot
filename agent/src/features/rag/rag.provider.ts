import { createHash } from "crypto";
import { existsSync, readFileSync, watch } from "fs";
import { join } from "path";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { Inject, Singleton, LoggerService, ConfigProvider } from "../../infrastructure";
import { UnitOfWork } from "../utils";
import { RagChunkRepo, RagMetaRepo } from "./rag.repo";

const RAG_PATH = join(__dirname, "../../../RAG.md");

@Singleton()
export class RagProvider {
    private vectorStore: MemoryVectorStore | null = null;
    private embeddings!: OpenAIEmbeddings;
    private watchTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        @Inject(ConfigProvider) private readonly config: ConfigProvider,
        @Inject(LoggerService) private readonly logger: LoggerService,
        @Inject(RagChunkRepo) private readonly chunkRepo: RagChunkRepo,
        @Inject(RagMetaRepo) private readonly metaRepo: RagMetaRepo,
    ) {}

    async init(): Promise<void> {
        this.embeddings = new OpenAIEmbeddings({
            model: this.config.OPENAI_EMBEDDINGS_MODEL ?? "text-embedding-3-small",
            apiKey: this.config.OPENAI_API_KEY,
            configuration: { baseURL: this.config.OPENAI_BASE_URL },
        });

        await this.sync();
        this.watchFile();
    }

    async query(text: string, k = 3): Promise<string> {
        if (!this.vectorStore) return "";
        const results = await this.vectorStore.similaritySearch(text, k);
        return results.map((r: Document) => r.pageContent).join("\n\n");
    }

    private async sync(): Promise<void> {
        if (!existsSync(RAG_PATH)) return;

        const content = readFileSync(RAG_PATH, "utf-8").trim();
        if (!content) return;

        const hash = createHash("sha256").update(content).digest("hex");
        const storedHash = await this.metaRepo.getHash();

        if (storedHash === hash) {
            await this.loadFromMongo();
            this.logger.info("RAG: loaded from MongoDB cache");
        } else {
            await this.indexFromContent(content, hash);
            this.logger.info("RAG: re-indexed from RAG.md");
        }
    }

    private async loadFromMongo(): Promise<void> {
        const docs = await this.chunkRepo.findAll();
        if (!docs.length) return;

        const vectors = docs.map(d => d.embedding);
        const documents = docs.map(d => new Document({ pageContent: d.content, metadata: d.metadata }));

        this.vectorStore = new MemoryVectorStore(this.embeddings);
        await this.vectorStore.addVectors(vectors, documents);
    }

    private async indexFromContent(content: string, hash: string): Promise<void> {
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
        const docs = await splitter.createDocuments([content]);
        const vectors = await this.embeddings.embedDocuments(docs.map(d => d.pageContent));

        const uow = new UnitOfWork();
        await uow.begin();
        try {
            await this.chunkRepo.deleteMany({}, { uow });
            await this.chunkRepo.bulkInsert(
                docs.map((doc, i) => ({
                    content: doc.pageContent,
                    embedding: vectors[i]!,
                    metadata: doc.metadata as Record<string, unknown>,
                })),
                { uow },
            );
            await this.metaRepo.setHash(hash, { uow });
            await uow.finish();
        } catch (err) {
            await uow.rollback();
            throw err;
        }

        this.vectorStore = new MemoryVectorStore(this.embeddings);
        await this.vectorStore.addVectors(vectors, docs);
    }

    private watchFile(): void {
        if (!existsSync(RAG_PATH)) return;

        watch(RAG_PATH, () => {
            if (this.watchTimer) clearTimeout(this.watchTimer);
            this.watchTimer = setTimeout(() => {
                this.sync().catch(err => this.logger.error("RAG: re-index error", err));
            }, 1000);
        });
    }
}
