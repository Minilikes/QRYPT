import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    publicKey: string; // Kyber Public Key (Base64)
    signaturePublicKey: string; // Dilithium Public Key (Base64)
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    signaturePublicKey: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
