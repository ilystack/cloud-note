import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Lock, 
  Unlock, 
  Image, 
  PenTool, 
  Loader2,
  FileText,
  Sparkles,
  BookOpen,
  Code,
  Heart,
  Briefcase
} from 'lucide-react';
import { LocalNote, Note, decryptNoteContent, isEncryptedContent } from '@cloudnotes/shared-types';
import { NOTE_PALETTES } from '@cloudnotes/design-system';
import { pb, uploadNoteAttachment } from '../lib/pocketbase';
import { getSessionUnlockedPin } from '../lib/storage';
import { StealthPinModal } from './StealthPinModal';
import { DrawingCanvasModal } from './DrawingCanvasModal';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: LocalNote | null;
  onSave: (noteData: Partial<Note> & { id?: string }, lockPin?: string) => Promise<void>;
  onDelete: (noteId: string) => void;
}

const ICONS = [
  { id: 'file-text', icon: FileText, label: 'Note' },
  { id: 'sparkles', icon: Sparkles, label: 'Idea' },
  { id: 'book-open', icon: BookOpen, label: 'Study' },
  { id: 'code', icon: Code, label: 'Code' },
  { id: 'heart', icon: Heart, label: 'Personal' },
  { id: 'briefcase', icon: Briefcase, label: 'Work' },
];

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  onClose,
  note,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverColor, setCoverColor] = useState(NOTE_PALETTES[0].primary);
  const [coverIcon, setCoverIcon] = useState('file-text');
  const [isLocked, setIsLocked] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'unlock_note'>('setup');
  const [activePin, setActivePin] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load note data on open
  useEffect(() => {
    if (!isOpen) return;

    if (note) {
      setTitle(note.title || '');
      setCoverColor(note.cover_color || NOTE_PALETTES[0].primary);
      setCoverIcon(note.cover_icon || 'file-text');
      setIsLocked(Boolean(note.is_locked));

      if (note.attachments_json) {
        try {
          setAttachments(JSON.parse(note.attachments_json));
        } catch {
          setAttachments([]);
        }
      }

      // Check if note is encrypted
      if (isEncryptedContent(note.content)) {
        const sessionPin = getSessionUnlockedPin();
        if (sessionPin) {
          decryptNoteContent(note.content, sessionPin)
            .then(dec => {
              setContent(dec);
              setActivePin(sessionPin);
            })
            .catch(() => {
              setContent(note.content);
              setPinModalMode('unlock_note');
              setIsPinModalOpen(true);
            });
        } else {
          setContent(note.content);
          setPinModalMode('unlock_note');
          setIsPinModalOpen(true);
        }
      } else {
        setContent(note.content || '');
      }
    } else {
      // New note
      setTitle('');
      setContent('');
      setCoverColor(NOTE_PALETTES[0].primary);
      setCoverIcon('file-text');
      setIsLocked(false);
      setAttachments([]);
      setActivePin(null);
    }
  }, [isOpen, note]);

  // Handle PIN unlock success
  const handlePinSuccess = async (pin: string) => {
    setActivePin(pin);
    if (note && isEncryptedContent(note.content)) {
      try {
        const decrypted = await decryptNoteContent(note.content, pin);
        setContent(decrypted);
      } catch (err: any) {
        alert('Failed to decrypt: ' + err.message);
      }
    }
  };

  // Toggle Lock
  const handleToggleLock = () => {
    if (!isLocked) {
      // User wants to lock note -> prompt for PIN if not already known
      const sessionPin = activePin || getSessionUnlockedPin();
      if (!sessionPin) {
        setPinModalMode('setup');
        setIsPinModalOpen(true);
      } else {
        setIsLocked(true);
      }
    } else {
      // Unlock note
      setIsLocked(false);
    }
  };

  // Handle Lossless File & Image Upload directly to Server Storage (database/files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      // If note doesn't exist yet on server, save it first
      let recordId = note?.id;
      if (!recordId || recordId.startsWith('local_')) {
        if (!pb.authStore.isValid) {
          throw new Error('Please connect and login to PocketBase to store server files in database/files.');
        }
        const created = await pb.collection('notes').create({
          title: title || 'Untitled Note',
          content,
          cover_color: coverColor,
          cover_icon: coverIcon,
          is_locked: isLocked,
          user_id: pb.authStore.model?.id,
          client_updated_at: new Date().toISOString(),
          version: 1,
        });
        recordId = created.id;
      }

      const fileUrl = await uploadNoteAttachment(recordId, file);
      setAttachments(prev => [...prev, file.name]);

      // Insert lossless media embed tag into note content
      let embedTag = '';
      if (file.type.startsWith('image/')) {
        embedTag = `\n<figure class="my-4"><img src="${fileUrl}" alt="${file.name}" class="rounded-xl border border-slate-700 max-h-96 w-auto object-contain" /><figcaption class="text-xs text-slate-400 mt-1">${file.name}</figcaption></figure>\n`;
      } else {
        embedTag = `\n<div class="my-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center space-x-2"><a href="${fileUrl}" target="_blank" download class="text-amber-400 hover:underline flex items-center space-x-1.5 font-medium text-sm"><span>📎 ${file.name}</span></a></div>\n`;
      }

      setContent(prev => prev + embedTag);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save Note
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const pinToUse = isLocked ? (activePin || getSessionUnlockedPin() || undefined) : undefined;
      await onSave(
        {
          id: note?.id,
          title: title.trim() || 'Untitled Note',
          content,
          cover_color: coverColor,
          cover_icon: coverIcon,
          is_locked: isLocked,
          attachments,
        },
        pinToUse
      );
      onClose();
    } catch (err: any) {
      alert('Error saving note: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-4xl rounded-3xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 glass-header">
            <div className="flex items-center space-x-3">
              {/* Cover Color Indicator */}
              <div 
                className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: coverColor }}
              />
              <span className="text-sm font-semibold text-slate-300">
                {note ? 'Edit Note' : 'New Note'}
              </span>
              {isLocked && (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-xs border border-amber-500/30">
                  <Lock className="w-3 h-3" />
                  <span>Encrypted</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleLock}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isLocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="End-to-End Stealth Encryption"
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Locked' : 'Lock'}</span>
              </button>

              {note && (
                <button
                  onClick={() => {
                    onDelete(note.id);
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Move to Trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Note Metadata Bar (Color & Icon Selectors) */}
          <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
            {/* Color Palette Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Palette:</span>
              <div className="flex items-center space-x-1.5">
                {NOTE_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setCoverColor(pal.primary)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      coverColor.toLowerCase() === pal.primary.toLowerCase()
                        ? 'border-white scale-110 shadow-md'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: pal.primary }}
                    title={pal.name}
                  />
                ))}
              </div>
            </div>

            {/* Icon Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Icon:</span>
              <div className="flex items-center space-x-1">
                {ICONS.map((ic) => {
                  const Icon = ic.icon;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setCoverIcon(ic.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        coverIcon === ic.id
                          ? 'bg-slate-700 text-amber-400 border border-slate-600'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={ic.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Editor Body */}
          <div className="p-6 flex-1 flex flex-col overflow-y-auto space-y-4">
            {/* Note Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full text-2xl font-extrabold bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none"
            />

            {/* Formatting & Media Toolbar */}
            <div className="flex flex-wrap items-center gap-2 py-2 border-y border-slate-800/60 text-slate-300">
              {/* Native Lossless Media Upload */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 text-xs font-medium transition-all"
                title="Upload lossless original media to server storage (database/files)"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Image className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Lossless Media</span>
              </button>

              {/* Freehand Doodle & Sketch */}
              <button
                type="button"
                onClick={() => setIsCanvasOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 text-xs font-medium transition-all"
                title="Draw handwriting or sketches directly into note"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>Draw Sketch</span>
              </button>
            </div>

            {/* Note Content Textarea */}
            <textarea
              ref={contentAreaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here... (supports markdown, HTML, lossless server images, and doodles)"
              className="w-full flex-1 min-h-[300px] bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-slate-800/80 glass-header flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {attachments.length > 0 ? `${attachments.length} server files stored` : 'Lossless Media & Stealth Vault'}
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin stroke-[3]" />
                ) : (
                  <Save className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <StealthPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        mode={pinModalMode}
        onSuccess={handlePinSuccess}
      />

      <DrawingCanvasModal
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        onSave={(embedHtml) => setContent(prev => prev + embedHtml)}
      />
    </>
  );
};
