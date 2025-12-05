import React, { useState } from 'react';
import { QuantumCryptoService } from '../services/QuantumCryptoService';
import axios from 'axios';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface RegistrationProps {
    onRegister: (userId: string, username: string) => void;
}

const Registration: React.FC<RegistrationProps> = ({ onRegister }) => {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username) return;
        setLoading(true);
        try {
            // Generate Keys
            const kyberKeys = await QuantumCryptoService.generateKyberKeyPair();
            const dilithiumKeys = await QuantumCryptoService.generateDilithiumKeyPair();

            // Store Private Keys locally (In memory for now, ideally Secure Storage)
            localStorage.setItem('kyber_private', kyberKeys.privateKey);
            localStorage.setItem('dilithium_private', dilithiumKeys.privateKey);

            // Upload Public Keys
            const response = await axios.post('http://localhost:3000/api/keys/upload', {
                username,
                publicKey: kyberKeys.publicKey,
                signaturePublicKey: dilithiumKeys.publicKey
            });

            onRegister(response.data.userId, username);
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-emerald-500 font-mono">
            <div className="p-8 border border-emerald-500/30 rounded-lg bg-slate-900/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] max-w-md w-full">
                <div className="flex flex-col items-center mb-8">
                    <ShieldCheck size={64} className="mb-4 text-emerald-400" />
                    <h1 className="text-3xl font-bold tracking-wider">QRYPT</h1>
                    <p className="text-slate-400 text-sm mt-2">QUANTUM-SAFE MESSAGING</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs mb-1 text-slate-400">IDENTITY_HANDLE</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-emerald-500 focus:border-emerald-500 focus:outline-none focus:shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all"
                            placeholder="Enter username..."
                        />
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 rounded transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'INITIALIZE_KEYS'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Registration;
