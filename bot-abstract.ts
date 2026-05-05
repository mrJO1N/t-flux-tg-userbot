export type Phone = `+7${string}`
export interface Message {
    text?: string,
    media?: {
        photos: any[]
    }
    voice?: any
}

export abstract class TgAdapter {
    abstract sendMessage(message: Message, phone: Phone,): Promise<Message>

    abstract onMessage(message: Message, phone: Phone): Promise<Message>

    abstract getContact(): Promise<string>
}