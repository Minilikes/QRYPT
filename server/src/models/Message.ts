import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: mongoose.Types.ObjectId;
    recipientId: mongoose.Types.ObjectId;
    encryptedContent: string; // AES-256 Encrypted (Base64)
    iv: string; // Initialization Vector (Base64)
    signature: string; // Dilithium Signature (Base64)
    timestamp: Date;
    burnAfterRead: boolean;
    burnDuration: number; // Seconds
}

const MessageSchema: Schema = new Schema({
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true },
    signature: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    burnAfterRead: { type: Boolean, default: false },
    burnDuration: { type: Number, default: 0 }
});

export default mongoose.model<IMessage>('Message', MessageSchema);
