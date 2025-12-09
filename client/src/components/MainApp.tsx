import { useState } from 'react';
import { MessageSquare, Users, Settings, ShieldCheck } from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatInterface } from './ChatInterface';
import { FriendsTab } from './FriendsTab';
import { SettingsScreen } from './SettingsScreen';
import { ToolsTab } from './ToolsTab';

interface MainAppProps {
  currentUser: any;
  userProfile: any;
  onLogout: () => void;
}

export function MainApp({ currentUser, userProfile, onLogout }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'tools' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-20 bg-slate-900 border-r border-slate-800">
        <div className="flex-1 flex flex-col items-center py-6 space-y-6">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-xl">Q</span>
          </div>

          <button
            onClick={() => setActiveTab('chats')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'chats' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}
          >
            <MessageSquare className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'friends' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}
          >
            <Users className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'tools' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}
          >
            <ShieldCheck className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'settings' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat List / Friends / Tools / Settings */}
        <div className={`${selectedChatId && activeTab === 'chats' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-slate-900 border-r border-slate-800`}>
          {activeTab === 'chats' && <ChatList onChatSelect={handleChatSelect} currentUser={currentUser} username={userProfile?.username || ''} />}
          {activeTab === 'friends' && <FriendsTab currentUser={currentUser} onChatSelect={handleChatSelect} />}
          {activeTab === 'tools' && <ToolsTab currentUser={currentUser} />}

          {/* UPDATED: Pass the full userProfile object instead of just username */}
          {activeTab === 'settings' && <SettingsScreen profile={userProfile} onLogout={onLogout} />}
        </div>

        {/* Chat Interface */}
        <div className={`${selectedChatId && activeTab === 'chats' ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedChatId ? (
            <ChatInterface chatId={selectedChatId} onBack={handleBackToList} currentUser={currentUser} userProfile={userProfile} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-950">
              <div className="text-center text-gray-500">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 opacity-50" />
                </div>
                <p>Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 py-3 safe-area-bottom">
        <button
          onClick={() => { setActiveTab('chats'); setSelectedChatId(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'chats' ? 'text-cyan-500' : 'text-gray-400'}`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs">Chats</span>
        </button>

        <button
          onClick={() => { setActiveTab('friends'); setSelectedChatId(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'friends' ? 'text-cyan-500' : 'text-gray-400'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Friends</span>
        </button>

        <button
          onClick={() => { setActiveTab('tools'); setSelectedChatId(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'tools' ? 'text-cyan-500' : 'text-gray-400'}`}
        >
          <ShieldCheck className="w-6 h-6" />
          <span className="text-xs">Tools</span>
        </button>

        <button
          onClick={() => { setActiveTab('settings'); setSelectedChatId(null); }}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'settings' ? 'text-cyan-500' : 'text-gray-400'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  );
}