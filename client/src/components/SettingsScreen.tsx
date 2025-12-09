import { useState } from 'react';
import { QrCode, Lock, LogOut, Clock, AlertTriangle, Check, X, Edit2 } from 'lucide-react';
import { db, APP_ID, auth } from '../lib/firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface SettingsScreenProps {
  profile: any;
  onLogout: () => void;
}

export function SettingsScreen({ profile, onLogout }: SettingsScreenProps) {
  const [biometric, setBiometric] = useState(localStorage.getItem('qrypt_biometric_enabled') === 'true');
  const [showQR, setShowQR] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState('off');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [editColor, setEditColor] = useState(profile?.avatarColor || 'from-cyan-500 to-blue-600');
  const [isSaving, setIsSaving] = useState(false);

  const colors = ['from-cyan-500 to-blue-600', 'from-emerald-500 to-green-600', 'from-purple-500 to-indigo-600', 'from-rose-500 to-red-600', 'from-amber-500 to-orange-600'];

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !editName.trim()) return;
    setIsSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const updates = { displayName: editName, avatarColor: editColor };
      await updateDoc(doc(db, 'artifacts', APP_ID, 'users', uid, 'settings', 'profile'), updates);
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid), updates);
      window.location.reload();
    } catch (e) {
      console.error("Update failed", e);
      setIsSaving(false);
    }
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
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950">
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-b border-slate-800">
        <div className="flex flex-col items-center">
          <div className="relative mb-4 group">
            <div className={`w-24 h-24 bg-gradient-to-br ${isEditing ? editColor : profile.avatarColor} rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-all`}>
              <span className="text-white text-3xl font-bold">{(isEditing ? editName : profile.displayName)?.charAt(0).toUpperCase()}</span>
            </div>
            {isEditing && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900 p-1 rounded-full border border-slate-700 shadow-xl z-10">
                {colors.map(c => <button key={c} onClick={() => setEditColor(c)} className={`w-4 h-4 rounded-full bg-gradient-to-br ${c} ${editColor === c ? 'ring-2 ring-white' : 'opacity-50'}`} />)}
              </div>
            )}
            {!isEditing && (
              <button onClick={() => { setIsEditing(true); setEditName(profile.displayName); setEditColor(profile.avatarColor); }} className="absolute bottom-0 right-0 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 hover:bg-slate-700 text-white shadow-lg"><Edit2 className="w-4 h-4" /></button>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mb-4 mt-4 w-full max-w-xs">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-white text-center w-full focus:border-cyan-500 outline-none" autoFocus />
              <button onClick={handleSaveProfile} disabled={isSaving} className="p-2 bg-green-600 rounded-lg text-white hover:bg-green-500"><Check className="w-4 h-4" /></button>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-bold mb-1">{profile.displayName}</h2>
              <p className="text-gray-400 text-sm mb-4">{profile.username}</p>
              <button onClick={() => setShowQR(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition border border-slate-700 text-sm"><QrCode className="w-4 h-4" /> Share ID</button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        <div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Privacy</h3>
          <div className="bg-slate-900/50 rounded-xl divide-y divide-slate-800 border border-slate-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><Lock className="w-5 h-5 text-cyan-500" /><span className="text-white">Biometric Lock</span></div>
              <button onClick={() => { setBiometric(!biometric); localStorage.setItem('qrypt_biometric_enabled', String(!biometric)); }} className={`w-12 h-6 rounded-full transition ${biometric ? 'bg-cyan-600' : 'bg-slate-700'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-lg transition transform ${biometric ? 'translate-x-6' : 'translate-x-0.5'}`} /></button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3"><Clock className="w-5 h-5 text-cyan-500" /><span className="text-white">Disappearing Messages</span></div>
              <select value={disappearingMessages} onChange={(e) => setDisappearingMessages(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"><option value="off">Off</option><option value="24h">24 hours</option></select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3">Danger Zone</h3>
          <div className="bg-slate-900/50 rounded-xl divide-y divide-slate-800 border border-slate-800">
            <button onClick={() => setShowPanicConfirm(true)} className="w-full p-4 flex items-center gap-3 text-red-500 hover:bg-slate-800/50 transition"><AlertTriangle className="w-5 h-5" /><span>Panic Button</span></button>
            <button onClick={onLogout} className="w-full p-4 flex items-center gap-3 text-white hover:bg-slate-800/50 transition"><LogOut className="w-5 h-5" /><span>Logout</span></button>
          </div>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-700 text-center">
            <QrCode className="w-32 h-32 text-white mx-auto mb-4" />
            <p className="text-white font-mono text-lg mb-4">@{profile.username}</p>
            <button onClick={() => setShowQR(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl">Close</button>
          </div>
        </div>
      )}

      {showPanicConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-red-900/50">
            <h3 className="text-red-500 font-bold text-xl mb-2">Delete Account?</h3>
            <div className="flex gap-3 mt-4"><button onClick={() => setShowPanicConfirm(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-white">Cancel</button><button onClick={handlePanicButton} className="flex-1 py-3 bg-red-600 rounded-xl text-white">Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}