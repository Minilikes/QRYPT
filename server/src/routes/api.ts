import express from 'express';
import { uploadPublicKey, getPublicKey } from '../controllers/KeyController';

const router = express.Router();

router.post('/keys/upload', uploadPublicKey);
router.get('/keys/:username', getPublicKey);

export default router;
