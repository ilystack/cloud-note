import React from 'react';
import { Trash2, ArrowUpRight } from 'lucide-react';

interface TrashDockProps {
  count: number;
  onClick: () => void;
  isOnlyCard?: boolean;
}

export const TrashDock: React.FC<TrashDockProps> = ({ count, onClick }) => {
  return (
    <div className="mt-14 mb-8 flex items-center justify-center select-none">
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center space-x-2.5 px-4 py-2 rounded-full border bg-slate-100 hover:bg-slate-200/90 dark:bg-[#151619] dark:hover:bg-[#1c1d22] border-slate-300/80 dark:border-neutral-800 hover:border-rose-400/50 dark:hover:border-rose-500/40 text-xs transition-all duration-200 cursor-pointer"
        title="Open Trash Gallery to restore or purge permanently"
      >
        <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
        
        <span className="font-medium text-slate-700 dark:text-neutral-300 group-hover:text-slate-900 dark:group-hover:text-neutral-100 transition-colors">
          Trash Bin
        </span>

        {count > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {count}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
            Empty
          </span>
        )}

        <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-neutral-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
      </button>
    </div>
  );
};

export const TrashBentoCard = TrashDock;
