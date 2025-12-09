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
    // Check for Biometric/Lock preference
    const storedUsername = localStorage.getItem('qrypt_username');
    if (storedUsername && !biometricAuthenticated) {
      setShowBiometricLock(true);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch Profile
        try {
          const profileSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'profile'));
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data());
            setCurrentUser(user);
          } else {
            // Logged in but no profile (registration needed)
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

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    // Profile fetch will happen in useEffect or we can set it here if passed
  };

  const handleBiometricUnlock = async () => {
    try {
      // Use WebAuthn locally to verify presence (User Verification)
      // This triggers FaceID/TouchID/Windows Hello
      // We are creating a dummy credential to trigger the prompt
      // Fetch challenge from server to prevent Replay Attacks
      let challengeBuffer;
      try {
        const res = await fetch('/api/auth/challenge');
        if (res.ok) {
          const data = await res.json();
          // data.challenge should be base64 or array
          challengeBuffer = Uint8Array.from(atob(data.challenge), c => c.charCodeAt(0));
        } else {
          throw new Error("Server challenge failed");
        }
      } catch (e) {
        // Fallback for offline/demo mode (NOT SECURE for production)
        console.warn("Using local challenge (Insecure)");
        challengeBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      }

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: challengeBuffer,
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

      // If successful (didn't throw), we unlock
      setBiometricAuthenticated(true);
      setShowBiometricLock(false);
    } catch (e) {
      console.error("Biometric auth failed", e);
      alert("Biometric verification failed. Using fallback (simulation for dev).");
      // Fallback for dev if no Auth available
      setBiometricAuthenticated(true);
      setShowBiometricLock(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('qrypt_private_key');
    // We keep username for "Existing User" flow
    setCurrentUser(null);
    setUserProfile(null);
    setBiometricAuthenticated(false);
  };

  if (showBiometricLock) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div
            onClick={handleBiometricUnlock}
            className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/20 cursor-pointer hover:scale-105 transition active:scale-95"
          >
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