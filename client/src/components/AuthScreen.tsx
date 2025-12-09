import { useState, useEffect } from 'react';
import { KeyRound, User, Copy, Check, AlertTriangle, Loader2, ShieldCheck, ChevronRight, RefreshCw } from 'lucide-react';
import { CryptoService } from '../lib/crypto';
import { RecoveryService } from '../lib/recovery';
import { db, auth, APP_ID } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

interface AuthScreenProps {
  onLogin: (user: any, profile: any) => void;
}

// Generate Unique System ID
const generateSystemId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = new Uint32Array(6);
  window.crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
    if (i % 2 !== 0 && i !== 5) result += '-';
  }
  return result;
};

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [step, setStep] = useState<'init' | 'keys_generated' | 'profile_setup'>('init');

  // Login State
  const [loginTab, setLoginTab] = useState<'phrase' | 'key'>('phrase');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginKey, setLoginKey] = useState('');

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

  useEffect(() => { setError(null); }, [mode, loginTab]);

  const initAuth = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  };

  const handleGenerateIdentity = async () => {
    setError(null);
    if (!regUsername.startsWith('@') || regUsername.length < 4) {
      setError('Username must start with @ and be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', regUsername.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Username already taken.");

      const keys = await CryptoService.generateKeys();
      const mnemonic = RecoveryService.generateMnemonic();

      setGeneratedKey(keys.priv);
      setGeneratedPhrase(mnemonic);
      localStorage.setItem(`temp_pub_${regUsername}`, keys.pub);

      setStep('keys_generated');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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

      const recoveryKey = await RecoveryService.deriveKeyFromMnemonic(generatedPhrase);
      const encryptedPrivKey = await CryptoService.symEncrypt(generatedKey, recoveryKey);

      const profileData = {
        uid: user.uid,
        username: regUsername.toLowerCase(),
        displayName: displayName.trim(),
        avatarColor,
        systemId: generateSystemId(),
        publicKey: pubKey,
        encryptedPrivateKey: encryptedPrivKey,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'profile'), profileData);
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), profileData);

      localStorage.setItem('qrypt_username', regUsername);
      localStorage.setItem('qrypt_private_key', generatedKey);

      onLogin(user, profileData); // Pass profile directly!
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    if (!loginUsername.startsWith('@')) return setError("Username must start with @");
    if (!loginKey) return setError("Enter private key or phrase");

    setLoading(true);
    try {
      const user = await initAuth();
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', loginUsername.toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) throw new Error("User not found.");

      const profileData = snap.docs[0].data();
      let privKeyToUse = '';

      if (loginTab === 'phrase') {
        if (!profileData.encryptedPrivateKey) throw new Error("No recovery setup found.");
        const recoveryKey = await RecoveryService.deriveKeyFromMnemonic(loginKey);
        try {
          privKeyToUse = await CryptoService.symDecrypt(profileData.encryptedPrivateKey, recoveryKey);
        } catch { throw new Error("Invalid Recovery Phrase."); }
      } else {
        privKeyToUse = loginKey.trim();
      }

      // Verify Key
      const testMsg = "QREF_VERIFY";
      const encrypted = await CryptoService.encrypt(testMsg, profileData.publicKey);
      if (!encrypted) throw new Error("Public Key Error");
      const decrypted = await CryptoService.decrypt(encrypted, privKeyToUse);
      if (decrypted !== testMsg) throw new Error("Key mismatch!");

      localStorage.setItem('qrypt_username', loginUsername);
      localStorage.setItem('qrypt_private_key', privKeyToUse);

      onLogin(user, profileData); // Pass profile directly!

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const colors = ['from-cyan-500 to-blue-600', 'from-emerald-500 to-green-600', 'from-purple-500 to-indigo-600', 'from-rose-500 to-red-600', 'from-amber-500 to-orange-600'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl text-white font-bold tracking-tight">QRYPT</h1>
          <p className="text-gray-400">Quantum-Resistant Secure Chat</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-2xl">
          {step === 'init' && (
            <div className="flex gap-2 mb-6 bg-slate-950/50 p-1 rounded-xl">
              <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'register' ? 'bg-slate-800 text-white' : 'text-gray-400'}`}>New Identity</button>
              <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'login' ? 'bg-slate-800 text-white' : 'text-gray-400'}`}>Existing User</button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {mode === 'login' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Identity</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="@username" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setLoginTab('phrase')} className={`px-3 py-1 rounded-full border transition ${loginTab === 'phrase' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-slate-800 text-gray-500'}`}>Recovery Phrase</button>
                <button onClick={() => setLoginTab('key')} className={`px-3 py-1 rounded-full border transition ${loginTab === 'key' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-slate-800 text-gray-500'}`}>Raw Key</button>
              </div>
              <textarea value={loginKey} onChange={(e) => setLoginKey(e.target.value)} placeholder={loginTab === 'phrase' ? "Enter recovery phrase..." : "Begin Private Key..."} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs h-24 font-mono focus:border-cyan-500 outline-none resize-none" />
              <button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium flex justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : 'Login'}</button>
              <div className="text-center mt-4">
                <button onClick={() => localStorage.clear()} className="text-[10px] text-gray-600 hover:text-red-400 flex items-center justify-center gap-1 mx-auto"><RefreshCw size={10} /> Clear Cache</button>
              </div>
            </div>
          )}

          {mode === 'register' && step === 'init' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Choose Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="@username" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>
              <button onClick={handleGenerateIdentity} disabled={loading || !regUsername} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium flex justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : 'Generate Identity'}</button>
            </div>
          )}

          {mode === 'register' && step === 'keys_generated' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center">
                <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-white font-bold">Save this Phrase</h3>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative group">
                <p className="font-mono text-lg text-cyan-400 text-center">{generatedPhrase}</p>
                <button onClick={() => { navigator.clipboard.writeText(generatedPhrase); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-2 right-2 p-2 bg-slate-800 rounded-lg text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition">{copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}</button>
              </div>
              <button onClick={() => setStep('profile_setup')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium flex justify-center items-center gap-2">I Have Saved It <ChevronRight size={16} /></button>
            </div>
          )}

          {mode === 'register' && step === 'profile_setup' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center">
                <h3 className="text-white font-bold text-xl">Setup Profile</h3>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-2xl`}>
                  <span className="text-4xl text-white font-bold">{displayName ? displayName[0].toUpperCase() : '?'}</span>
                </div>
                <div className="flex gap-2">
                  {colors.map(c => <button key={c} onClick={() => setAvatarColor(c)} className={`w-6 h-6 rounded-full bg-gradient-to-br ${c} ${avatarColor === c ? 'ring-2 ring-white scale-110' : 'opacity-50'} transition`} />)}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Alice" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <button onClick={handleCompleteRegistration} disabled={loading || !displayName} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium flex justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : 'Complete Setup'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}