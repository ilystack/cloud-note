import React from 'react';
import { 
  FileText, 
  Lock, 
  Paperclip, 
  Trash2, 
  Archive, 
  Calendar,
  Sparkles,
  BookOpen,
  Code,
  Heart,
  Briefcase
} from 'lucide-react';
import { LocalNote } from '@cloudnotes/shared-types';
import { getPaletteByColor } from '@cloudnotes/design-system';

interface NoteCardProps {
  note: LocalNote;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onArchiveToggle?: (e: React.MouseEvent) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'file-text': FileText,
  'sparkles': Sparkles,
  'book-open': BookOpen,
  'code': Code,
  'heart': Heart,
  'briefcase': Briefcase,
};

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  onClick, 
  onDelete,
  onArchiveToggle 
}) => {
  const palette = getPaletteByColor(note.cover_color);
  const IconComponent = ICON_MAP[note.cover_icon] || FileText;
  const isLocked = Boolean(note.is_locked);

  let attachmentCount = 0;
  if (note.attachments_json) {
    try {
      const arr = JSON.parse(note.attachments_json);
      if (Array.isArray(arr)) attachmentCount = arr.length;
    } catch {
      attachmentCount = 0;
    }
  }

  // Format date
  const updatedDate = new Date(note.client_updated_at);
  const formattedDate = updatedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="group relative flex flex-col justify-between p-6 rounded-2xl cursor-pointer transition-all duration-300
        border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900/90
        hover:border-slate-700 hover:shadow-xl hover:-translate-y-1 min-h-[220px]"
      style={{
        borderTopColor: palette.primary,
        borderTopWidth: '3px',
      }}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div 
            className="p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-105"
            style={{ 
              backgroundColor: palette.bgDark, 
              color: palette.primary,
              border: `1px solid ${palette.borderDark}`
            }}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {isLocked && (
              <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20" title="End-to-End Encrypted Note">
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700" title={`${attachmentCount} Server Attachments`}>
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span>{attachmentCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Note Title */}
        <h3 className="font-bold text-slate-100 text-lg group-hover:text-amber-300 transition-colors line-clamp-2">
          {note.title || 'Untitled Note'}
        </h3>

        {/* Note Excerpt */}
        <p className="mt-2 text-sm text-slate-400 line-clamp-3 leading-relaxed">
          {isLocked ? (
            <span className="italic text-slate-500 font-mono text-xs flex items-center space-x-1">
              <span>●●● Encrypted with Stealth Vault PIN</span>
            </span>
          ) : (
            note.excerpt || 'No content provided.'
          )}
        </p>
      </div>

      {/* Footer Bar with Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-1 text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onArchiveToggle && (
            <button
              onClick={onArchiveToggle}
              title={note.is_archived ? "Unarchive" : "Archive"}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Move to Trash"
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
