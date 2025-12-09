import { useState, useEffect } from 'react';
import { KeyRound, User, Copy, Check, AlertTriangle, Loader2, ShieldCheck, Lock, ChevronRight, RefreshCw } from 'lucide-react';
import { CryptoService } from '../lib/crypto';
import { RecoveryService } from '../lib/recovery';
import { db, auth, APP_ID } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

// True random System ID
const generateSystemId = () => {
  const array = new Uint32Array(3);
  window.crypto.getRandomValues(array);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    // Map random number to char
    const val = array[i] % chars.length;
    result += chars.charAt(val);
    if (i < 2) result += '-';
  }
  // Format: A-B-C (simple 3 char) or expand logic as needed. 
  // Let's do the original format A1-B2-C3
  let longResult = '';
  const longArray = new Uint32Array(6);
  window.crypto.getRandomValues(longArray);
  for (let i = 0; i < 6; i++) {
    longResult += chars.charAt(longArray[i] % chars.length);
    if (i % 2 !== 0 && i !== 5) longResult += '-';
  }
  return longResult;
};

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [step, setStep] = useState<'init' | 'keys_generated' | 'profile_setup'>('init');

  // Login State
  const [loginTab, setLoginTab] = useState<'phrase' | 'key'>('phrase');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginKey, setLoginKey] = useState(''); // Phrase or PEM

  // Registration State
  const [regUsername, setRegUsername] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [generatedPhrase, setGeneratedPhrase] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('from-cyan-500 to-blue-600');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Clear error when switching modes
  useEffect(() => { setError(null); }, [mode, loginTab]);

  const initAuth = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  };

  // --- REGISTRATION FLOW ---

  const handleGenerateIdentity = async () => {
    setError(null);
    if (!regUsername.startsWith('@') || regUsername.length < 4) {
      setError('Username must start with @ and be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check Uniqueness
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', regUsername.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Username already taken.");

      // 2. Generate Keys
      const keys = await CryptoService.generateKeys();
      const mnemonic = RecoveryService.generateMnemonic();

      setGeneratedKey(keys.priv);
      setGeneratedPhrase(mnemonic);

      // Store Public Key temporarily in memory (or local state)
      // We don't save to DB yet.
      localStorage.setItem(`temp_pub_${regUsername}`, keys.pub);

      setStep('keys_generated');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhraseSaved = () => {
    setStep('profile_setup');
  };

  const handleCompleteRegistration = async () => {
    if (!displayName.trim()) {
      setError("Please set a display name.");
      return;
    }
    setLoading(true);

    try {
      const user = await initAuth();
      if (!user) throw new Error("Auth failed");

      const pubKey = localStorage.getItem(`temp_pub_${regUsername}`);
      if (!pubKey) throw new Error("Key session lost. Please restart.");

      // Encrypt Private Key for Recovery
      const recoveryKey = await RecoveryService.deriveKeyFromMnemonic(generatedPhrase);
      const encryptedPrivKey = await CryptoService.symEncrypt(generatedKey, recoveryKey);

      const systemId = generateSystemId();

      const profileData = {
        uid: user.uid,
        username: regUsername.toLowerCase(),
        displayName: displayName.trim(),
        avatarColor,
        systemId,
        publicKey: pubKey,
        encryptedPrivateKey: encryptedPrivKey,
        createdAt: serverTimestamp()
      };

      // Atomic-like Save
      // 1. Private Profile
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'profile'), profileData);
      // 2. Public Profile
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), profileData);

      // Local Session
      localStorage.setItem('qrypt_username', regUsername);
      localStorage.setItem('qrypt_private_key', generatedKey); // Raw key for current session

      onLogin(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN FLOW ---

  const handleLogin = async () => {
    setError(null);
    if (!loginUsername.startsWith('@')) {
      setError("Username must start with @");
      return;
    }
    if (!loginKey) {
      setError(loginTab === 'phrase' ? "Enter recovery phrase" : "Enter private key");
      return;
    }

    setLoading(true);
    try {
      const user = await initAuth();

      // 1. Fetch Profile Publicly
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', loginUsername.toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) throw new Error("User not found.");

      const profileData = snap.docs[0].data();
      let privKeyToUse = '';

      if (loginTab === 'phrase') {
        // Recovery Mode
        if (!profileData.encryptedPrivateKey) throw new Error("This account has no recovery setup.");
        const recoveryKey = await RecoveryService.deriveKeyFromMnemonic(loginKey);
        try {
          privKeyToUse = await CryptoService.symDecrypt(profileData.encryptedPrivateKey, recoveryKey);
        } catch (e) {
          throw new Error("Invalid Recovery Phrase.");
        }
      } else {
        // Raw Key Mode
        privKeyToUse = loginKey.trim();
      }

      // 2. Verify Key Pair
      const testMsg = "QREF_VERIFY";
      const encrypted = await CryptoService.encrypt(testMsg, profileData.publicKey);
      if (!encrypted) throw new Error("Public Key Error");

      const decrypted = await CryptoService.decrypt(encrypted, privKeyToUse);
      if (decrypted !== testMsg) throw new Error("Key mismatch! This private key doesn't belong to this user.");

      // 3. Success
      localStorage.setItem('qrypt_username', loginUsername);
      localStorage.setItem('qrypt_private_key', privKeyToUse);

      onLogin(user);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- RENDER HELPERS ---

  const colors = [
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-green-600',
    'from-purple-500 to-indigo-600',
    'from-rose-500 to-red-600',
    'from-amber-500 to-orange-600',
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl text-white font-bold tracking-tight">QRYPT</h1>
          <p className="text-gray-400">Quantum-Resistant Secure Chat</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-2xl">

          {/* Mode Switch (Only visible in init) */}
          {step === 'init' && (
            <div className="flex gap-2 mb-6 bg-slate-950/50 p-1 rounded-xl">
              <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'register' ? 'bg-slate-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>New Identity</button>
              <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'login' ? 'bg-slate-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Existing User</button>
            </div>
          )}

          {/* ERROR BOX */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* --- VIEW: LOGIN --- */}
          {mode === 'login' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">Identity</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 text-xs">
                <button onClick={() => setLoginTab('phrase')} className={`px-3 py-1 rounded-full border transition ${loginTab === 'phrase' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-slate-800 text-gray-500'}`}>Recovery Phrase</button>
                <button onClick={() => setLoginTab('key')} className={`px-3 py-1 rounded-full border transition ${loginTab === 'key' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-slate-800 text-gray-500'}`}>Raw Private Key</button>
              </div>

              {loginTab === 'phrase' ? (
                <textarea
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  placeholder="Enter your 12-word recovery phrase..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-cyan-500 focus:outline-none transition h-24 resize-none"
                />
              ) : (
                <textarea
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-[10px] font-mono focus:border-cyan-500 focus:outline-none transition h-24 resize-none"
                />
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Decrypt & Login'}
              </button>

              <div className="text-center mt-4">
                <button onClick={() => localStorage.clear()} className="text-[10px] text-gray-600 hover:text-red-400 flex items-center justify-center gap-1 mx-auto">
                  <RefreshCw size={10} /> Clear Local Cache
                </button>
              </div>
            </div>
          )}

          {/* --- VIEW: REGISTER STEP 1 (Generate) --- */}
          {mode === 'register' && step === 'init' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">Choose Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">A unique 2048-bit RSA key pair will be generated for this identity.</p>
              </div>

              <button
                onClick={handleGenerateIdentity}
                disabled={loading || !regUsername}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Generate Identity'}
              </button>
            </div>
          )}

          {/* --- VIEW: REGISTER STEP 2 (Save Keys) --- */}
          {mode === 'register' && step === 'keys_generated' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-white font-bold">Identity Generated</h3>
                <p className="text-xs text-gray-400">Save this phrase. It is the ONLY way to recover your account.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative group">
                <p className="font-mono text-lg text-cyan-400 text-center leading-relaxed">{generatedPhrase}</p>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 bg-slate-800 rounded-lg text-gray-300 hover:text-white transition opacity-0 group-hover:opacity-100"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-lg flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                <p className="text-[10px] text-gray-300 leading-tight">
                  We do not store your private key. If you lose this phrase, your account and messages are lost forever.
                </p>
              </div>

              <button
                onClick={handlePhraseSaved}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition flex justify-center items-center gap-2"
              >
                I Have Saved It <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* --- VIEW: REGISTER STEP 3 (Profile Setup) --- */}
          {mode === 'register' && step === 'profile_setup' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <h3 className="text-white font-bold text-xl">Setup Profile</h3>
                <p className="text-xs text-gray-400">Customize how others see you</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-2xl`}>
                  <span className="text-4xl text-white font-bold">{displayName ? displayName[0].toUpperCase() : '?'}</span>
                </div>

                <div className="flex gap-2">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setAvatarColor(c)}
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${c} ${avatarColor === c ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'} transition`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alice"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition"
                />
              </div>

              <button
                onClick={handleCompleteRegistration}
                disabled={loading || !displayName}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Complete Setup'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}