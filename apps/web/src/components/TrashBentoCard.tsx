import React from 'react';
import { Trash2, ArrowUpRight } from 'lucide-react';

interface TrashBentoCardProps {
  count: number;
  onClick: () => void;
  isOnlyCard?: boolean;
}

export const TrashBentoCard: React.FC<TrashBentoCardProps> = ({ count, onClick, isOnlyCard }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={`group relative flex flex-col justify-between p-6 rounded-2xl cursor-pointer transition-all duration-300
        border border-rose-900/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-rose-950/20
        hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-950/20 hover:-translate-y-1
        ${isOnlyCard ? 'col-span-full py-10 items-center text-center' : 'min-h-[200px]'}`}
    >
      {/* Glow highlight on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Top Header */}
      <div className={`flex items-center justify-between w-full ${isOnlyCard ? 'max-w-md justify-between' : ''}`}>
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 group-hover:bg-rose-500/20 transition-all duration-300">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 text-base group-hover:text-rose-200 transition-colors">
              Trash Bin
            </h3>
            <span className="text-xs text-slate-500">Soft-deleted items</span>
          </div>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 group-hover:text-rose-300 group-hover:bg-rose-500/20 transition-all">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      {/* Center / Bottom Content */}
      <div className={`mt-6 ${isOnlyCard ? 'max-w-md' : ''}`}>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-100 group-hover:text-rose-300 transition-colors">
            {count}
          </span>
          <span className="text-sm text-slate-400">
            {count === 1 ? 'item' : 'items'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
          {count > 0 ? 'Click to inspect, restore or permanently purge' : 'Trash is currently empty'}
        </p>
      </div>

      {/* Badge Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 w-full">
        <span>Bento Vault System</span>
        <span className="text-rose-400/80 font-medium group-hover:underline">View Gallery &rarr;</span>
      </div>
    </div>
  );
};
