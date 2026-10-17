import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  RotateCcw, 
  FileText, 
  Lock
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f19] overflow-y-auto">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 glass-header px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-100">Trash Bin Gallery</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
                {trashNotes.length} {trashNotes.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Soft-deleted notes are stored safely here until restored or permanently purged
            </p>
          </div>
        </div>

        {trashNotes.length > 0 && (
          <div>
            {showConfirmEmpty ? (
              <div className="flex items-center space-x-2 bg-rose-950/60 p-1.5 rounded-xl border border-rose-500/40">
                <span className="text-xs text-rose-300 px-2 font-medium">Delete all forever?</span>
                <button
                  onClick={() => {
                    onEmptyTrash();
                    setShowConfirmEmpty(false);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Yes, Empty
                </button>
                <button
                  onClick={() => setShowConfirmEmpty(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmEmpty(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-medium transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Bento Grid of Deleted Notes */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8">
        {trashNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center border-2 border-dashed border-slate-800 rounded-3xl p-10">
            <div className="p-4 rounded-2xl bg-slate-800/50 text-slate-500 mb-4">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300">Trash is completely empty</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Notes that you delete will be kept here temporarily with an identical Bento layout.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </button>
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
                  className="flex flex-col justify-between p-6 rounded-2xl border border-slate-800 bg-slate-900/40 relative min-h-[220px]"
                  style={{
                    borderTopColor: palette.primary,
                    borderTopWidth: '3px',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="p-2 rounded-xl"
                        style={{ 
                          backgroundColor: palette.bgDark, 
                          color: palette.primary,
                          border: `1px solid ${palette.borderDark}`
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="flex items-center space-x-1">
                        {isLocked && (
                          <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 text-xs border border-rose-500/20 font-mono">
                          Deleted: {deletedDate}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-200 text-base line-clamp-2">
                      {note.title || 'Untitled Note'}
                    </h4>

                    <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                      {isLocked ? '[Encrypted Note in Trash]' : (note.excerpt || 'No content')}
                    </p>
                  </div>

                  {/* Actions for trash item */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => onRestore(note.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      onClick={() => onPermanentDelete(note.id)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
  );
};
