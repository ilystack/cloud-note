import React, { useState } from 'react';
import { 
  Server, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Loader2 
} from 'lucide-react';
import { 
  pb, 
  getActiveServerUrl, 
  setActiveServerUrl, 
  checkServerHealth 
} from '../lib/pocketbase';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChange: () => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  onAuthChange,
}) => {
  const [serverUrl, setServerUrl] = useState(getActiveServerUrl());
  const [healthStatus, setHealthStatus] = useState<{ checked: boolean; ok: boolean; message: string }>({
    checked: false,
    ok: false,
    message: '',
  });
  const [isTesting, setIsTesting] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setHealthStatus({ checked: false, ok: false, message: '' });
    const res = await checkServerHealth(serverUrl);
    setHealthStatus({ checked: true, ok: res.ok, message: res.message });
    setIsTesting(false);
    if (res.ok) {
      setActiveServerUrl(serverUrl);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      if (authMode === 'login') {
        await pb.collection('users').authWithPassword(email.trim(), password);
        setAuthMessage({ type: 'success', text: 'Connected and logged in successfully.' });
        onAuthChange();
        setTimeout(onClose, 600);
      } else if (authMode === 'register') {
        if (password !== passwordConfirm) {
          throw new Error('Passwords do not match');
        }
        await pb.collection('users').create({
          email: email.trim(),
          password,
          passwordConfirm,
          name: name.trim() || undefined,
        });
        await pb.collection('users').authWithPassword(email.trim(), password);
        setAuthMessage({ type: 'success', text: 'Account created and synced.' });
        onAuthChange();
        setTimeout(onClose, 600);
      } else if (authMode === 'forgot') {
        await pb.collection('users').requestPasswordReset(email.trim());
        setAuthMessage({ type: 'success', text: 'Password reset link sent to your email.' });
      }
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message || 'Authentication error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setAuthMessage({ type: 'success', text: 'Session closed.' });
    onAuthChange();
  };

  const isLoggedIn = pb.authStore.isValid;
  const currentUser = pb.authStore.model;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-in">
      <div className="relative w-full max-w-md rounded-2xl modal-surface p-6 sm:p-7 text-left select-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202126] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100 tracking-tight">Server & Sync Settings</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">PocketBase Server Endpoint & User Vault Account</p>
          </div>
        </div>

        <div className="space-y-2 pb-5 border-b border-slate-200 dark:border-neutral-800">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 block">PocketBase Endpoint URL</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://127.0.0.1:8090"
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs font-mono text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#202126] dark:hover:bg-[#28292e] text-slate-700 dark:text-neutral-200 text-xs font-medium transition-colors border border-slate-300 dark:border-neutral-700 disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
            </button>
          </div>

          {healthStatus.checked && (
            <div className={`flex items-center space-x-2 text-xs p-2 rounded-lg border ${
              healthStatus.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20'
            }`}>
              {healthStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="font-mono text-[11px]">{healthStatus.message}</span>
            </div>
          )}
        </div>

        <div className="mt-5">
          {isLoggedIn ? (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#141518] border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block">● SERVER AUTH ACTIVE</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">{currentUser?.email}</span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">{currentUser?.name || 'Authorized User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Animated Segmented Control Tabs */}
              <div className="relative flex rounded-xl bg-slate-100 dark:bg-[#141518] p-1 mb-4 border border-slate-200 dark:border-neutral-800 select-none">
                {/* Smooth Animated Slider Background */}
                <div
                  className="absolute top-1 bottom-1 left-1 rounded-lg bg-white dark:bg-[#202126] shadow-sm border border-slate-200/90 dark:border-neutral-700/80 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                  style={{
                    width: 'calc((100% - 8px) / 3)',
                    transform: `translateX(${authMode === 'login' ? 0 : authMode === 'register' ? 100 : 200}%)`,
                  }}
                />

                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthMessage(null); }}
                  className={`relative z-10 flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center select-none ${
                    authMode === 'login'
                      ? 'text-slate-900 dark:text-neutral-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthMessage(null); }}
                  className={`relative z-10 flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center select-none ${
                    authMode === 'register'
                      ? 'text-slate-900 dark:text-neutral-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setAuthMessage(null); }}
                  className={`relative z-10 flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center select-none ${
                    authMode === 'forgot'
                      ? 'text-slate-900 dark:text-neutral-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Reset
                </button>
              </div>

              {authMessage && (
                <div className={`p-2.5 rounded-lg mb-3 text-xs border ${
                  authMessage.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                }`}>
                  {authMessage.text}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div className="animate-field-in">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                {authMode !== 'forgot' && (
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                )}

                {authMode === 'register' && (
                  <div className="animate-field-in">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-semibold text-xs transition-all duration-200 flex items-center justify-center space-x-1.5 mt-4 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {authLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Register Account' : 'Send Reset Link'}
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
