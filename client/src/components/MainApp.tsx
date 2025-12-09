import { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings, ShieldCheck, Bot } from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatInterface } from './ChatInterface';
import { FriendsTab } from './FriendsTab';
import { SettingsScreen } from './SettingsScreen';
import { ToolsTab } from './ToolsTab';
import { db, APP_ID } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CryptoService } from '../lib/crypto';

interface MainAppProps {
  currentUser: any;
  userProfile: any;
  onLogout: () => void;
}

export function MainApp({ currentUser, userProfile, onLogout }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'tools' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // 1. Ensure @mini exists on load
  useEffect(() => {
    const initBot = async () => {
      try {
        const botRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', 'mini-bot-uid');
        const botSnap = await getDoc(botRef);

        if (!botSnap.exists()) {
          const keys = await CryptoService.generateKeys();
          await setDoc(botRef, {
            uid: 'mini-bot-uid',
            username: 'mini',
            displayName: 'Mini AI',
            systemId: 'BOT-001',
            publicKey: keys.pub,
            avatarColor: 'from-pink-500 to-rose-500',
            isBot: true,
            createdAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.error("Bot init error", e);
      }
    };
    initBot();
  }, []);

  // 2. Start Chat with Mini
  const startChatWithMini = async () => {
    try {
      const botUid = 'mini-bot-uid';
      // Predictable Chat ID
      const participants = [currentUser.uid, botUid].sort();
      const chatId = `${participants[0]}_${participants[1]}`;

      // Create Chat Doc if missing
      const chatRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants,
          createdAt: serverTimestamp(),
          type: 'direct'
        });
      }

      // Add to MY active chats
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'active_chats', chatId), {
        chatId,
        otherUid: botUid,
        otherUsername: 'mini',
        updatedAt: serverTimestamp()
      });

      setSelectedChatId(chatId);
      setActiveTab('chats');
    } catch (e) {
      console.error("Failed to start bot chat", e);
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col md:flex-row relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-20 bg-slate-900 border-r border-slate-800">
        <div className="flex-1 flex flex-col items-center py-6 space-y-6">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-xl">Q</span>
          </div>

          <button onClick={() => setActiveTab('chats')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'chats' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>

          <button onClick={() => setActiveTab('friends')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'friends' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}>
            <Users className="w-6 h-6" />
          </button>

          <button onClick={() => setActiveTab('tools')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'tools' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}>
            <ShieldCheck className="w-6 h-6" />
          </button>

          <button onClick={() => setActiveTab('settings')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${activeTab === 'settings' ? 'bg-slate-800 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-gray-300'}`}>
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* FAB for Mini Bot (Only visible on Chats tab and when no chat selected) */}
        {activeTab === 'chats' && !selectedChatId && (
          <button
            onClick={startChatWithMini}
            className="absolute bottom-20 right-6 md:bottom-8 md:right-8 z-50 bg-gradient-to-r from-pink-500 to-rose-600 text-white p-4 rounded-full shadow-lg shadow-pink-500/30 hover:scale-105 transition flex items-center gap-2"
          >
            <Bot className="w-6 h-6" />
            <span className="font-bold text-sm hidden md:inline">Chat with Mini</span>
          </button>
        )}

        {/* Chat List / Friends / Tools / Settings */}
        <div className={`${selectedChatId && activeTab === 'chats' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-slate-900 border-r border-slate-800`}>
          {activeTab === 'chats' && <ChatList onChatSelect={handleChatSelect} currentUser={currentUser} username={userProfile?.username || ''} />}
          {activeTab === 'friends' && <FriendsTab currentUser={currentUser} onChatSelect={handleChatSelect} />}
          {activeTab === 'tools' && <ToolsTab currentUser={currentUser} />}
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
        <button onClick={() => { setActiveTab('chats'); setSelectedChatId(null); }} className={`flex flex-col items-center gap-1 transition ${activeTab === 'chats' ? 'text-cyan-500' : 'text-gray-400'}`}>
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs">Chats</span>
        </button>
        <button onClick={() => { setActiveTab('friends'); setSelectedChatId(null); }} className={`flex flex-col items-center gap-1 transition ${activeTab === 'friends' ? 'text-cyan-500' : 'text-gray-400'}`}>
          <Users className="w-6 h-6" />
          <span className="text-xs">Friends</span>
        </button>
        <button onClick={() => { setActiveTab('tools'); setSelectedChatId(null); }} className={`flex flex-col items-center gap-1 transition ${activeTab === 'tools' ? 'text-cyan-500' : 'text-gray-400'}`}>
          <ShieldCheck className="w-6 h-6" />
          <span className="text-xs">Tools</span>
        </button>
        <button onClick={() => { setActiveTab('settings'); setSelectedChatId(null); }} className={`flex flex-col items-center gap-1 transition ${activeTab === 'settings' ? 'text-cyan-500' : 'text-gray-400'}`}>
          <Settings className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  );
}