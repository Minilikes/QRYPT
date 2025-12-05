import { Request, Response } from 'express';
import User from '../models/User';

export const uploadPublicKey = async (req: Request, res: Response) => {
    try {
        const { username, publicKey, signaturePublicKey } = req.body;

        // Check if user exists
        let user = await User.findOne({ username });
        if (user) {
            user.publicKey = publicKey;
            user.signaturePublicKey = signaturePublicKey;
            await user.save();
        } else {
            user = new User({ username, publicKey, signaturePublicKey });
            await user.save();
        }

        res.status(200).json({ message: 'Keys uploaded successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload keys' });
    }
};

export const getPublicKey = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            publicKey: user.publicKey,
            signaturePublicKey: user.signaturePublicKey,
            userId: user._id
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch key' });
    }
};
