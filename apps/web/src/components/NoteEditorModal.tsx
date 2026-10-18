import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Save, 
  Trash2, 
  Lock, 
  Unlock, 
  Image, 
  PenTool, 
  Loader2,
  Code,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Paperclip,
  Palette,
  RefreshCw,
  CloudOff,
  CloudCheck,
  Undo,
  Redo,
  RotateCcw,
  X
} from 'lucide-react';
import { LocalNote, Note, decryptNoteContent, isEncryptedContent, Stroke, Point } from '@cloudnotes/shared-types';
import { NOTE_PALETTES } from '@cloudnotes/design-system';
import { pb, uploadNoteAttachment } from '../lib/pocketbase';
import { getSessionUnlockedPin } from '../lib/storage';
import { StealthPinModal } from './StealthPinModal';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: LocalNote | null;
  onSave: (noteData: Partial<Note> & { id?: string }, lockPin?: string) => Promise<void>;
  onDelete: (noteId: string) => void;
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

const INK_DATA_REGEX = /<!--CLOUDNASTES_INK_DATA:(.*?)-->/;

function markdownToHtml(md: string): string {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

function parseNoteContent(rawContent: string): { cleanHtml: string; strokes: Stroke[] } {
  if (!rawContent) return { cleanHtml: '', strokes: [] };

  let cleanHtml = rawContent;
  let strokes: Stroke[] = [];

  const inkMatch = cleanHtml.match(INK_DATA_REGEX);
  if (inkMatch) {
    try {
      strokes = JSON.parse(inkMatch[1]);
    } catch {
      strokes = [];
    }
    cleanHtml = cleanHtml.replace(INK_DATA_REGEX, '');
  }

  cleanHtml = cleanHtml.replace(/<div class="cloudnotes-drawing[^>]*>[\s\S]*?<\/div>/gi, '');

  if (!/<[a-z][\s\S]*>/i.test(cleanHtml)) {
    cleanHtml = markdownToHtml(cleanHtml);
  }

  return { cleanHtml, strokes };
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  onClose,
  note,
  onSave,
  onDelete,
  syncStatus = 'synced',
}) => {
  const [title, setTitle] = useState('');
  const [coverColor, setCoverColor] = useState(NOTE_PALETTES[0].primary);
  const [coverIcon, setCoverIcon] = useState('file-text');
  const [isLocked, setIsLocked] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);

  // In-Place Ink Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState<string>('#F59E0B');
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoHistory, setRedoHistory] = useState<Stroke[]>([]);

  // Active Rich-Text Formatting States
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
    code: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStroke = useRef<Point[]>([]);
  const isPainting = useRef<boolean>(false);

  const [wordCount, setWordCount] = useState<number>(0);

  const calculateWordCount = useCallback(() => {
    if (!editorRef.current) {
      setWordCount(0);
      return;
    }
    const text = (editorRef.current.innerText || editorRef.current.textContent || '').trim();
    setWordCount(text ? text.split(/\s+/).length : 0);
  }, []);

  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;
    
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !editorRef.current.contains(sel.anchorNode)) {
      return;
    }

    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isUl = document.queryCommandState('insertUnorderedList');
      const isOl = document.queryCommandState('insertOrderedList');
      
      let isCode = false;
      let curr: Node | null = sel.anchorNode;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeName === 'PRE' || curr.nodeName === 'CODE') isCode = true;
        curr = curr.parentNode;
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        ul: isUl,
        ol: isOl,
        code: isCode,
      });
    } catch {
      // Ignore queryCommandState errors if selection is out of range
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateActiveFormats]);

  const redrawCanvas = useCallback((targetStrokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of targetStrokes) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      ctx.beginPath();
      if (stroke.points.length === 1) {
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }, []);

  const syncCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(rect.width, 300);
    const h = Math.max(rect.height, 340);

    const neededW = Math.floor(w * dpr);
    const neededH = Math.floor(h * dpr);

    if (canvas.width !== neededW || canvas.height !== neededH) {
      canvas.width = neededW;
      canvas.height = neededH;
      redrawCanvas(strokes);
    }
  }, [strokes, redrawCanvas]);

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
              setActivePin(sessionPin);
              const { cleanHtml, strokes: parsedStrokes } = parseNoteContent(dec);
              if (editorRef.current) {
                editorRef.current.innerHTML = cleanHtml;
              }
              setStrokes(parsedStrokes);
              calculateWordCount();
              setTimeout(updateActiveFormats, 50);
            })
            .catch(() => {
              setIsPinModalOpen(true);
            });
        } else {
          setIsPinModalOpen(true);
        }
      } else {
        const { cleanHtml, strokes: parsedStrokes } = parseNoteContent(note.content || '');
        if (editorRef.current) {
          editorRef.current.innerHTML = cleanHtml;
        }
        setStrokes(parsedStrokes);
        calculateWordCount();
        setTimeout(updateActiveFormats, 50);
      }
    } else {
      setTitle('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setCoverColor(NOTE_PALETTES[0].primary);
      setCoverIcon('file-text');
      setIsLocked(false);
      setAttachments([]);
      setActivePin(null);
      setStrokes([]);
      calculateWordCount();
    }
    setIsDrawingMode(false);
    setRedoHistory([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, note?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      syncCanvasDimensions();
    }, 50);

    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return () => clearTimeout(timer);

    const observer = new ResizeObserver(() => {
      syncCanvasDimensions();
    });
    observer.observe(canvas.parentElement);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isOpen, syncCanvasDimensions]);

  const handlePinSuccess = async (pin: string) => {
    setActivePin(pin);
    if (note && isEncryptedContent(note.content)) {
      try {
        const decrypted = await decryptNoteContent(note.content, pin);
        const { cleanHtml, strokes: parsedStrokes } = parseNoteContent(decrypted);
        if (editorRef.current) {
          editorRef.current.innerHTML = cleanHtml;
        }
        setStrokes(parsedStrokes);
        calculateWordCount();
        setTimeout(updateActiveFormats, 50);
      } catch (err: any) {
        alert('Failed to decrypt: ' + err.message);
      }
    }
  };

  const handleToggleLock = () => {
    setIsLocked(prev => !prev);
  };

  const applyFormat = (command: string, value?: string) => {
    if (isDrawingMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    calculateWordCount();
    setTimeout(updateActiveFormats, 10);
  };

  // Lossless File & Image Upload directly to Server Storage (database/files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      let recordId = note?.id;
      if (!recordId || recordId.startsWith('local_')) {
        if (!pb.authStore.isValid) {
          throw new Error('Please connect and login to PocketBase to store server files in database/files.');
        }
        const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
        const created = await pb.collection('notes').create({
          title: title || 'Untitled Note',
          content: currentHtml,
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

      let embedTag = '';
      if (file.type.startsWith('image/')) {
        embedTag = `<figure class="my-4"><img src="${fileUrl}" alt="${file.name}" class="rounded-lg border border-slate-700 max-h-96 w-auto object-contain" /><figcaption class="text-xs text-slate-400 mt-1">${file.name}</figcaption></figure><p><br/></p>`;
      } else {
        embedTag = `<div class="my-2 p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2"><a href="${fileUrl}" target="_blank" download class="text-amber-400 hover:underline flex items-center space-x-1.5 font-medium text-xs font-mono"><span>📎 ${file.name}</span></a></div><p><br/></p>`;
      }

      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertHTML', false, embedTag);
        calculateWordCount();
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const pt = getCanvasCoordinates(e);
    if (!pt) return;
    isPainting.current = true;
    currentStroke.current = [pt];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, brushWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
    ctx.restore();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isPainting.current) return;
    const pt = getCanvasCoordinates(e);
    if (!pt) return;

    const prev = currentStroke.current[currentStroke.current.length - 1];
    currentStroke.current.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  };

  const stopDrawing = () => {
    if (!isPainting.current) return;
    isPainting.current = false;
    if (currentStroke.current.length > 0) {
      const newStroke: Stroke = {
        color: brushColor,
        width: brushWidth,
        points: [...currentStroke.current],
      };
      setStrokes((prev) => [...prev, newStroke]);
      setRedoHistory([]);
    }
    currentStroke.current = [];
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const pt = getCanvasCoordinates(e);
    if (!pt) return;
    isPainting.current = true;
    currentStroke.current = [pt];
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isPainting.current) return;
    e.preventDefault();
    const pt = getCanvasCoordinates(e);
    if (!pt) return;
    const prev = currentStroke.current[currentStroke.current.length - 1];
    currentStroke.current.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    stopDrawing();
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const nextStrokes = strokes.slice(0, -1);
    setRedoHistory((rh) => [...rh, last]);
    setStrokes(nextStrokes);
    redrawCanvas(nextStrokes);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const lastRedo = redoHistory[redoHistory.length - 1];
    const nextRedoHistory = redoHistory.slice(0, -1);
    const nextStrokes = [...strokes, lastRedo];
    setRedoHistory(nextRedoHistory);
    setStrokes(nextStrokes);
    redrawCanvas(nextStrokes);
  };

  const handleClearCanvas = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    setRedoHistory([]);
    redrawCanvas([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const pinToUse = isLocked ? (activePin || getSessionUnlockedPin() || undefined) : undefined;
      const htmlText = editorRef.current ? editorRef.current.innerHTML : '';
      const fullContent = strokes.length > 0 
        ? `${htmlText}<!--CLOUDNASTES_INK_DATA:${JSON.stringify(strokes)}-->`
        : htmlText;

      await onSave(
        {
          id: note?.id,
          title: title.trim() || 'Untitled Note',
          content: fullContent,
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

  // Helper for formatting button classes with active indicator and hover styling
  const getFormatBtnClass = (isActive: boolean) => `
    p-1.5 rounded-lg border transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95
    ${isActive
      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 shadow-sm font-semibold'
      : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-200/90 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-[#26272e]'
    }
  `;

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      >
        <div className="relative w-full max-w-4xl rounded-2xl modal-surface flex flex-col max-h-[92vh] overflow-hidden animate-modal-in">
          {/* Top Bar: Cover Color & Lock */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141518] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="text-slate-700 dark:text-neutral-200 font-mono text-[11px] font-semibold flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                <span>Cover:</span>
              </span>
              <div className="flex items-center space-x-2">
                {NOTE_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setCoverColor(pal.primary)}
                    className={`w-4 h-4 rounded-full transition-all cursor-pointer ${
                      coverColor.toLowerCase() === pal.primary.toLowerCase()
                        ? 'ring-2 ring-slate-800 dark:ring-white ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#141518] scale-110 shadow-sm'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: pal.primary }}
                    title={pal.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleLock}
                className={`p-2 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
                  isLocked
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                    : 'bg-white dark:bg-[#1c1d22] text-slate-500 dark:text-neutral-400 border-slate-300 dark:border-neutral-700 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#26272e]'
                }`}
                title={isLocked ? 'Locked Note (Protected with Stealth Vault)' : 'Click to Lock Note with Vault PIN'}
                aria-label="Toggle Lock"
              >
                {isLocked ? <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Unlock className="w-4 h-4" />}
              </button>

              {note && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(note.id);
                    onClose();
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Move to Trash"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Action Toolbar */}
          <div className="px-6 py-2 border-b border-slate-200 dark:border-neutral-800/70 bg-slate-100/70 dark:bg-[#16171b] flex flex-wrap items-center justify-between gap-3 text-xs">
            {!isDrawingMode ? (
              <>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => applyFormat('bold')}
                    className={getFormatBtnClass(activeFormats.bold)}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('italic')}
                    className={getFormatBtnClass(activeFormats.italic)}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('underline')}
                    className={getFormatBtnClass(activeFormats.underline)}
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('insertUnorderedList')}
                    className={getFormatBtnClass(activeFormats.ul)}
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('insertOrderedList')}
                    className={getFormatBtnClass(activeFormats.ol)}
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('formatBlock', '<pre>')}
                    className={getFormatBtnClass(activeFormats.code)}
                    title="Code Block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
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
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#202126] dark:hover:bg-[#282a31] border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 font-medium text-xs transition-colors cursor-pointer"
                    title="Store original media file in server database/files"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                    ) : (
                      <Image className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    )}
                    <span>Attach Media</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawingMode(true);
                      syncCanvasDimensions();
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium text-xs transition-colors cursor-pointer"
                    title="Draw sketches directly over your notes"
                  >
                    <PenTool className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    <span>Draw Sketch</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  {/* Color Picker */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">Color:</span>
                    {['#F59E0B', '#10B981', '#0EA5E9', '#F43F5E', '#A855F7', '#1E293B', '#FFFFFF'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBrushColor(color)}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                          brushColor === color 
                            ? 'ring-2 ring-amber-500 dark:ring-white ring-offset-2 ring-offset-slate-100 dark:ring-offset-[#16171b] scale-110 shadow-sm' 
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Stroke Slider */}
                  <div className="flex items-center space-x-2 border-l border-slate-300 dark:border-neutral-800 pl-3">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">Stroke:</label>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(Number(e.target.value))}
                      className="w-20 accent-amber-500 h-1 bg-slate-300 dark:bg-neutral-800 rounded cursor-pointer"
                      title={`Stroke width: ${brushWidth}px`}
                    />
                    <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 w-6">
                      {brushWidth}px
                    </span>
                  </div>

                  {/* Undo, Redo, and Clear */}
                  <div className="flex items-center space-x-1 border-l border-slate-300 dark:border-neutral-800 pl-3">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={strokes.length === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#25262c] text-slate-600 dark:text-neutral-300 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Undo stroke"
                    >
                      <Undo className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={redoHistory.length === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#25262c] text-slate-600 dark:text-neutral-300 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Redo stroke"
                    >
                      <Redo className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCanvas}
                      disabled={strokes.length === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#25262c] text-slate-600 dark:text-neutral-300 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Clear ink strokes"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Close button placed exactly where Draw Sketch button was */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawingMode(false)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium text-xs transition-colors cursor-pointer"
                    title="Close drawing mode"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Editor Body with Integrated In-Place Drawing Layer */}
          <div className="p-6 sm:p-8 flex-1 flex flex-col overflow-y-auto space-y-4 bg-white dark:bg-[#17181c]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className="w-full text-2xl sm:text-3xl font-bold bg-transparent text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none tracking-tight"
            />

            <div className="relative flex-1 min-h-[340px]">
              {/* WYSIWYG Rich Text Content Area */}
              <div
                ref={editorRef}
                contentEditable={!isDrawingMode}
                onInput={() => {
                  calculateWordCount();
                  updateActiveFormats();
                }}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                data-placeholder="Start writing... Use formatting tools above or draw ink sketches directly over text."
                className="rich-editor-content w-full min-h-[340px] text-slate-800 dark:text-neutral-200 outline-none focus:outline-none"
              />

              {/* In-Place Ink Drawing Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full transition-opacity ${
                  isDrawingMode 
                    ? 'pointer-events-auto cursor-crosshair z-20' 
                    : 'pointer-events-none z-10'
                }`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
          </div>

          {/* Footer Bar: Word count, Sync status badge & Save Note */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141518] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4 text-slate-500 font-mono text-[11px]">
              <span>{wordCount} words</span>
              <span>•</span>
              <span className="flex items-center space-x-1.5" title={`Cloud sync status: ${syncStatus}`}>
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Syncing...</span>
                  </>
                ) : syncStatus === 'synced' ? (
                  <>
                    <CloudCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Synced</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                    <span className="text-slate-500 dark:text-neutral-400">Offline</span>
                  </>
                )}
              </span>
              {attachments.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1 text-slate-600 dark:text-neutral-400">
                    <Paperclip className="w-3 h-3" />
                    <span>{attachments.length} files</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <StealthPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        mode="unlock_note"
        onSuccess={handlePinSuccess}
      />
    </>
  );
};
