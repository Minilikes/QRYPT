import { useState, useMemo, useEffect } from 'react';
import { Search, Pin, Shield, Loader2 } from 'lucide-react';
import { db, APP_ID } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
  currentUser: any;
  username: string;
}

export function ChatList({ onChatSelect, currentUser, username }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups' | 'secure'>('all');
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'active_chats'),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const chatList = snap.docs.map(d => ({
        id: d.id, // This is the doc ID (usually same as chatId)
        chatId: d.data().chatId, // The actual chat doc ID in public/data/chats
        otherUsername: d.data().otherUsername,
        lastMessage: d.data().lastMessage,
        updatedAt: d.data().updatedAt,
        // Mocking these for now as they aren't in the schema yet
        unreadCount: 0,
        isGroup: false,
        isOnline: true,
        isPinned: false
      }));
      setChats(chatList);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const filteredChats = useMemo(() => {
    let filtered = chats;

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter(chat => chat.unreadCount > 0);
    } else if (filter === 'groups') {
      filtered = filtered.filter(chat => chat.isGroup);
    } else if (filter === 'secure') {
      filtered = filtered.filter(chat => !chat.isGroup);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(chat =>
        chat.otherUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }, [searchQuery, filter, chats]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white">{username?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-white">Messages</h2>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {['all', 'unread', 'groups', 'secure'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition text-sm capitalize ${filter === f ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-gray-300 hover:bg-slate-750'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-cyan-500" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No chats found.
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatSelect(chat.chatId)}
              className="w-full p-4 flex items-center gap-3 hover:bg-slate-800/50 transition border-b border-slate-800/50"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${chat.isGroup ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20' : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20'
                  }`}>
                  <span className="text-white">{chat.otherUsername?.[0]?.toUpperCase()}</span>
                </div>
                {chat.isOnline && !chat.isGroup && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white">@{chat.otherUsername}</span>
                    {chat.isPinned && <Pin className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500" />}
                    {!chat.isGroup && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <span className="text-xs text-gray-500">
                    {chat.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400 truncate flex-1">
                    {chat.lastMessage || 'Encrypted Channel initialized'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs rounded-full min-w-[20px] text-center shadow-lg shadow-cyan-500/20">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )))}
      </div>
    </div>
  );
}