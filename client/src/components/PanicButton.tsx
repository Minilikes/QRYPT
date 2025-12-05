import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';


const PanicButton: React.FC = () => {
    const [panicMode, setPanicMode] = useState(false);
    const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseDown = () => {
        const timer = setTimeout(() => {
            setPanicMode(true);
        }, 1000); // 1 second hold
        setPressTimer(timer);
    };

    const handleMouseUp = () => {
        if (pressTimer) clearTimeout(pressTimer);
    };

    if (panicMode) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center font-sans text-gray-800">
                {/* Decoy Calculator UI */}
                <div className="w-64 bg-gray-200 rounded-lg p-4 shadow-xl">
                    <div className="bg-white h-12 mb-4 rounded text-right p-2 text-2xl font-mono">0</div>
                    <div className="grid grid-cols-4 gap-2">
                        {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map(btn => (
                            <button key={btn} className="bg-gray-300 p-2 rounded hover:bg-gray-400">{btn}</button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => setPanicMode(false)}
                    className="absolute bottom-4 right-4 text-xs text-gray-300 hover:text-gray-400"
                >
                    Restore
                </button>
            </div>
        );
    }

    return (
        <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-red-900/20 border border-red-500/50 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 group"
            title="Hold for Panic Mode"
        >
            <AlertTriangle size={20} className="group-hover:scale-110 transition-transform" />
        </button>
    );
};

export default PanicButton;
