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

  // Auth form states
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
        setAuthMessage({ type: 'success', text: 'Logged in successfully!' });
        onAuthChange();
        setTimeout(onClose, 800);
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
        // Auto-login after registration
        await pb.collection('users').authWithPassword(email.trim(), password);
        setAuthMessage({ type: 'success', text: 'Account registered and logged in!' });
        onAuthChange();
        setTimeout(onClose, 800);
      } else if (authMode === 'forgot') {
        await pb.collection('users').requestPasswordReset(email.trim());
        setAuthMessage({ type: 'success', text: 'Password reset link sent to your email.' });
      }
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message || 'Authentication failed' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setAuthMessage({ type: 'success', text: 'Logged out.' });
    onAuthChange();
  };

  const isLoggedIn = pb.authStore.isValid;
  const currentUser = pb.authStore.model;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl glass-panel border border-slate-700/80 shadow-2xl p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-lg">Server & Master Auth</h3>
            <p className="text-xs text-slate-400">PocketBase Server Endpoint & User Account</p>
          </div>
        </div>

        {/* Server URL Input & Health Check */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <label className="text-xs text-slate-400 font-medium">PocketBase Endpoint URL:</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://127.0.0.1:8090"
              className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
            </button>
          </div>

          {healthStatus.checked && (
            <div className={`flex items-center space-x-2 text-xs p-2.5 rounded-xl border ${
              healthStatus.ok ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}>
              {healthStatus.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{healthStatus.message}</span>
            </div>
          )}
        </div>

        {/* Auth Section */}
        <div className="mt-6">
          {isLoggedIn ? (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-semibold block">● Connected Account</span>
                <span className="text-sm font-bold text-slate-200">{currentUser?.email}</span>
                <span className="text-xs text-slate-400 block">{currentUser?.name || 'Standard User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Auth Mode Tabs */}
              <div className="flex rounded-xl bg-slate-950 p-1 mb-4 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthMessage(null); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'login' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthMessage(null); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'register' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setAuthMessage(null); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'forgot' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reset
                </button>
              </div>

              {authMessage && (
                <div className={`p-3 rounded-xl mb-3 text-xs border ${
                  authMessage.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                }`}>
                  {authMessage.text}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Display Name:</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Email Address:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {authMode !== 'forgot' && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Password:</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {authMode === 'register' && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Confirm Password:</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin stroke-[3]" />}
                  <span>
                    {authMode === 'login' ? 'Sign In to Server' : authMode === 'register' ? 'Create PocketBase Account' : 'Send Reset Link'}
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
