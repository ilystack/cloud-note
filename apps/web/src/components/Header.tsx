import React from 'react';
import { 
  Search, 
  RefreshCw, 
  CloudOff, 
  CloudCheck,
  X,
  Pen
} from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onSyncClick: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  syncStatus,
  onSyncClick,
  onOpenProfile,
}) => {
  const user = pb.authStore.model;
  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'user');

  return (
    <header className="sticky top-0 z-40 header-surface w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center select-none flex-shrink-0">
          <div className="flex items-baseline space-x-0.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Cloud
            </span>
            <span className="relative text-xl sm:text-2xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight inline-block pr-3.5">
              Notes
              <span className="absolute -bottom-1 left-0 right-3.5 h-3 pointer-events-none overflow-visible">
                <svg 
                  className="w-full h-full overflow-visible" 
                  viewBox="0 0 100 12" 
                  fill="none" 
                  preserveAspectRatio="none"
                >
                  <path 
                    d="M2 7C28 3 68 2 98 8" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    pathLength="100"
                    className="text-amber-500 dark:text-amber-400 animate-draw-line"
                  />
                  <path 
                    d="M10 9.5C36 7 72 6.5 90 10.5" 
                    stroke="currentColor" 
                    strokeWidth="1.2" 
                    strokeLinecap="round" 
                    opacity="0.6" 
                    pathLength="100"
                    className="text-amber-500 dark:text-amber-400 animate-draw-line"
                  />
                </svg>

                <span className="animate-slide-pen text-amber-500 dark:text-amber-400">
                  <Pen className="w-3.5 h-3.5" />
                </span>
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-2 sm:mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-100/90 dark:bg-[#141518] border border-slate-300/80 dark:border-neutral-800 text-xs sm:text-sm text-slate-900 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <button
            onClick={onSyncClick}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#141518] dark:hover:bg-[#1f2025] border border-slate-300/80 dark:border-neutral-800 text-xs transition-colors cursor-pointer"
            title={
              pb.authStore.isValid 
                ? `Sync status: ${syncStatus}. Click to trigger sync.` 
                : 'Offline storage active. Sign in to sync with server.'
            }
            aria-label="Sync Status"
          >
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400">Syncing...</span>
              </>
            ) : syncStatus === 'synced' ? (
              <>
                <CloudCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">Synced</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-neutral-400">Offline</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenProfile}
            className="group flex items-center space-x-2.5 p-1 sm:pl-3 sm:pr-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#141518] dark:hover:bg-[#1f2025] border border-slate-300/80 dark:border-neutral-800 hover:border-slate-400/80 dark:hover:border-neutral-700 transition-colors cursor-pointer"
            title="Account & Vault Settings"
          >
            <span className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-neutral-300 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors font-sans">
              {pb.authStore.isValid ? (
                <>Hello, <strong className="font-semibold text-slate-900 dark:text-neutral-100">{userName}</strong></>
              ) : (
                <strong className="font-semibold text-slate-900 dark:text-neutral-100">Sign In</strong>
              )}
            </span>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
              {pb.authStore.isValid ? userName.charAt(0).toUpperCase() : '?'}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
