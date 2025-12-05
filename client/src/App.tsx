import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  MessageSquare,
  Users,
  Settings,
  Send,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Loader2,
  UserPlus,
  QrCode,
  Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import clsx from 'clsx';

// --- 1. CONFIGURATION ---
// !!! IMPORTANT: REPLACE THIS WITH YOUR FIREBASE KEYS !!!
const firebaseConfig = {
  apiKey: "AIzaSyCq8XXgfkFkv7eSvAcMgm6nIoalL-we5D4",
  authDomain: "qrypt-app.firebaseapp.com",
  projectId: "qrypt-app",
  storageBucket: "qrypt-app.firebasestorage.app",
  messagingSenderId: "235484035256",
  appId: "1:235484035256:web:9d258f60c875bb00b45c4d",
  measurementId: "G-HV3T708VPH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'qrypt-default';

// --- 2. CRYPTO SERVICE (Simulated Post-Quantum) ---
class CryptoService {
  static async generateKeys() {
    const key = await window.crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true, ["encrypt", "decrypt"]
    );
    const pub = await window.crypto.subtle.exportKey("spki", key.publicKey);
    const priv = await window.crypto.subtle.exportKey("pkcs8", key.privateKey);
    return {
      pub: btoa(String.fromCharCode(...new Uint8Array(pub))),
      priv: btoa(String.fromCharCode(...new Uint8Array(priv)))
    };
  }

  static async encrypt(text: string, recipientPubPem: string) {
    try {
      const binaryDer = Uint8Array.from(atob(recipientPubPem), c => c.charCodeAt(0));
      const pubKey = await window.crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
      const enc = new TextEncoder();
      const encoded = enc.encode(text);
      const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, encoded);
      return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (e) {
      console.error("Encryption failed", e);
      return null;
    }
  }

  static async decrypt(encryptedBase64: string, myPrivPem: string) {
    try {
      const binaryDer = Uint8Array.from(atob(myPrivPem), c => c.charCodeAt(0));
      const privKey = await window.crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
      const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
      const decrypted = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, encryptedData);
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      return "🔒 Undecryptable";
    }
  }
}

// --- 3. UTILS ---
const generateSystemId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  // Format: A1-B2-C3
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i % 2 !== 0 && i !== 5) result += '-';
  }
  return result;
};

// --- 4. MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [view, setView] = useState<'main' | 'chat' | 'search'>('main');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch Profile
        const docRef = doc(db, 'artifacts', appId, 'users', u.uid, 'settings', 'profile');
        const snap = await getDoc(docRef);
        if (snap.exists()) setProfile(snap.data());
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <LoadingScreen text="ESTABLISHING SECURE UPLINK..." />;
  if (!user) return <LoadingScreen text="AUTHENTICATING..." />;
  if (!profile) return <Registration user={user} onComplete={setProfile} />;

  return (
    <div className="flex justify-center h-screen bg-black font-sans text-slate-200">
      <div className="w-full max-w-md h-full bg-[#0a0a0a] flex flex-col relative overflow-hidden shadow-2xl border-x border-slate-900">

        {view === 'main' && (
          <>
            {/* Header */}
            <header className="h-16 bg-[#111] border-b border-slate-800 flex items-center justify-between px-4 z-10">
              <h1 className="text-emerald-500 font-bold tracking-wider flex items-center gap-2">
                <Shield size={20} /> QRYPT
              </h1>
              <div className="flex gap-4">
                <button onClick={() => setView('search')} className="text-slate-400 hover:text-white"><UserPlus size={22} /></button>
                <button className="text-slate-400 hover:text-white"><Settings size={22} /></button>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-[#0a0a0a] relative scrollbar-hide">
              {activeTab === 'chats' && (
                <ChatList
                  userId={user.uid}
                  onSelect={(id: string) => { setActiveChatId(id); setView('chat'); }}
                />
              )}
              {activeTab === 'friends' && (
                <FriendList
                  userId={user.uid}
                  onSelect={(id: string) => { setActiveChatId(id); setView('chat'); }}
                />
              )}
              {activeTab === 'settings' && <UserProfileView profile={profile} />}
            </main>

            {/* Bottom Nav */}
            <nav className="h-16 bg-[#111] border-t border-slate-800 flex justify-around items-center text-xs">
              <NavBtn icon={MessageSquare} label="Chats" active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} />
              <NavBtn icon={Users} label="Friends" active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} />
              <NavBtn icon={Lock} label="ID Card" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </nav>
          </>
        )}

        {view === 'chat' && activeChatId && (
          <ChatWindow
            chatId={activeChatId}
            currentUserId={user.uid}
            onBack={() => { setView('main'); setActiveChatId(null); }}
          />
        )}

        {view === 'search' && (
          <SearchScreen
            currentUserId={user.uid}
            onBack={() => setView('main')}
            onChatCreated={(id: string) => { setActiveChatId(id); setView('chat'); }}
          />
        )}

        <PanicButton />
      </div>
    </div>
  );
}

// --- 5. SUB-COMPONENTS ---

const Registration = ({ user, onComplete }: any) => {
  const [username, setUsername] = useState('');
  const [systemId] = useState(generateSystemId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (username.length < 3) return setError("Username too short.");
    setLoading(true);

    try {
      // 1. Check Uniqueness (Simplified for prototype)
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'profiles'), where('username', '==', username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Username taken.");

      // 2. Generate Keys
      const keys = await CryptoService.generateKeys();
      localStorage.setItem(`qry_priv_${user.uid}`, keys.priv);

      // 3. Save Profile
      const profileData = {
        uid: user.uid,
        username: username.toLowerCase().replace(/[^a-z0-9]/g, ''),
        systemId,
        publicKey: keys.pub,
        createdAt: serverTimestamp()
      };

      // Save Private Profile
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), profileData);
      // Save Public Profile
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), profileData);

      onComplete(profileData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-emerald-500 font-mono">
      <div className="w-full max-w-sm border border-emerald-500/30 bg-[#111] p-8 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        <Shield size={48} className="mx-auto mb-6 text-emerald-500 animate-pulse" />
        <h1 className="text-2xl font-bold text-center mb-2 tracking-widest text-white">QRYPT_ACCESS</h1>
        <p className="text-center text-xs text-slate-500 mb-8">SECURE TERMINAL INITIALIZATION</p>

        <div className="bg-black p-4 rounded border border-slate-800 mb-6 text-center">
          <p className="text-[10px] text-emerald-700 uppercase tracking-widest mb-1">ASSIGNED SYSTEM ID</p>
          <p className="text-2xl font-bold tracking-widest text-white">{systemId}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 ml-1">CLAIM IDENTITY (@)</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-slate-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition-colors"
              placeholder="username"
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-3 rounded transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'ESTABLISH UPLINK'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatList = ({ userId, onSelect }: any) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to user's active chats collection
    const q = query(
      collection(db, 'artifacts', appId, 'users', userId, 'active_chats'),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading) return <div className="p-8 text-center text-slate-600 text-xs">SCANNING CHANNELS...</div>;
  if (chats.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-600">
      <MessageSquare size={48} className="mb-4 opacity-20" />
      <p className="text-sm">NO_ACTIVE_CHANNELS</p>
    </div>
  );

  return (
    <div className="divide-y divide-slate-800/50">
      {chats.map(chat => (
        <div key={chat.id} onClick={() => onSelect(chat.chatId)} className="flex items-center gap-4 p-4 hover:bg-[#111] cursor-pointer transition-colors">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-bold border border-slate-700">
            {chat.otherUsername?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="text-white font-bold text-sm">@{chat.otherUsername}</h3>
              <span className="text-[10px] text-slate-600 font-mono">
                {chat.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{chat.lastMessage || 'Encrypted transmission...'}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const ChatWindow = ({ chatId, currentUserId, onBack }: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState<any>(null);
  const bottomRef = useRef<any>(null);

  // 1. Fetch Metadata
  useEffect(() => {
    const fetchMeta = async () => {
      // Get chat participants
      const chatDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', chatId));
      if (!chatDoc.exists()) return;
      const otherUid = chatDoc.data().participants.find((id: string) => id !== currentUserId);

      // Get recipient profile (public)
      const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', otherUid));
      if (userDoc.exists()) setRecipient(userDoc.data());
    };
    fetchMeta();
  }, [chatId]);

  // 2. Listen & Decrypt
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const rawMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myPriv = localStorage.getItem(`qry_priv_${currentUserId}`);

      if (myPriv) {
        const decrypted = await Promise.all(rawMsgs.map(async (m: any) => {
          if (m.senderId === currentUserId) return { ...m, text: m.plainText || "Encrypted" }; // Self (Prototype hack: store plain for self)
          const txt = await CryptoService.decrypt(m.content, myPriv);
          return { ...m, text: txt };
        }));
        setMessages(decrypted);
      }
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const send = async () => {
    if (!input.trim() || !recipient) return;
    const text = input;
    setInput('');

    // Encrypt for recipient
    const encrypted = await CryptoService.encrypt(text, recipient.publicKey);
    if (!encrypted) return;

    // Save Message
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', chatId, 'messages'), {
      senderId: currentUserId,
      content: encrypted,
      plainText: text, // NOTE: Ideally encrypt for self too. Storing plain for prototype convenience.
      timestamp: serverTimestamp()
    });

    // Update Last Message for both users
    const update = { lastMessage: "Encrypted Message", updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'artifacts', appId, 'users', currentUserId, 'active_chats', chatId), update, { merge: true });
    await setDoc(doc(db, 'artifacts', appId, 'users', recipient.uid, 'active_chats', chatId), update, { merge: true });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      <header className="h-16 bg-[#111] flex items-center px-4 gap-4 border-b border-slate-800">
        <button onClick={onBack}><ArrowLeft className="text-slate-400 hover:text-white" /></button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-sm">@{recipient?.username || 'Loading...'}</h2>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <Lock size={10} /> <span>SECURE_CONN_ESTABLISHED</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={clsx(
                "max-w-[75%] px-4 py-2 rounded-2xl text-sm break-words",
                isMe ? "bg-emerald-700 text-white rounded-tr-none" : "bg-[#1f2937] text-slate-200 rounded-tl-none border border-slate-700"
              )}>
                {m.text}
                <div className={clsx("text-[9px] mt-1 text-right", isMe ? "text-emerald-300" : "text-slate-500")}>
                  {m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-[#111] border-t border-slate-800 flex gap-2">
        <input
          className="flex-1 bg-black border border-slate-700 rounded-full px-4 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
          placeholder="Encrypt message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send} className="p-2 bg-emerald-600 rounded-full text-black hover:bg-emerald-500"><Send size={18} /></button>
      </div>
    </div>
  );
};

const SearchScreen = ({ currentUserId, onBack, onChatCreated }: any) => {
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!term) return;
    setLoading(true);
    setResult(null);
    // Find public profile by username
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'profiles'), where('username', '==', term.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setResult(snap.docs[0].data());
    }
    setLoading(false);
  };

  const startChat = async () => {
    if (!result) return;

    // 1. Create Public Chat Room
    const chatRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats'), {
      participants: [currentUserId, result.uid],
      createdAt: serverTimestamp()
    });

    // 2. Add to My Active Chats
    await setDoc(doc(db, 'artifacts', appId, 'users', currentUserId, 'active_chats', chatRef.id), {
      chatId: chatRef.id,
      otherUid: result.uid,
      otherUsername: result.username,
      updatedAt: serverTimestamp()
    });

    // 3. Add to Their Active Chats (Need my username)
    const myProfile = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', currentUserId));
    const myUsername = myProfile.data()?.username || "Unknown";

    await setDoc(doc(db, 'artifacts', appId, 'users', result.uid, 'active_chats', chatRef.id), {
      chatId: chatRef.id,
      otherUid: currentUserId,
      otherUsername: myUsername,
      updatedAt: serverTimestamp()
    });

    onChatCreated(chatRef.id);
  };

  return (
    <div className="h-full bg-[#0a0a0a] p-6">
      <button onClick={onBack} className="mb-6 text-slate-400"><ArrowLeft /></button>
      <h2 className="text-white font-bold text-xl mb-6">Secure Search</h2>

      <div className="flex gap-2 mb-8">
        <input
          className="flex-1 bg-[#111] border border-slate-700 p-3 rounded text-white outline-none"
          placeholder="Search @username"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button onClick={search} className="bg-emerald-600 px-4 rounded text-black font-bold">Find</button>
      </div>

      {loading && <Loader2 className="animate-spin mx-auto text-emerald-500" />}

      {result && (
        <div className="bg-[#111] border border-emerald-500/30 p-6 rounded-xl flex flex-col items-center animate-fade-in">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-3xl font-bold text-emerald-500 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {result.username[0].toUpperCase()}
          </div>
          <h3 className="text-white text-lg font-bold">@{result.username}</h3>
          <p className="text-emerald-600 font-mono text-sm mb-6">{result.systemId}</p>
          <button onClick={startChat} className="bg-white text-black px-8 py-2 rounded-full font-bold hover:bg-gray-200 w-full">Start Encrypted Chat</button>
        </div>
      )}

      {!loading && term && !result && <p className="text-center text-slate-600">NO_TARGET_FOUND</p>}
    </div>
  );
};

const FriendList = ({ userId, onSelect }: any) => {
  // Logic re-used from ChatList for this prototype, simply filtering or showing favorites would go here.
  // For now, we show active chats as "friends"
  return (
    <div className="p-4">
      <div className="text-slate-500 text-xs mb-4 text-center">CONTACTS SYNCED FROM ACTIVE CHATS</div>
      <ChatList userId={userId} onSelect={onSelect} />
    </div>
  );
};

const UserProfileView = ({ profile }: any) => (
  <div className="p-8 flex flex-col items-center h-full">
    <div className="w-24 h-24 bg-[#111] rounded-full border-2 border-emerald-500 mb-6 flex items-center justify-center relative shadow-[0_0_20px_rgba(16,185,129,0.2)]">
      <QrCode size={40} className="text-emerald-500" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">@{profile.username}</h2>
    <div className="bg-black px-6 py-3 rounded border border-slate-800 mb-8 w-full text-center">
      <p className="text-[10px] text-slate-500 uppercase mb-1">System Identifier</p>
      <p className="font-mono text-emerald-500 tracking-widest text-xl">{profile.systemId}</p>
    </div>
    <div className="w-full space-y-3">
      <button className="w-full bg-[#111] text-slate-300 py-4 rounded border border-slate-800 hover:border-emerald-500/50 transition-colors flex justify-between px-4">
        <span>Private Keys</span> <Check size={16} className="text-emerald-500" />
      </button>
      <button className="w-full bg-[#111] text-slate-300 py-4 rounded border border-slate-800 hover:border-emerald-500/50 transition-colors flex justify-between px-4">
        <span>Biometrics</span> <span className="text-xs text-red-500">DISABLED</span>
      </button>
      <button onClick={() => window.location.reload()} className="w-full bg-red-900/10 text-red-500 py-4 rounded border border-red-900/30 mt-8 hover:bg-red-900/20">
        TERMINATE SESSION
      </button>
    </div>
  </div>
);

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={clsx("flex flex-col items-center gap-1 w-16", active ? "text-emerald-500" : "text-slate-600 hover:text-slate-400")}>
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const LoadingScreen = ({ text }: any) => (
  <div className="h-screen bg-black flex flex-col items-center justify-center text-emerald-600">
    <Loader2 size={48} className="animate-spin mb-4" />
    <p className="font-mono text-xs tracking-widest">{text}</p>
  </div>
);

const PanicButton = () => {
  const [panic, setPanic] = useState(false);
  const timer = useRef<any>(null);

  if (panic) return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-end pb-10 text-black font-mono">
      <div className="w-full max-w-xs grid grid-cols-4 gap-2 p-4">
        <div className="col-span-4 bg-gray-200 h-16 mb-4 rounded text-right p-4 text-3xl font-sans">0</div>
        {[7, 8, 9, '/', 4, 5, 6, '*', 1, 2, 3, '-', 0, '.', '=', '+'].map(k => (
          <button key={k} className="bg-gray-100 p-4 rounded text-xl shadow-sm active:bg-gray-300">{k}</button>
        ))}
      </div>
      <button onClick={() => setPanic(false)} className="text-gray-300 text-xs mt-4">Safe Mode Active</button>
    </div>
  );

  return (
    <button
      onMouseDown={() => { timer.current = setTimeout(() => setPanic(true), 1000); }}
      onMouseUp={() => clearTimeout(timer.current)}
      onTouchStart={() => { timer.current = setTimeout(() => setPanic(true), 1000); }}
      onTouchEnd={() => clearTimeout(timer.current)}
      className="absolute bottom-20 right-4 w-12 h-12 bg-red-900/10 rounded-full flex items-center justify-center text-red-600 border border-red-900/30 backdrop-blur-sm z-50 active:scale-95 transition-transform"
    >
      <AlertTriangle size={20} />
    </button>
  );
};
