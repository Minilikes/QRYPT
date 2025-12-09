import { useState } from 'react';
import { QrCode, Moon, Sun, Lock, LogOut, Clock, Camera, AlertTriangle } from 'lucide-react';
import { db, APP_ID, auth } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

interface SettingsScreenProps {
  profile: any;
  onLogout: () => void;
}

export function SettingsScreen({ profile, onLogout }: SettingsScreenProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [biometric, setBiometric] = useState(localStorage.getItem('qrypt_biometric_enabled') === 'true');
  const [disappearingMessages, setDisappearingMessages] = useState('off');
  const [showQR, setShowQR] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  const username = profile?.username || '@unknown';
  const displayName = profile?.displayName || username;
  const avatarColor = profile?.avatarColor || 'from-cyan-500 to-blue-600';

  const handleBiometricToggle = () => {
    const newValue = !biometric;
    setBiometric(newValue);
    localStorage.setItem('qrypt_biometric_enabled', String(newValue));
  };

  const handlePanicButton = async () => {
    if (!auth.currentUser) return;

    try {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid));
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', uid, 'settings', 'profile'));
      localStorage.clear();
      onLogout();
    } catch (e) {
      console.error("Delete failed", e);
      localStorage.clear();
      onLogout();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Profile Header */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-b border-slate-800">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className={`w-24 h-24 bg-gradient-to-br ${avatarColor} rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20`}>
              <span className="text-white text-3xl">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-slate-900 hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/20">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <h2 className="text-white text-xl font-bold mb-1">{displayName}</h2>
          <p className="text-gray-400 text-sm mb-4">{username}</p>
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition border border-slate-700 text-sm"
          >
            <QrCode className="w-4 h-4" />
            Share ID
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="flex-1 p-4 space-y-6">
        {/* Appearance */}
        <div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Appearance</h3>
          <div className="bg-slate-900/50 rounded-xl divide-y divide-slate-800 border border-slate-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5 text-cyan-500" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                <span className="text-white">Dark Mode</span>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full transition ${darkMode ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-slate-700'
                  }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition transform shadow-lg ${darkMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Privacy</h3>
          <div className="bg-slate-900/50 rounded-xl divide-y divide-slate-800 border border-slate-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-cyan-500" />
                <span className="text-white">Biometric Lock</span>
              </div>
              <button
                onClick={handleBiometricToggle}
                className={`w-12 h-6 rounded-full transition ${biometric ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-slate-700'
                  }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition transform shadow-lg ${biometric ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-cyan-500" />
                <span className="text-white">Disappearing Messages</span>
              </div>
              <select
                value={disappearingMessages}
                onChange={(e) => setDisappearingMessages(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition text-sm"
              >
                <option value="off">Off</option>
                <option value="24h">24 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h3 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3">Danger Zone</h3>
          <div className="bg-slate-900/50 rounded-xl divide-y divide-slate-800 border border-slate-800">
            <button
              onClick={() => setShowPanicConfirm(true)}
              className="w-full p-4 flex items-center gap-3 text-red-500 hover:bg-slate-800/50 transition"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Panic Button</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full p-4 flex items-center gap-3 text-white hover:bg-slate-800/50 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl">
            <h3 className="text-white text-xl mb-4 text-center">Share Identity</h3>

            <div className="bg-white p-4 rounded-xl mb-4">
              <div className={`aspect-square bg-gradient-to-br ${avatarColor} rounded-xl flex items-center justify-center`}>
                <QrCode className="w-24 h-24 text-white" />
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-3 mb-4 border border-slate-800 text-center">
              <p className="text-white font-bold">{displayName}</p>
              <p className="text-sm text-gray-400">{username}</p>
            </div>

            <button
              onClick={() => setShowQR(false)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Panic Confirm Modal */}
      {showPanicConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-900/50 shadow-2xl">
            <div className="text-center mb-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-white text-xl mb-2">Nuclear Option</h3>
              <p className="text-gray-400 text-sm">
                This will permanently delete your identity and all associated data from the server. There is no undo.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPanicConfirm(false)}
                className="flex-1 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePanicButton}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}