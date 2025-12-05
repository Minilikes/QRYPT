import React from 'react';
import { MessageSquare, Shield, Phone, Activity, Settings } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'chats', icon: MessageSquare, label: 'Chats' },
        { id: 'vault', icon: Shield, label: 'The Vault' },
        { id: 'calls', icon: Phone, label: 'Secure Calls' },
        { id: 'network', icon: Activity, label: 'Network' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-20 h-screen bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6">
            <div className="mb-8">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <span className="text-slate-950 font-bold text-xl">Q</span>
                </div>
            </div>

            <div className="flex flex-col gap-6 w-full">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={clsx(
                            "w-full flex flex-col items-center justify-center py-3 transition-all duration-300 relative",
                            activeTab === item.id ? "text-emerald-500" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <item.icon size={24} />
                        {activeTab === item.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
