import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection
// MongoDB Connection
const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            console.log('No MONGO_URI found. Attempting to start MongoDB Memory Server...');
            try {
                // Dynamic import to avoid issues if not installed or in prod
                const { MongoMemoryServer } = await import('mongodb-memory-server');
                const mongod = await MongoMemoryServer.create();
                mongoUri = mongod.getUri();
                console.log('MongoDB Memory Server started at', mongoUri);
            } catch (err) {
                console.log('Failed to start MongoDB Memory Server. Fallback to local default.');
                mongoUri = 'mongodb://localhost:27017/qrypt';
            }
        }

        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};



import apiRoutes from './routes/api';
import Message from './models/Message';

app.use('/api', apiRoutes);

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (userId) => {
        socket.join(userId);
        console.log(`User ${socket.id} joined room ${userId}`);
    });

    socket.on('send_message', async (data) => {
        // data: { senderId, recipientId, encryptedContent, iv, signature, burnAfterRead, burnDuration }
        try {
            // Store offline message
            const message = new Message(data);
            await message.save();

            // Emit to recipient
            io.to(data.recipientId).emit('receive_message', data);

            // Emit ack to sender
            socket.emit('message_sent', { messageId: message._id });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const startServer = async () => {
    await connectDB();

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
