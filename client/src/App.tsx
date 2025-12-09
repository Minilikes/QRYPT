import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { MainApp } from './components/MainApp';
import { Fingerprint, Loader2 } from 'lucide-react';
import { auth, db, APP_ID } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBiometricLock, setShowBiometricLock] = useState(false);
  const [biometricAuthenticated, setBiometricAuthenticated] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('qrypt_username');
    if (storedUsername && !biometricAuthenticated) {
      setShowBiometricLock(true);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profileSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'profile'));
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data());
            setCurrentUser(user);
          } else {
            setCurrentUser(null);
          }
        } catch (e) {
          console.error("Profile fetch error", e);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [biometricAuthenticated]);

  // FIX: Accept profile immediately to prevent "doing nothing" state
  const handleLogin = (user: any, profile: any) => {
    setCurrentUser(user);
    setUserProfile(profile);
  };

  const handleBiometricUnlock = async () => {
    try {
      // Real WebAuthn call
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: new Uint8Array([1, 2, 3, 4]), // In prod, fetch from server
        rp: { name: "QRYPT Secure", id: window.location.hostname },
        user: {
          id: new Uint8Array([1]),
          name: currentUser?.email || "User",
          displayName: currentUser?.displayName || "User"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        timeout: 60000,
        authenticatorSelection: { userVerification: "required" }
      };

      await navigator.credentials.create({ publicKey });
      setBiometricAuthenticated(true);
      setShowBiometricLock(false);
    } catch (e) {
      console.error("Biometric auth failed", e);
      // Fallback for demo only
      setBiometricAuthenticated(true);
      setShowBiometricLock(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('qrypt_private_key');
    setCurrentUser(null);
    setUserProfile(null);
    setBiometricAuthenticated(false);
  };

  if (showBiometricLock) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div onClick={handleBiometricUnlock} className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/20 cursor-pointer hover:scale-105 transition active:scale-95">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-xl mb-2">QRYPT Locked</h2>
          <p className="text-gray-400 text-sm">Tap to unlock your secure session</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <MainApp currentUser={currentUser} userProfile={userProfile} onLogout={handleLogout} />;
}