import React from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Server, 
  RefreshCw, 
  Cloud,
  CheckCircle
} from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedTag: string;
  onTagChange: (val: string) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onSyncClick: () => void;
  onNewNote: () => void;
  onOpenAi: () => void;
  onOpenVault: () => void;
  onOpenServerModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
  syncStatus,
  onSyncClick,
  onNewNote,
  onOpenAi,
  onOpenVault,
  onOpenServerModal,
}) => {
  const isLoggedIn = pb.authStore.isValid;

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center justify-between w-full md:w-auto space-x-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-lg">
              C
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold text-slate-100 tracking-tight">CloudNotes</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Vault
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Offline-First • AES-GCM • Lossless Media</p>
            </div>
          </div>

          {/* Mobile New Note Button */}
          <button
            onClick={onNewNote}
            className="md:hidden flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Note</span>
          </button>
        </div>

        {/* Center: Search and Tag Filter */}
        <div className="flex-1 max-w-md w-full flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes or content..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onTagChange('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedTag === 'all' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onTagChange('archived')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedTag === 'archived' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archive
            </button>
          </div>
        </div>

        {/* Right Actions: Server Status, AI, Vault, New Note */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
          {/* Sync Status Badge */}
          <button
            onClick={onSyncClick}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-400 transition-colors"
            title="Click to trigger sync"
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : syncStatus === 'synced' ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden lg:inline capitalize">{syncStatus}</span>
          </button>

          {/* Server / Auth Button */}
          <button
            onClick={onOpenServerModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isLoggedIn 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Server Connection & Account"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isLoggedIn ? 'Server Online' : 'Connect'}</span>
          </button>

          {/* AI Assistant */}
          <button
            onClick={onOpenAi}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
            title="AI Note Assistant (BYOK)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">AI</span>
          </button>

          {/* Stealth Vault Settings */}
          <button
            onClick={onOpenVault}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all"
            title="Stealth Vault PIN Setup"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* Desktop New Note Button */}
          <button
            onClick={onNewNote}
            className="hidden md:flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Note</span>
          </button>
        </div>
      </div>
    </header>
  );
};
