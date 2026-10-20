import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Unlock,
  Paperclip, 
  Trash2, 
  Archive, 
  Clock,
  Sparkles, 
  BookOpen, 
  Code, 
  Heart, 
  Briefcase,
  ArrowUpRight
} from 'lucide-react';
import { LocalNote, isEncryptedContent, decryptNoteContent } from '@cloudnotes/shared-types';
import { getPaletteByColor } from '@cloudnotes/design-system';
import { getSessionUnlockedPin } from '../lib/storage';

interface NoteCardProps {
  note: LocalNote;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onArchiveToggle?: (e: React.MouseEvent) => void;
  featured?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'file-text': FileText,
  'sparkles': Sparkles,
  'book-open': BookOpen,
  'code': Code,
  'heart': Heart,
  'briefcase': Briefcase,
};

// Helper to strip markdown formatting for cleaner excerpt presentation
function cleanMarkdownExcerpt(text: string): string {
  if (!text) return '';
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '[Image]') // replace images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // replace links
    .replace(/#{1,6}\s+/g, '') // remove headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // remove italic
    .replace(/`{1,3}.*?`{1,3}/gs, '[Code]') // replace code blocks
    .replace(/>\s+/g, '') // remove blockquotes
    .replace(/[-*+]\s+/g, '• ') // bullet list
    .replace(/\n+/g, ' ')
    .trim();
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  onClick, 
  onDelete, 
  onArchiveToggle,
  featured = false 
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

  const updatedDate = new Date(note.client_updated_at || note.updated_at);
  const now = new Date();
  const isSameYear = now.getFullYear() === updatedDate.getFullYear();

  const timeStr = updatedDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateStr = updatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });

  const formattedDate = `${dateStr}, ${timeStr}`;

  const [decryptedText, setDecryptedText] = useState<string | null>(null);

  useEffect(() => {
    if (isLocked && isEncryptedContent(note.content)) {
      const sessionPin = getSessionUnlockedPin();
      if (sessionPin) {
        decryptNoteContent(note.content, sessionPin)
          .then((dec) => {
            setDecryptedText(cleanMarkdownExcerpt(dec));
          })
          .catch(() => {
            setDecryptedText(null);
          });
      } else {
        setDecryptedText(null);
      }
    } else {
      setDecryptedText(null);
    }
  }, [note.content, isLocked]);

  const rawExcerpt = note.excerpt || note.content || '';
  const cleanExcerpt = cleanMarkdownExcerpt(rawExcerpt);
  const displayExcerpt = decryptedText || (rawExcerpt !== '[Encrypted Note]' ? cleanExcerpt : '') || 'No content provided.';

  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="group relative flex flex-col justify-between p-5 rounded-2xl cursor-pointer note-card-colored text-left select-none min-h-[200px]"
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
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2.5">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: palette.bgDark, 
                color: palette.primary,
              }}
            >
              <IconComponent className="w-4 h-4 stroke-[2]" />
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {isLocked && (
              <span 
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-mono"
                title="Unlocked Vault Note"
              >
                <Unlock className="w-3 h-3 stroke-[2.2]" />
                <span className="hidden sm:inline">Unlocked</span>
              </span>
            )}
            {attachmentCount > 0 && (
              <span 
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#25262c] text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700/80 text-[10px] font-mono"
                title={`${attachmentCount} Server Attachments`}
              >
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span>{attachmentCount}</span>
              </span>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-neutral-500 group-hover:text-slate-700 dark:group-hover:text-neutral-300 pl-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <h3 className={`font-semibold text-slate-900 dark:text-neutral-100 tracking-tight transition-colors line-clamp-2 ${
          featured ? 'text-lg sm:text-xl' : 'text-base'
        }`}>
          {note.title || 'Untitled Note'}
        </h3>

        <p className={`mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-neutral-300/95 leading-relaxed font-normal ${
          featured ? 'line-clamp-4' : 'line-clamp-3'
        }`}>
          {displayExcerpt}
        </p>
      </div>

      <div className="mt-4 pt-2.5 flex items-center justify-between text-[11px] text-slate-500/80 dark:text-neutral-400">
        <div className="flex items-center space-x-1.5 font-mono">
          <Clock className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
          <span>{formattedDate}</span>
        </div>

        <div 
          className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {onArchiveToggle && (
            <button
              onClick={onArchiveToggle}
              title={note.is_archived ? "Unarchive note" : "Archive note"}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#25262c] text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              aria-label="Archive"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Move to Trash (Soft delete)"
            className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
