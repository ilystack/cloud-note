import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  FileText, 
  Lock,
  AlertTriangle,
  Clock,
  X
} from 'lucide-react';
import { LocalNote } from '@cloudnotes/shared-types';
import { getPaletteByColor } from '@cloudnotes/design-system';

interface TrashGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashNotes: LocalNote[];
  onRestore: (noteId: string) => void;
  onPermanentDelete: (noteId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashGalleryModal: React.FC<TrashGalleryModalProps> = ({
  isOpen,
  onClose,
  trashNotes,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-modal-in overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-2xl modal-surface flex flex-col max-h-[88vh] overflow-hidden text-left shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141518] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-slate-900 dark:text-neutral-100 text-sm sm:text-base tracking-tight">
                  Trash Bin
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20">
                  {trashNotes.length} {trashNotes.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Deleted notes can be restored or purged permanently.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {trashNotes.length > 0 && (
              <div>
                {showConfirmEmpty ? (
                  <div className="flex items-center space-x-1.5 bg-rose-950/40 p-1 rounded-lg border border-rose-500/30">
                    <span className="text-[11px] text-rose-300 px-1 font-mono flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Purge all notes?</span>
                    </span>
                    <button
                      onClick={() => {
                        onEmptyTrash();
                        setShowConfirmEmpty(false);
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Purge
                    </button>
                    <button
                      onClick={() => setShowConfirmEmpty(false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmEmpty(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Empty Trash</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#202126] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-[#121214]">
          {trashNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-center border border-dashed border-slate-300 dark:border-neutral-800 rounded-2xl p-8 bg-slate-50 dark:bg-[#141518]">
              <div className="p-3 rounded-xl bg-slate-200 dark:bg-[#18191d] border border-slate-300 dark:border-neutral-800 text-slate-500 mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">Trash is empty</h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm">
                Notes you delete will stay here until emptied permanently.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trashNotes.map((note) => {
              const palette = getPaletteByColor(note.cover_color);
              const isLocked = Boolean(note.is_locked);
              const deletedDate = note.deleted_at
                ? new Date(note.deleted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Recently';

              return (
                <div
                  key={note.id}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl border text-left transition-colors note-card-colored"
                  style={{
                    '--card-bg-light': palette.cardBgLight,
                    '--card-border-light': palette.cardBorderLight,
                    '--card-hover-light': palette.cardBgLight,
                    '--card-border-hover-light': palette.primary,
                    '--card-bg-dark': palette.cardBgDark,
                    '--card-border-dark': palette.cardBorderDark,
                    '--card-hover-dark': palette.cardHoverDark,
                    '--card-border-hover-dark': palette.primary,
                  } as React.CSSProperties}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ 
                          backgroundColor: palette.bgDark, 
                          color: palette.primary,
                          border: `1px solid ${palette.borderDark}`
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {isLocked && (
                          <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#202126] text-slate-500 dark:text-neutral-400 text-[10px] font-mono border border-slate-200 dark:border-neutral-800 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{deletedDate}</span>
                        </span>
                      </div>
                    </div>

                    <h4 className="font-semibold text-slate-800 dark:text-neutral-100 text-base line-clamp-2">
                      {note.title || 'Untitled Note'}
                    </h4>

                    <p className="mt-2.5 text-xs text-slate-600 dark:text-neutral-300/95 line-clamp-3 leading-relaxed">
                      {isLocked ? (
                        <span className="italic text-slate-400 dark:text-neutral-400 font-mono text-[11px]">
                          [Encrypted note in Trash]
                        </span>
                      ) : (
                        note.excerpt || 'No content'
                      )}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between">
                    <button
                      onClick={() => onRestore(note.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>

                    <button
                      onClick={() => onPermanentDelete(note.id)}
                      className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs transition-colors"
                      title="Permanently Purge from Storage"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Purge</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
