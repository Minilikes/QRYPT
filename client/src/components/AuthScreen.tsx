import { useState } from 'react';
import { KeyRound, User, Copy, Check, AlertTriangle, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { CryptoService } from '../lib/crypto';
import { RecoveryService } from '../lib/recovery';
import { db, auth, APP_ID } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isNewUser, setIsNewUser] = useState(true);
  const [useRecoveryPhrase, setUseRecoveryPhrase] = useState(false);
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [generatedRecoveryPhrase, setGeneratedRecoveryPhrase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSystemId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i % 2 !== 0 && i !== 5) result += '-';
    }
    return result;
  };

  const initAuth = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  };

  const generateKeys = async () => {
    setError(null);
    if (!username.startsWith('@')) {
      setError('Username must start with @');
      return;
    }
    if (username.length < 4) {
      setError('Username too short');
      return;
    }

    setIsGenerating(true);

    try {
      // Check uniqueness
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error("Username already taken.");
      }

      const keys = await CryptoService.generateKeys();
      const mnemonic = RecoveryService.generateMnemonic();

      setGeneratedKey(keys.priv);
      setGeneratedRecoveryPhrase(mnemonic);

      // Temporarily store public key to save later
      localStorage.setItem(`temp_pub_${username}`, keys.pub);

      setShowKeyModal(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegisterComplete = async () => {
    setLoading(true);
    try {
      const user = await initAuth();
      if (!user) throw new Error("Auth failed");

      const pubKey = localStorage.getItem(`temp_pub_${username}`);
      if (!pubKey) throw new Error("Key lost. Please regenerate.");

      // Encrypt Private Key with Mnemonic for Recovery
      const recoveryKey = await RecoveryService.deriveKeyFromMnemonic(generatedRecoveryPhrase);
      const encryptedPrivKey = await CryptoService.symEncrypt(generatedKey, recoveryKey);

      const systemId = generateSystemId();
      const profileData = {
        uid: user.uid,
        username: username.toLowerCase(),
        systemId,
        publicKey: pubKey,
        encryptedPrivateKey: encryptedPrivKey, // Storing encrypted backup!
        createdAt: serverTimestamp()
      };

      // Save Private Profile
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'profile'), profileData);
      // Save Public Profile
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), profileData);

      // Save locally
      localStorage.setItem('qrypt_username', username);
      localStorage.setItem('qrypt_private_key', generatedKey);

      onLogin(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setShowKeyModal(false);
    }
  };

  const handleExistingLogin = async () => {
    setError(null);
    if (!username.startsWith('@')) {
      setError('Username must start with @');
      return;
    }

    // If using Recovery Phrase mode
    if (useRecoveryPhrase && !recoveryPhrase) {
      setError('Please enter your recovery phrase');
      return;
    }
    // If using Raw Key mode
    if (!useRecoveryPhrase && !privateKey) {
      setError('Please enter your private key');
      return;
    }

    setLoading(true);
    try {
      console.log("Starting Login Flow...");
      const user = await initAuth();
      console.log("Auth User OK, UID:", user?.uid);

      // 1. Fetch Profile
      console.log("Fetching profile for:", username.toLowerCase());
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', username.toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        console.error("User profile NOT found in Firestore");
        throw new Error("User not found.");
      }

      const profileData = snap.docs[0].data();
      console.log("Profile Found. Public Key length:", profileData.publicKey?.length);

      let privKeyToUse = '';

      if (useRecoveryPhrase) {
        console.log("Using Recovery Phrase flow");
        // Recover Private Key
        if (!profileData.encryptedPrivateKey) {
          throw new Error("No recovery phrase found for this account. Use raw key.");
        }
        const recoveryKey = await RecoveryService.deriveKeyFromMnemonic(recoveryPhrase);
        try {
          privKeyToUse = await CryptoService.symDecrypt(profileData.encryptedPrivateKey, recoveryKey);
          console.log("Key recovered successfully");
        } catch (e) {
          console.error("Recovery decryption failed", e);
          throw new Error("Invalid Recovery Phrase");
        }
      } else {
        console.log("Using Raw Private Key flow");
        privKeyToUse = privateKey;
      }

      // 2. Verify Key
      console.log("Verifying Key Pair...");
      const testMsg = "QREF_VERIFY";

      // Encrypt with stored PUBLIC key
      let encrypted = null;
      try {
        encrypted = await CryptoService.encrypt(testMsg, profileData.publicKey);
      } catch (e) {
        console.error("Encryption with stored PUBLIC key failed.", e);
        throw new Error("Stored Public Key is invalid or corrupt.");
      }

      if (!encrypted) {
        throw new Error("Encryption returned null");
      }

      // Decrypt with provided PRIVATE key
      let decrypted = null;
      try {
        decrypted = await CryptoService.decrypt(encrypted, privKeyToUse);
      } catch (e) {
        console.error("Decryption threw error", e);
      }

      console.log("Decrypted result:", decrypted === testMsg ? "MATCH" : "MISMATCH", "Value:", decrypted);

      if (decrypted !== testMsg) throw new Error("Private Key does not match the account's Public Key");

      // 3. Save
      localStorage.setItem('qrypt_username', username);
      localStorage.setItem('qrypt_private_key', privKeyToUse);

      console.log("Login Successful");
      onLogin(user);

    } catch (e: any) {
      console.error("Login Error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(generatedRecoveryPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl text-white mb-2">QRYPT</h1>
          <p className="text-gray-400">End-to-End Encrypted Messaging</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800 shadow-2xl">
          {/* Toggle */}
          <div className="flex gap-2 mb-6 bg-slate-950/50 p-1 rounded-xl">
            <button
              onClick={() => { setIsNewUser(true); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg transition ${isNewUser ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              New Identity
            </button>
            <button
              onClick={() => { setIsNewUser(false); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg transition ${!isNewUser ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Existing User
            </button>
          </div>

          {/* Debug/Rescue Tool */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={async () => {
                if (!confirm("Force delete account '@mini'? This cannot be undone.")) return;
                try {
                  const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'), where('username', '==', '@mini'));
                  const snap = await getDocs(q);
                  if (snap.empty) { alert("User @mini not found."); return; }
                  const uid = snap.docs[0].id;
                  await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid));
                  await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', uid, 'settings', 'profile'));
                  alert("Deleted @mini. You can now register it again.");
                } catch (e: any) {
                  alert("Error: " + e.message);
                }
              }}
              className="text-[10px] text-red-500 hover:text-red-400 underline"
            >
              Reset @mini
            </button>
          </div>

          {isNewUser ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
                  />
                </div>
              </div>

              <button
                onClick={generateKeys}
                disabled={isGenerating || !username}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Keys...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    Generate Identity
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUseRecoveryPhrase(false)}
                  className={`text-xs px-3 py-1 rounded-lg border ${!useRecoveryPhrase ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500'}`}
                >
                  Use Private Key
                </button>
                <button
                  onClick={() => setUseRecoveryPhrase(true)}
                  className={`text-xs px-3 py-1 rounded-lg border ${useRecoveryPhrase ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500'}`}
                >
                  Use Recovery Phrase
                </button>
              </div>

              {useRecoveryPhrase ? (
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Recovery Phrase (12 Words)</label>
                  <textarea
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                    placeholder="abandon ability able..."
                    rows={3}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono text-sm transition leading-tight"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Private Key (PEM)</label>
                  <textarea
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Paste your private key here..."
                    rows={6}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono text-[10px] transition leading-tight"
                  />
                </div>
              )}

              <button
                onClick={handleExistingLogin}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20 flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Login'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center flex items-center justify-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border border-slate-800 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white text-xl mb-2">Secure Identity Created</h3>
              <p className="text-gray-400 text-sm">
                Save your <strong>Recovery Phrase</strong>. It is the only way to recover your account if you lose your device.
              </p>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-4 mb-4 border border-slate-800 relative group">
              <p className="text-cyan-400 text-xs uppercase font-bold mb-2">Recovery Phrase</p>
              <p className="text-white font-mono text-lg leading-relaxed">{generatedRecoveryPhrase}</p>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={handleCopyPhrase} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 flex items-center gap-1">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 mb-6 border border-slate-800/50">
              <div className="flex items-start gap-2 text-xs text-gray-400">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Your Private Key has been encrypted with this phrase and securely stored. You don't need to save the raw key if you keep this phrase safe.</p>
              </div>
            </div>

            <button
              onClick={handleRegisterComplete}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'I Have Saved My Phrase'}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}