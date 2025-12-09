import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Lock, Send, Plus, Smile, Mic, ThumbsUp, Heart, Reply, Copy, Trash2, Loader2, Bot, X } from 'lucide-react';
import { db, APP_ID } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, getDoc, doc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CryptoService } from '../lib/crypto';

interface ChatInterfaceProps {
  chatId: string;
  onBack: () => void;
  currentUser: any;
  userProfile: any;
}

export function ChatInterface({ chatId, onBack, currentUser, userProfile }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recipient, setRecipient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Recipient Info
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId));
        if (!chatDoc.exists()) return;
        const otherUid = chatDoc.data().participants.find((id: string) => id !== currentUser.uid);
        const userDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', otherUid));
        if (userDoc.exists()) setRecipient(userDoc.data());
      } catch (e) {
        console.error("Failed to fetch chat meta", e);
      }
    };
    fetchMeta();
  }, [chatId, currentUser]);

  // Subscribe to messages
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const rawMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myPriv = localStorage.getItem(`qrypt_private_key`);

      if (myPriv) {
        const decrypted = await Promise.all(rawMsgs.map(async (m: any) => {
          let text = "Encrypted Block";
          try {
            if (m.senderId === currentUser.uid) {
              if (m.senderContent) {
                text = await CryptoService.decrypt(m.senderContent, myPriv);
              } else {
                text = m.plainText || "Encrypted";
              }
            } else {
              text = await CryptoService.decrypt(m.content, myPriv);
            }
          } catch (e) { text = "Decryption Error"; }

          return {
            id: m.id,
            text,
            sender: m.senderId === currentUser.uid ? 'me' : (recipient?.username || 'them'),
            timestamp: m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            reactions: []
          };
        }));
        setMessages(decrypted);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [chatId, currentUser, recipient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !recipient) return;
    const text = inputText;
    setInputText('');
    setReplyingTo(null);

    // Encrypt for Recipient
    const encryptedForRecipient = await CryptoService.encrypt(text, recipient.publicKey);
    // Encrypt for Sender (Me)
    const encryptedForMe = await CryptoService.encrypt(text, userProfile.publicKey);

    if (!encryptedForRecipient || !encryptedForMe) {
      alert("Failed to encrypt. Check keys.");
      return;
    }

    // Send User Message
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId, 'messages'), {
      senderId: currentUser.uid,
      content: encryptedForRecipient,
      senderContent: encryptedForMe,
      timestamp: serverTimestamp()
    });

    // Update List
    const update = { lastMessage: "Encrypted Message", updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'active_chats', chatId), update, { merge: true });

    // If not a bot, update their list too
    if (recipient.username !== 'mini') {
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', recipient.uid, 'active_chats', chatId), update, { merge: true });
    }

    // --- AUTO REPLY LOGIC FOR @MINI ---
    if (recipient.username === 'mini') {
      setTimeout(async () => {
        const botReply = "Hiii this is mini welcome to qrypt";

        // Bot encrypts for YOU (using your public key)
        const botEncryptedForYou = await CryptoService.encrypt(botReply, userProfile.publicKey);
        // Bot encrypts for ITSELF (using its public key) - though it can't read it back without private key logic, it keeps schema consistent
        const botEncryptedForBot = await CryptoService.encrypt(botReply, recipient.publicKey);

        if (botEncryptedForYou && botEncryptedForBot) {
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId, 'messages'), {
            senderId: recipient.uid, // Bot's UID
            content: botEncryptedForYou, // For YOU to read
            senderContent: botEncryptedForBot, // For BOT (unused)
            timestamp: serverTimestamp()
          });
        }
      }, 1500); // 1.5s delay
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        const existing = reactions.find((r: any) => r.emoji === emoji);
        if (existing) existing.count++; else reactions.push({ emoji, count: 1 });
        return { ...m, reactions };
      }
      return m;
    }));
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ messageId, x: e.clientX, y: e.clientY });
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter(m => m.id !== messageId));
    setContextMenu(null);
  };

  if (!recipient && loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-cyan-500" /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${recipient?.username === 'mini' ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'} shadow-cyan-500/20`}>
            {recipient?.username === 'mini' ? <Bot className="w-6 h-6 text-white" /> : <span className="text-white">{recipient?.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div>
            <h3 className="text-white">@{recipient?.username} {recipient?.username === 'mini' && <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1 rounded ml-1">BOT</span>}</h3>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-gray-400">Encrypted Connection</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><Phone className="w-5 h-5" /></button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><Video className="w-5 h-5" /></button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`} onContextMenu={(e) => handleContextMenu(e, message.id)}>
            <div className={`max-w-[70%] ${message.sender === 'me' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-2 rounded-2xl ${message.sender === 'me' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm shadow-lg shadow-cyan-500/10' : 'bg-slate-800 text-white rounded-bl-sm border border-slate-700'}`}>
                <p>{message.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs opacity-70">{message.timestamp}</span>
                  {message.sender === 'me' && <span className="text-xs">✓✓</span>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 hover:opacity-100 transition">
                <button onClick={() => handleReaction(message.id, '👍')} className="p-1 bg-slate-800 rounded-full border border-slate-700"><ThumbsUp className="w-3 h-3 text-white" /></button>
                <button onClick={() => handleReaction(message.id, '❤️')} className="p-1 bg-slate-800 rounded-full border border-slate-700"><Heart className="w-3 h-3 text-white" /></button>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-slate-900 border-t border-slate-800">
        {replyingTo && (
          <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex flex-col border-l-2 border-cyan-500 pl-2">
              <span className="text-cyan-500 text-xs">Replying to {replyingTo.sender === 'me' ? 'yourself' : recipient?.username}</span>
              <span className="text-gray-400 text-sm truncate max-w-[200px]">{replyingTo.text}</span>
            </div>
            <button onClick={() => setReplyingTo(null)}><X className="w-4 h-4 text-gray-400 hover:text-white" /></button>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><Plus className="w-6 h-6" /></button>
            <div className="flex-1 bg-slate-950 rounded-xl flex items-center px-4 py-2.5 border border-slate-800 focus-within:border-cyan-500 transition">
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={`Message @${recipient?.username || 'user'}...`} className="flex-1 bg-transparent text-white outline-none" />
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-1 text-gray-400 hover:text-white"><Smile className="w-5 h-5" /></button>
            </div>
            {inputText ? (
              <button onClick={handleSend} className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 transition shadow-lg shadow-cyan-500/20"><Send className="w-5 h-5" /></button>
            ) : (
              <button className="p-2.5 text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl transition"><Mic className="w-5 h-5" /></button>
            )}
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div className="fixed bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 py-1 min-w-[150px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button onClick={() => setReplyingTo(messages.find(m => m.id === contextMenu.messageId))} className="w-full px-4 py-2 text-left text-white hover:bg-slate-800 flex items-center gap-2"><Reply className="w-4 h-4" /> Reply</button>
              <button className="w-full px-4 py-2 text-left text-white hover:bg-slate-800 flex items-center gap-2"><Copy className="w-4 h-4" /> Copy</button>
              <button onClick={() => handleDeleteMessage(contextMenu.messageId)} className="w-full px-4 py-2 text-left text-red-500 hover:bg-slate-800 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}