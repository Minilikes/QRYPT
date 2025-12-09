import { useState } from 'react';
import { QrCode, Search, MessageSquare, Loader2 } from 'lucide-react';
import { db, APP_ID } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

interface FriendsTabProps {
  currentUser: any;
  onChatSelect: (chatId: string) => void;
}

export function FriendsTab({ currentUser, onChatSelect }: FriendsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUser) return;

    setSearching(true);
    try {
      const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'),
        where('username', '==', searchQuery.toLowerCase())
      );
      const snap = await getDocs(q);
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.uid !== currentUser.uid); // Exclude self
      setSearchResults(results);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (otherUser: any) => {
    if (!currentUser || loadingAction) return;
    setLoadingAction(true);
    try {
      // Predictable Chat ID
      const participants = [currentUser.uid, otherUser.uid].sort();
      const chatId = `${participants[0]}_${participants[1]}`;

      // 1. Create Chat if not exists
      const chatRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants,
          createdAt: serverTimestamp(),
          type: 'direct'
        });
      }

      // 2. Add to sender's active chats
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'active_chats', chatId), {
        chatId,
        otherUsername: otherUser.username,
        updatedAt: serverTimestamp()
      });

      // 3. Add to recipient's active chats (so they see it too)
      // Fetch my profile first to get my username
      const myProfile = await getDoc(doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'settings', 'profile'));
      const myUsername = myProfile.data()?.username || 'Unknown';

      await setDoc(doc(db, 'artifacts', APP_ID, 'users', otherUser.uid, 'active_chats', chatId), {
        chatId,
        otherUsername: myUsername,
        updatedAt: serverTimestamp()
      });

      onChatSelect(chatId);

    } catch (e) {
      console.error("Start chat failed", e);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl">Find People</h2>
          <button
            onClick={() => setShowQRCode(true)}
            className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by @username..."
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
          />
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {searching ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan-500" /></div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-gray-400 text-sm font-medium">Search Results</h3>
            {searchResults.map(user => (
              <div key={user.uid} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <span className="text-white">{user.username[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white">@{user.username}</p>
                    <p className="text-xs text-gray-500">System ID: {user.systemId}</p>
                  </div>
                </div>
                <button
                  onClick={() => startChat(user)}
                  disabled={loadingAction}
                  className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20"
                >
                  {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">Search for users to start specific secure chats</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl">
            <h3 className="text-white text-xl mb-4 text-center">Share Your ID</h3>

            <div className="bg-white p-4 rounded-xl mb-4">
              <div className="aspect-square bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <QrCode className="w-24 h-24 text-white" />
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-3 mb-4 border border-slate-800">
              <p className="text-center text-sm text-gray-400 mb-1">Your username</p>
              <p className="text-center text-white">@{localStorage.getItem('qrypt_username')}</p>
            </div>

            <button
              onClick={() => setShowQRCode(false)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}