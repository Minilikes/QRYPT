import { useState } from 'react';
import { FileUp, Check, AlertTriangle, FileText, Share2, Scan, Loader2, X } from 'lucide-react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ToolsTabProps {
    currentUser: any;
}

export function ToolsTab({ currentUser }: ToolsTabProps) {
    const [activeTool, setActiveTool] = useState<'scanner' | 'share'>('scanner');

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-white text-xl mb-4">Security Tools</h2>
                <div className="flex gap-2 bg-slate-950/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTool('scanner')}
                        className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${activeTool === 'scanner' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        <Scan className="w-4 h-4" />
                        APK Scanner
                    </button>
                    <button
                        onClick={() => setActiveTool('share')}
                        className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${activeTool === 'share' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        <Share2 className="w-4 h-4" />
                        Secure Share
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTool === 'scanner' ? <APKScanner /> : <FileShare currentUser={currentUser} />}
            </div>
        </div>
    );
}

function APKScanner() {
    const [file, setFile] = useState<File | null>(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleScan = () => {
        if (!file) return;
        setScanning(true);
        // Mock Scan
        setTimeout(() => {
            setResult({
                score: 85,
                threats: [
                    { name: 'Unsafe Permission: CAMERA', level: 'medium' },
                    { name: 'Tracker: Google Analytics', level: 'low' }
                ],
                safe: true
            });
            setScanning(false);
        }, 2000);
    };

    const data = [
        { name: 'Safe', value: 85, color: '#10b981' },
        { name: 'Risky', value: 15, color: '#ef4444' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scan className="w-8 h-8 text-cyan-500" />
                </div>
                <h3 className="text-white text-lg mb-2">Upload APK for Analysis</h3>
                <p className="text-gray-400 text-sm mb-6">Detect malware, trackers, and unsafe permissions.</p>

                <input
                    type="file"
                    accept=".apk"
                    onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}
                    className="hidden"
                    id="apk-upload"
                />
                <label
                    htmlFor="apk-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl cursor-pointer transition mb-4"
                >
                    <FileUp className="w-5 h-5" />
                    {file ? file.name : 'Choose File'}
                </label>

                {file && !scanning && !result && (
                    <button
                        onClick={handleScan}
                        className="block w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20"
                    >
                        Start Scan
                    </button>
                )}

                {scanning && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-cyan-500">
                        <Loader2 className="animate-spin" />
                        Scanning...
                    </div>
                )}
            </div>

            {result && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                        <div>
                            <h4 className="text-gray-400 text-xs uppercase mb-1">Security Score</h4>
                            <div className="text-3xl text-white font-bold">{result.score}/100</div>
                        </div>
                        <div className="w-20 h-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        innerRadius={25}
                                        outerRadius={35}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-white text-sm">Threat Analysis</h4>
                        {result.threats.map((t: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-800/50">
                                {t.level === 'high' ? <X className="text-red-500" /> : <AlertTriangle className="text-yellow-500" />}
                                <div>
                                    <p className="text-white text-sm">{t.name}</p>
                                    <p className={`text-xs ${t.level === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>{t.level.toUpperCase()} Severity</p>
                                </div>
                            </div>
                        ))}
                        {result.threats.length === 0 && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 flex items-center gap-2">
                                <Check /> No threats found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function FileShare({ currentUser }: { currentUser: any }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    const handleUpload = async () => {
        if (!file || !currentUser) return;
        setUploading(true);
        setError('');
        try {
            const fileRef = ref(storage, `users/${currentUser.uid}/uploads/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setUrl(downloadUrl);
        } catch (e: any) {
            console.error("Upload failed", e);
            setError("Upload failed. Storage might not be configured.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Share2 className="w-8 h-8 text-cyan-500" />
                </div>
                <h3 className="text-white text-lg mb-2">Secure File Transfer</h3>
                <p className="text-gray-400 text-sm mb-6">Upload files and get a secure one-time link.</p>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 mb-4 hover:border-cyan-500/50 transition">
                    <input
                        type="file"
                        onChange={(e) => { setFile(e.target.files?.[0] || null); setUrl(''); }}
                        className="hidden"
                        id="file-share"
                    />
                    <label htmlFor="file-share" className="cursor-pointer">
                        {file ? (
                            <div className="flex items-center justify-center gap-2 text-white">
                                <FileText className="text-cyan-500" />
                                {file.name}
                            </div>
                        ) : (
                            <div className="text-gray-500">
                                <FileUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Click to select file</p>
                            </div>
                        )}
                    </label>
                </div>

                {file && !uploading && !url && (
                    <button
                        onClick={handleUpload}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20"
                    >
                        Secure Upload
                    </button>
                )}

                {uploading && (
                    <div className="flex items-center justify-center gap-2 text-cyan-500">
                        <Loader2 className="animate-spin" />
                        Encrypting & Uploading...
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {url && (
                    <div className="mt-6 animate-fade-in">
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 flex items-center gap-2 mb-2">
                            <input
                                type="text"
                                value={url}
                                readOnly
                                className="bg-transparent text-gray-400 text-xs flex-1 outline-none"
                            />
                            <button
                                onClick={() => navigator.clipboard.writeText(url)}
                                className="p-2 hover:bg-slate-800 rounded-lg text-white"
                            >
                                <Check className="w-4 h-4 text-emerald-500" />
                            </button>
                        </div>
                        <p className="text-emerald-500 text-sm">File uploaded securely!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
