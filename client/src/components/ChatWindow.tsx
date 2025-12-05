import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, Clock, Shield } from 'lucide-react';
import { QuantumCryptoService } from '../services/QuantumCryptoService';
import SocketService from '../services/SocketService';
import clsx from 'clsx';
import axios from 'axios';

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
    isSelf: boolean;
    decrypted: boolean;
}

interface ChatWindowProps {
    currentUserId: string;
    recipientId: string | null; // For demo, we might just chat with a global room or specific user
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, recipientId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');

    const [sharedSecret, setSharedSecret] = useState<CryptoKey | null>(null);
    const [burnTimer, setBurnTimer] = useState<number>(0); // 0 = off

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (recipientId) {
            // Fetch recipient's public key
            // In a real app, we would do the full Kyber handshake here.
            // For this prototype, we'll simulate the handshake or just fetch the key.
            fetchRecipientKey(recipientId);
        }
    }, [recipientId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        SocketService.onReceiveMessage(async (data: any) => {
            // Decrypt message
            try {
                let decryptedText = "Error decrypting";
                if (sharedSecret) {
                    decryptedText = await QuantumCryptoService.decryptMessage(data.encryptedContent, data.iv, sharedSecret);
                } else {
                    // If we don't have the shared secret yet (e.g. first message), we might need to recover it from the handshake.
                    // For simplicity in this prototype, we assume the shared secret is established or we derive it now.
                    // In a full implementation, the message would carry the Kyber ciphertext if it's the first one.
                    // Here we'll just assume we can decrypt if we have the secret.
                    // If not, we might show "Encrypted Message".
                    decryptedText = "[Encrypted Message]";
                }

                const newMessage: Message = {
                    id: Date.now().toString(), // Use server ID in real app
                    senderId: data.senderId,
                    text: decryptedText,
                    timestamp: new Date(data.timestamp),
                    isSelf: false,
                    decrypted: false // Start as encrypted (scrambled)
                };

                setMessages(prev => [...prev, newMessage]);

                // Trigger Quantum Text Effect
                setTimeout(() => {
                    setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, decrypted: true } : m));
                }, 800);

            } catch (err) {
                console.error("Decryption failed", err);
            }
        });
    }, [sharedSecret]);

    const fetchRecipientKey = async (username: string) => {
        try {
            // In this demo, recipientId is the username for simplicity of lookup
            const res = await axios.get(`http://localhost:3000/api/keys/${username}`);


            // Perform Handshake (Encapsulate)
            const { sharedSecret } = await QuantumCryptoService.encapsulate(res.data.publicKey);
            setSharedSecret(sharedSecret);
        } catch (err) {
            console.error("Failed to fetch recipient key", err);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !recipientId || !sharedSecret) return;

        try {
            // Encrypt
            const { encrypted, iv } = await QuantumCryptoService.encryptMessage(inputText, sharedSecret);

            // Sign (using local private key)
            const privKey = localStorage.getItem('dilithium_private');
            let signature = "";
            if (privKey) {
                signature = await QuantumCryptoService.sign(encrypted, privKey);
            }

            const messageData = {
                senderId: currentUserId,
                recipientId: recipientId, // In real app, this is the User ID, not username
                encryptedContent: encrypted,
                iv,
                signature,
                burnAfterRead: burnTimer > 0,
                burnDuration: burnTimer
            };

            SocketService.sendMessage(messageData);

            // Add to local UI
            const newMessage: Message = {
                id: Date.now().toString(),
                senderId: currentUserId,
                text: inputText,
                timestamp: new Date(),
                isSelf: true,
                decrypted: true
            };
            setMessages(prev => [...prev, newMessage]);
            setInputText('');

        } catch (err) {
            console.error("Send failed", err);
        }
    };

    // Quantum Text Effect Component
    const ScrambleText = ({ text, revealed }: { text: string, revealed: boolean }) => {
        const [display, setDisplay] = useState(text);
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

        useEffect(() => {
            if (revealed) {
                setDisplay(text);
                return;
            }
            const interval = setInterval(() => {
                setDisplay(text.split('').map(char =>
                    char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]
                ).join(''));
            }, 50);
            return () => clearInterval(interval);
        }, [revealed, text]);

        return <span className={clsx("font-mono", revealed ? "text-emerald-400" : "text-emerald-800")}>{display}</span>;
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-900 h-screen relative overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-950/50 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-500 font-mono font-bold tracking-wider">
                        {recipientId ? `SECURE_LINK::${recipientId.toUpperCase()}` : 'NO_CONNECTION'}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 text-xs font-mono">
                    <span className="flex items-center gap-1"><Lock size={12} /> KYBER-1024</span>
                    <span className="flex items-center gap-1"><Shield size={12} /> DILITHIUM-5</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={clsx("flex", msg.isSelf ? "justify-end" : "justify-start")}>
                        <div className={clsx(
                            "max-w-[70%] p-4 rounded-lg border backdrop-blur-sm",
                            msg.isSelf
                                ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-100"
                                : "bg-slate-800/50 border-slate-700 text-slate-200"
                        )}>
                            <div className="text-xs text-slate-500 mb-1 font-mono flex justify-between gap-4">
                                <span>{msg.senderId}</span>
                                <span>{msg.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <p className="font-mono text-sm">
                                {msg.isSelf ? msg.text : <ScrambleText text={msg.text} revealed={msg.decrypted} />}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="h-20 border-t border-slate-800 bg-slate-950 p-4 flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                    <button
                        onClick={() => setBurnTimer(burnTimer === 0 ? 10 : 0)}
                        className={clsx("p-2 rounded hover:bg-slate-800 transition-colors", burnTimer > 0 && "text-red-500")}
                        title="Burn on Read"
                    >
                        <Clock size={20} />
                    </button>
                </div>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Enter encrypted message..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-emerald-500 focus:border-emerald-500 focus:outline-none font-mono"
                />
                <button
                    onClick={handleSend}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
