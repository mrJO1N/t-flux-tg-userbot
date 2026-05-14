import mongoose, { type ClientSession } from "mongoose";

export class UnitOfWork {
    private session: ClientSession | null = null;

    get transaction(): ClientSession | undefined {
        return this.session ?? undefined;
    }

    async begin(): Promise<void> {
        this.session = await mongoose.connection.startSession();
        this.session.startTransaction();
    }

    async finish(): Promise<void> {
        if (!this.session) return;
        await this.session.commitTransaction();
        await this.session.endSession();
        this.session = null;
    }

    async rollback(): Promise<void> {
        if (!this.session) return;
        await this.session.abortTransaction();
        await this.session.endSession();
        this.session = null;
    }
}
