import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Registration from './components/Registration';
import ChatWindow from './components/ChatWindow';
import PanicButton from './components/PanicButton';
import SocketService from './services/SocketService';
import { Users } from 'lucide-react';

function App() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      SocketService.connect();
      SocketService.joinRoom(userId);
    }
    return () => {
      SocketService.disconnect();
    };
  }, [userId]);

  const handleRegister = (id: string, name: string) => {
    setUserId(id);
    setUsername(name);
    localStorage.setItem('userId', id);
    localStorage.setItem('username', name);
  };

  if (!userId) {
    return <Registration onRegister={handleRegister} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {activeTab === 'chats' && (
          <>
            {/* Chat List (Sidebar) */}
            <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-emerald-500 font-bold tracking-wider flex items-center gap-2">
                  <Users size={18} /> ACTIVE_NODES
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {/* Mock User List - In real app, fetch from server */}
                {['Alice', 'Bob', 'Charlie', 'Dave'].map(user => (
                  user !== username && (
                    <button
                      key={user}
                      onClick={() => setSelectedRecipient(user)}
                      className={`w-full p-3 rounded-lg text-left mb-2 transition-all ${selectedRecipient === user
                        ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-400'
                        : 'hover:bg-slate-800 text-slate-400'
                        }`}
                    >
                      <div className="font-mono font-bold">{user}</div>
                      <div className="text-xs opacity-50 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ONLINE
                      </div>
                    </button>
                  )
                ))}
              </div>
            </div>

            {/* Chat Window */}
            {selectedRecipient ? (
              <ChatWindow currentUserId={userId} recipientId={selectedRecipient} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 font-mono flex-col gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-slate-900"></div>
                </div>
                <p>SELECT_TARGET_NODE</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'vault' && (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-mono">
            [SECURE_VAULT_LOCKED]
          </div>
        )}

        {activeTab === 'network' && (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-mono">
            [NETWORK_TOPOLOGY_MAP_LOADING...]
          </div>
        )}
      </div>

      <PanicButton />
    </div>
  );
}

export default App;
