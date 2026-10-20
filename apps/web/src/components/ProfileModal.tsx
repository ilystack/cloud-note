import React from 'react';
import { 
  X, 
  Shield, 
  Server, 
  LogOut, 
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { Theme } from '../hooks/useTheme';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPinSetup: () => void;
  onOpenServerSettings: () => void;
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenPinSetup,
  onOpenServerSettings,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  if (!isOpen) return null;

  const isLoggedIn = pb.authStore.isValid;
  const user = pb.authStore.model;
  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || 'Local Offline Mode';
  const isDark = theme === 'dark';

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-in"
    >
      <div 
        className="relative w-full max-w-sm rounded-2xl modal-surface p-6 text-left select-none"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3.5 pb-5 border-b border-slate-200 dark:border-neutral-800">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-bold text-lg flex items-center justify-center flex-shrink-0">
            {isLoggedIn ? userName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h3 className="font-semibold text-slate-900 dark:text-neutral-100 text-base truncate">
                {isLoggedIn ? `Hello, ${userName}` : 'Guest User'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">{userEmail}</p>
          </div>
        </div>

        <div className="py-4 space-y-2">
          <div className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#141518] border border-slate-200 dark:border-neutral-800/80 transition-colors">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                isDark 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              }`}>
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 block">
                  Appearance
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                  {isDark ? 'Dark Theme' : 'Light Theme'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="relative inline-flex items-center p-0.5 rounded-full bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 cursor-pointer transition-colors"
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              aria-label="Toggle Dark or Light theme"
            >
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center space-x-1 transition-all duration-200 ${
                  !isDark 
                    ? 'bg-white text-slate-900 border border-slate-300/80 font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center space-x-1 transition-all duration-200 ${
                  isDark 
                    ? 'bg-neutral-700 text-amber-300 border border-neutral-600 font-semibold' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenPinSetup();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#141518] dark:hover:bg-[#1c1d22] border border-slate-200 dark:border-neutral-800/80 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 block group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  Change Vault PIN
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                  Configure or update your Stealth PIN Vault
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-slate-700 dark:group-hover:text-neutral-300 transition-colors" />
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenServerSettings();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#141518] dark:hover:bg-[#1c1d22] border border-slate-200 dark:border-neutral-800/80 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 block group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                  Server Settings
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                  PocketBase endpoint & sync credentials
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-slate-700 dark:group-hover:text-neutral-300 transition-colors" />
          </button>

          {isLoggedIn ? (
            <>
              <div className="my-2 border-t border-slate-200 dark:border-neutral-800" />
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-[#141518] dark:hover:bg-rose-950/20 border border-slate-200 dark:border-neutral-800/80 hover:border-rose-300 dark:hover:border-rose-900/40 transition-colors text-left group cursor-pointer"
              >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-300 block">
                    Sign Out
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                    Disconnect current user session
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
            </button>
          </>
          ) : (
            <button
              onClick={() => {
                onClose();
                onOpenServerSettings();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 block">
                    Sign In to Server
                  </span>
                  <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 block">
                    Connect account to sync notes across devices
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-500 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
