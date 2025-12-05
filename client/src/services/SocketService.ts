import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
    socket: Socket | null = null;

    connect() {
        this.socket = io(SOCKET_URL);

        this.socket.on('connect', () => {
            console.log('Connected to socket server');
        });
    }

    joinRoom(userId: string) {
        if (this.socket) {
            this.socket.emit('join_room', userId);
        }
    }

    sendMessage(data: any) {
        if (this.socket) {
            this.socket.emit('send_message', data);
        }
    }

    onReceiveMessage(callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on('receive_message', callback);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default new SocketService();
