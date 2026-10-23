import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
  GestureResponderEvent,
  Modal,
  Image as RNImage,
  LayoutAnimation,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { 
  generateExcerpt, 
  encryptNoteContent, 
  decryptNoteContent, 
  isEncryptedContent,
  LocalNote,
  Stroke,
  Point
} from '@cloudnotes/shared-types';
import { upsertLocalNote, softDeleteLocalNote } from '../db/client';
import { uploadMediaFromMobile, getPocketBase } from '../services/api';
import { syncMobileWithServer } from '../services/syncService';
import { getMasterPin } from '../services/pinService';
import { ServerModal } from './ServerModal';
import { 
  Lock, 
  Unlock, 
  Bold, 
  Italic, 
  List, 
  Code, 
  Image as ImageIcon, 
  PenTool, 
  Check, 
  X, 
  Trash2, 
  Undo,
  Redo,
  Eraser,
  Palette,
  Paperclip
} from 'lucide-react-native';

const INK_DATA_REGEX = /<!--CLOUDNASTES_INK_DATA:(.*?)-->/;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 4 Preset Cover Colors
const PRESET_COVER_COLORS = [
  '#F59E0B',
  '#10B981',
  '#38BDF8',
  '#F43F5E',
];

// 4 Preset Brush Colors
const PRESET_BRUSH_COLORS = [
  '#F59E0B',
  '#10B981',
  '#38BDF8',
  '#F8FAFC',
];

// Convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

// Convert Hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { h: 38, s: 100, l: 50 };
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return {
    h: Math.round(h < 0 ? h + 360 : h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}


export interface NoteBlock {
  id: string;
  type: 'paragraph' | 'bullet' | 'code' | 'image';
  text: string;
  imageUrl?: string;
  isBold?: boolean;
  isItalic?: boolean;
}

// Convert HTML / Markdown into Rich Blocks
function parseContentToBlocks(rawContent: string): { blocks: NoteBlock[]; strokes: Stroke[] } {
  if (!rawContent) {
    return {
      blocks: [{ id: `b_${Date.now()}`, type: 'paragraph', text: '', isBold: false, isItalic: false }],
      strokes: [],
    };
  }

  let clean = rawContent;
  let strokes: Stroke[] = [];

  const inkMatch = clean.match(INK_DATA_REGEX);
  if (inkMatch) {
    try {
      strokes = JSON.parse(inkMatch[1]);
    } catch {
      strokes = [];
    }
    clean = clean.replace(INK_DATA_REGEX, '');
  }

  clean = clean.replace(/<div class="cloudnotes-drawing[^>]*>[\s\S]*?<\/div>/gi, '');

  const rawLines = clean
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/pre>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (rawLines.length === 0) {
    return {
      blocks: [{ id: `b_${Date.now()}`, type: 'paragraph', text: '', isBold: false, isItalic: false }],
      strokes,
    };
  }

  const blocks: NoteBlock[] = [];
  rawLines.forEach((line, idx) => {
    let type: 'paragraph' | 'bullet' | 'code' | 'image' = 'paragraph';
    let isBold = false;
    let isItalic = false;
    let imageUrl: string | undefined;

    const imgMatch = line.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch) {
      type = 'image';
      imageUrl = imgMatch[1];
      const capMatch = line.match(/<figcaption>(.*?)<\/figcaption>/i);
      line = capMatch ? capMatch[1] : '';
    } else if (line.includes('<pre>') || line.includes('<code>') || line.startsWith('```')) {
      type = 'code';
      line = line.replace(/<pre>|<code>|<\/pre>|<\/code>|```/gi, '').trim();
    } else if (line.includes('<li>') || line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      type = 'bullet';
      line = line.replace(/<\/?ul>|<\/?li>|^[-*•]\s*/gi, '').trim();
    }

    if (type !== 'code' && type !== 'image') {
      if (line.includes('<b>') || line.includes('<strong>') || line.includes('**')) {
        isBold = true;
        line = line.replace(/<\/?b>|<\/?strong>|\*\*/gi, '');
      }
      if (line.includes('<i>') || line.includes('<em>') || line.includes('*')) {
        isItalic = true;
        line = line.replace(/<\/?i>|<\/?em>|\*/gi, '');
      }
      line = line.replace(/<[^>]+>/g, '').trim();
    }

    blocks.push({
      id: `b_${Date.now()}_${idx}`,
      type,
      text: line,
      imageUrl,
      isBold,
      isItalic,
    });
  });

  return { blocks, strokes };
}

// Convert Rich Blocks to clean HTML + Ink data
function blocksToContent(blocks: NoteBlock[], strokes: Stroke[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === 'image' && block.imageUrl) {
      parts.push(`<figure><img src="${block.imageUrl}" alt="${block.text || 'image'}" /><figcaption>${block.text || ''}</figcaption></figure>`);
    } else if (block.type === 'code') {
      parts.push(`<pre><code>${block.text}</code></pre>`);
    } else if (block.type === 'bullet') {
      let t = block.text;
      if (block.isBold) t = `<b>${t}</b>`;
      if (block.isItalic) t = `<i>${t}</i>`;
      parts.push(`<ul><li>${t}</li></ul>`);
    } else {
      let t = block.text;
      if (block.isBold) t = `<b>${t}</b>`;
      if (block.isItalic) t = `<i>${t}</i>`;
      parts.push(`<p>${t}</p>`);
    }
  }

  let html = parts.join('\n');
  if (strokes.length > 0) {
    html += `<!--CLOUDNASTES_INK_DATA:${JSON.stringify(strokes)}-->`;
  }
  return html;
}

export interface NoteEditorModalProps {
  visible: boolean;
  note?: LocalNote | null;
  onClose: () => void;
  onSaveSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  visible,
  note,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
}) => {
  // Core Note State
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([
    { id: 'b_init', type: 'paragraph', text: '', isBold: false, isItalic: false },
  ]);
  const [activeBlockId, setActiveBlockId] = useState<string>('b_init');
  const [coverColor, setCoverColor] = useState(PRESET_COVER_COLORS[0]);
  const [coverIcon, setCoverIcon] = useState('file-text');
  const [isLocked, setIsLocked] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  // In-Place Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState<string>(PRESET_BRUSH_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoHistory, setRedoHistory] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Custom Color Picker Modal State
  const [colorPickerTarget, setColorPickerTarget] = useState<'cover' | 'brush' | null>(null);
  const [tempHexInput, setTempHexInput] = useState('#F59E0B');
  const [hsl, setHsl] = useState<{ h: number; s: number; l: number }>({ h: 38, s: 100, l: 50 });
  const [sliderTrackWidth, setSliderTrackWidth] = useState(260);

  // Drawing Controls Scroll Gradient Affordance
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Smooth drawing jitter filter ref
  const lastPointRef = useRef<Point | null>(null);

  const handleDrawingScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentSize.width <= layoutMeasurement.width + 2) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const isStart = contentOffset.x <= 4;
    const isEnd = contentOffset.x >= contentSize.width - layoutMeasurement.width - 4;
    setCanScrollLeft(!isStart);
    setCanScrollRight(!isEnd);
  };

  // Refs for focusing inputs & auto-scrolling
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const scrollRef = useRef<ScrollView | null>(null);

  // Dynamic Toggle Drawing Mode with smooth transition & keyboard dismiss
  const toggleDrawingMode = () => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDrawingMode(prev => {
      const next = !prev;
      if (next) {
        setCanScrollLeft(false);
        setCanScrollRight(true);
      }
      return next;
    });
  };

  // Reset or Load Note on visible or note changes
  useEffect(() => {
    if (!visible) return;

    if (note) {
      setTitle(note.title || '');
      setCoverColor(note.cover_color || PRESET_COVER_COLORS[0]);
      setCoverIcon(note.cover_icon || 'file-text');
      setIsLocked(Boolean(note.is_locked));

      if (note.attachments_json) {
        try {
          setAttachments(JSON.parse(note.attachments_json));
        } catch {
          setAttachments([]);
        }
      } else {
        setAttachments([]);
      }

      (async () => {
        let rawContent = note.content || '';
        if (isEncryptedContent(rawContent)) {
          const masterPin = await getMasterPin();
          if (masterPin) {
            try {
              rawContent = await decryptNoteContent(rawContent, masterPin);
            } catch {
              // leave as is
            }
          }
        }

        const { blocks: parsedBlocks, strokes: parsedStrokes } = parseContentToBlocks(rawContent);
        setBlocks(parsedBlocks);
        setStrokes(parsedStrokes);
        if (parsedBlocks.length > 0) {
          setActiveBlockId(parsedBlocks[0].id);
        }
      })();
    } else {
      // New note initial state
      setTitle('');
      setCoverColor(PRESET_COVER_COLORS[0]);
      setCoverIcon('file-text');
      setIsLocked(false);
      setAttachments([]);
      setStrokes([]);
      setRedoHistory([]);
      setCurrentStroke([]);
      setIsDrawingMode(false);
      setCanScrollLeft(false);
      setCanScrollRight(true);
      const initId = `b_${Date.now()}`;
      setBlocks([{ id: initId, type: 'paragraph', text: '', isBold: false, isItalic: false }]);
      setActiveBlockId(initId);
    }
  }, [visible, note]);

  // Active block formatting helpers
  const activeBlock = blocks.find(b => b.id === activeBlockId) || blocks[0];

  const updateBlockText = (blockId: string, text: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, text } : b));
  };

  const toggleBold = () => {
    if (!activeBlock) return;
    setBlocks(prev => prev.map(b => b.id === activeBlock.id ? { ...b, isBold: !b.isBold } : b));
  };

  const toggleItalic = () => {
    if (!activeBlock) return;
    setBlocks(prev => prev.map(b => b.id === activeBlock.id ? { ...b, isItalic: !b.isItalic } : b));
  };

  const toggleList = () => {
    if (!activeBlock) return;
    const newType = activeBlock.type === 'bullet' ? 'paragraph' : 'bullet';
    setBlocks(prev => prev.map(b => b.id === activeBlock.id ? { ...b, type: newType } : b));
  };

  const toggleCode = () => {
    if (!activeBlock) return;
    const newType = activeBlock.type === 'code' ? 'paragraph' : 'code';
    setBlocks(prev => prev.map(b => b.id === activeBlock.id ? { ...b, type: newType } : b));
  };

  // Handle Enter / Return key in block
  const handleBlockSubmit = (blockId: string) => {
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;

    const current = blocks[currentIndex];
    if (current.type === 'bullet' && current.text.trim() === '') {
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: 'paragraph' } : b));
      return;
    }

    const newBlock: NoteBlock = {
      id: `b_${Date.now()}`,
      type: current.type === 'bullet' ? 'bullet' : 'paragraph',
      text: '',
      isBold: current.isBold,
      isItalic: current.isItalic,
    };

    const updated = [...blocks];
    updated.splice(currentIndex + 1, 0, newBlock);
    setBlocks(updated);
    setActiveBlockId(newBlock.id);

    setTimeout(() => {
      inputRefs.current[newBlock.id]?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  // Image Upload (Prompts ServerModal if not logged in, matching main page buttons)
  const handlePickImage = async () => {
    const pb = await getPocketBase();
    if (!pb.authStore.isValid) {
      setIsServerModalOpen(true);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        const pb = await getPocketBase();
        let recordId = note?.id;

        // If creating a new note or local-only note, create record on server first (matching Web)
        if (!recordId || recordId.startsWith('local_') || recordId.length !== 15) {
          const currentHtml = blocksToContent(blocks, strokes);
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

        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        try {
          const serverUrl = await uploadMediaFromMobile(recordId, asset.uri, fileName, mimeType);
          setAttachments(prev => [...prev, fileName]);

          const imgBlock: NoteBlock = {
            id: `b_img_${Date.now()}`,
            type: 'image',
            text: fileName,
            imageUrl: serverUrl,
          };
          const nextPara: NoteBlock = {
            id: `b_${Date.now() + 1}`,
            type: 'paragraph',
            text: '',
            isBold: false,
            isItalic: false,
          };

          setBlocks(prev => [...prev, imgBlock, nextPara]);
          setActiveBlockId(nextPara.id);
        } catch (uploadErr: any) {
          Alert.alert('Upload Error', 'Could not upload to server: ' + (uploadErr?.message || 'Unknown error'));
        } finally {
          setIsUploading(false);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setIsUploading(false);
    }
  };

  const removeBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      setBlocks([{ id: `b_${Date.now()}`, type: 'paragraph', text: '', isBold: false, isItalic: false }]);
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  // In-Place Drawing Handlers (Optimized with quadratic beziers & distance threshold)
  const handleTouchStart = (e: GestureResponderEvent) => {
    if (!isDrawingMode) return;
    const { locationX, locationY } = e.nativeEvent;
    const pt = { x: locationX, y: locationY };
    lastPointRef.current = pt;
    setCurrentStroke([pt]);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!isDrawingMode) return;
    const { locationX, locationY } = e.nativeEvent;
    const last = lastPointRef.current;
    if (last) {
      const dx = locationX - last.x;
      const dy = locationY - last.y;
      // Skip micro-jitter (distance < 2.5px) to prevent lag and state flooding
      if (dx * dx + dy * dy < 6.25) {
        return;
      }
    }
    const pt = { x: locationX, y: locationY };
    lastPointRef.current = pt;
    setCurrentStroke(prev => [...prev, pt]);
  };

  const handleTouchEnd = () => {
    if (!isDrawingMode) return;
    lastPointRef.current = null;
    if (currentStroke.length > 0) {
      const newStroke: Stroke = {
        color: brushColor,
        width: brushWidth,
        points: currentStroke,
      };
      setStrokes(prev => [...prev, newStroke]);
      setRedoHistory([]);
      setCurrentStroke([]);
    }
  };

  const handleUndoStroke = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoHistory(prev => [...prev, last]);
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleRedoStroke = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, next]);
  };

  const handleClearStrokes = () => {
    if (strokes.length === 0) return;
    setRedoHistory([...strokes]);
    setStrokes([]);
  };

  // Smooth quadratic bezier path calculation with midpoints
  const pointsToSvgPath = (points: Point[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y}, ${midX} ${midY}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  };

  // Save Note
  const handleSave = async () => {
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const noteId = note?.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      let finalContent = blocksToContent(blocks, strokes);

      if (isLocked) {
        const masterPin = await getMasterPin();
        if (masterPin) {
          finalContent = await encryptNoteContent(finalContent, masterPin);
        }
      }

      const noteToSave: LocalNote = {
        id: noteId,
        title: title.trim() || 'Untitled Note',
        cover_color: coverColor,
        cover_icon: coverIcon,
        content: finalContent,
        excerpt: generateExcerpt(finalContent, isLocked),
        is_locked: isLocked ? 1 : 0,
        is_archived: note?.is_archived || 0,
        is_deleted: 0,
        deleted_at: null,
        sync_status: 'pending_upload',
        version: (note?.version || 0) + 1,
        updated_at: now,
        client_updated_at: now,
        attachments_json: JSON.stringify(attachments),
      };

      await upsertLocalNote(noteToSave);
      syncMobileWithServer().catch(console.error);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Save Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Discard / Cancel
  const handleCancel = () => {
    Keyboard.dismiss();
    const hasContent = title.trim() || blocks.some(b => b.text.trim()) || strokes.length > 0;
    if (hasContent) {
      Alert.alert('Discard Note?', 'Any unsaved changes will be lost.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  };

  // Delete
  const handleDelete = () => {
    Keyboard.dismiss();
    if (!note?.id) {
      onClose();
      return;
    }
    Alert.alert('Move to Trash', 'Move this note to trash bin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          await softDeleteLocalNote(note.id);
          syncMobileWithServer().catch(console.error);
          if (onDeleteSuccess) onDeleteSuccess();
          onClose();
        },
      },
    ]);
  };

  // Custom Color Selection Handlers with Live Sliders
  const openCustomColorModal = (target: 'cover' | 'brush') => {
    Keyboard.dismiss();
    setColorPickerTarget(target);
    const curr = (target === 'cover' ? coverColor : brushColor) || '#F59E0B';
    setTempHexInput(curr);
    setHsl(hexToHsl(curr));
  };

  const handleHueTouch = (e: GestureResponderEvent) => {
    if (sliderTrackWidth <= 0) return;
    const x = Math.max(0, Math.min(sliderTrackWidth, e.nativeEvent.locationX));
    const newH = Math.round((x / sliderTrackWidth) * 360);
    const nextHsl = { ...hsl, h: newH };
    setHsl(nextHsl);
    setTempHexInput(hslToHex(nextHsl.h, nextHsl.s, nextHsl.l));
  };

  const handleLightnessTouch = (e: GestureResponderEvent) => {
    if (sliderTrackWidth <= 0) return;
    const x = Math.max(0, Math.min(sliderTrackWidth, e.nativeEvent.locationX));
    const newL = Math.max(5, Math.min(95, Math.round((x / sliderTrackWidth) * 100)));
    const nextHsl = { ...hsl, l: newL };
    setHsl(nextHsl);
    setTempHexInput(hslToHex(nextHsl.h, nextHsl.s, nextHsl.l));
  };


  const applyCustomColor = (color: string) => {
    if (!color.startsWith('#')) {
      color = `#${color}`;
    }
    if (colorPickerTarget === 'cover') {
      setCoverColor(color);
    } else if (colorPickerTarget === 'brush') {
      setBrushColor(color);
    }
    setColorPickerTarget(null);
  };

  const isCustomCover = !PRESET_COVER_COLORS.some(c => c.toLowerCase() === coverColor.toLowerCase());
  const isCustomBrush = !PRESET_BRUSH_COLORS.some(c => c.toLowerCase() === brushColor.toLowerCase());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleCancel}
    >
      <SafeAreaView 
        style={styles.safeArea} 
        edges={['top', 'bottom']}
      >
        <View style={styles.container}>
            {/* Row 1 (The Very Top): Cancel & Save (and Trash in middle if editing) */}
            <View style={styles.topActionsBar}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCancel}
                activeOpacity={0.75}
              >
                <X size={17} color="#94A3B8" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              {note?.id ? (
                <TouchableOpacity 
                  style={styles.deleteBtn} 
                  onPress={handleDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.75}
                >
                  <Trash2 size={16} color="#F43F5E" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 36 }} />
              )}

              <TouchableOpacity 
                style={styles.saveBtn} 
                disabled={isSaving}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#121214" />
                ) : (
                  <>
                    <Check size={17} color="#121214" strokeWidth={3} />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Row 2 (Sub-Top Bar): Cover palette on left, Lock icon ONLY on right */}
            <View style={styles.coverLockBar}>
              <View style={styles.coverSection}>
                <Text style={styles.coverLabel}>Cover:</Text>
                <View style={styles.paletteRow}>
                  {PRESET_COVER_COLORS.map(c => {
                    const isSelected = coverColor.toLowerCase() === c.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorRingWrapper,
                          isSelected && styles.colorRingSelected,
                        ]}
                        onPress={() => setCoverColor(c)}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.colorDotCore, { backgroundColor: c }]} />
                      </TouchableOpacity>
                    );
                  })}

                  {/* 5th Empty/Custom Cover Color Dot */}
                  <TouchableOpacity
                    style={[
                      styles.colorRingWrapper,
                      isCustomCover && styles.colorRingSelected,
                      styles.customColorBtn,
                    ]}
                    onPress={() => openCustomColorModal('cover')}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    activeOpacity={0.8}
                  >
                    {isCustomCover ? (
                      <View style={[styles.colorDotCore, { backgroundColor: coverColor }]} />
                    ) : (
                      <Palette size={13} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right: Lock icon ONLY (NO TEXT!) */}
              <TouchableOpacity 
                style={[styles.lockIconBtn, isLocked && styles.lockIconBtnActive]}
                onPress={() => setIsLocked(prev => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.8}
              >
                {isLocked ? (
                  <Lock size={17} color="#F59E0B" strokeWidth={2.4} />
                ) : (
                  <Unlock size={17} color="#94A3B8" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.titleContainer}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Note title..."
                placeholderTextColor="#475569"
                style={styles.titleInput}
                returnKeyType="next"
              />
            </View>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {attachments.map((fileName, idx) => (
                  <View key={`att-${idx}`} style={styles.attachmentBadge}>
                    <Paperclip size={12} color="#F59E0B" />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {fileName}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Editor Body Area: Pure Native WYSIWYG Blocks + In-Place Canvas DIRECTLY over it */}
            <View style={styles.editorAreaContainer}>
              <ScrollView 
                ref={scrollRef}
                style={styles.blocksScrollView}
                contentContainerStyle={styles.blocksScrollContent}
                scrollEnabled={!isDrawingMode}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {blocks.map((block) => {
                  // 1. Image Block
                  if (block.type === 'image') {
                    return (
                      <View key={block.id} style={styles.imageBlockWrapper}>
                        <RNImage 
                          source={{ uri: block.imageUrl }} 
                          style={styles.inlineImage} 
                          resizeMode="cover" 
                        />
                        <View style={styles.imageCaptionRow}>
                          <TextInput
                            value={block.text}
                            onChangeText={(txt) => updateBlockText(block.id, txt)}
                            placeholder="Image caption..."
                            placeholderTextColor="#64748B"
                            style={styles.imageCaptionInput}
                          />
                          <TouchableOpacity 
                            onPress={() => removeBlock(block.id)}
                            style={styles.imageDeleteBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <X size={14} color="#F43F5E" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  // 2. Code Block
                  if (block.type === 'code') {
                    return (
                      <View key={block.id} style={styles.codeBlockCard}>
                        <View style={styles.codeBlockHeader}>
                          <Code size={12} color="#F59E0B" />
                          <Text style={styles.codeBlockBadge}>CODE</Text>
                        </View>
                        <TextInput
                          ref={el => { inputRefs.current[block.id] = el; }}
                          value={block.text}
                          onChangeText={(txt) => updateBlockText(block.id, txt)}
                          onFocus={() => setActiveBlockId(block.id)}
                          multiline
                          placeholder="Type code snippet here..."
                          placeholderTextColor="#475569"
                          style={styles.codeBlockInput}
                          textAlignVertical="top"
                        />
                      </View>
                    );
                  }

                  // 3. Bullet List Block
                  if (block.type === 'bullet') {
                    return (
                      <View key={block.id} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <TextInput
                          ref={el => { inputRefs.current[block.id] = el; }}
                          value={block.text}
                          onChangeText={(txt) => updateBlockText(block.id, txt)}
                          onFocus={() => setActiveBlockId(block.id)}
                          onSubmitEditing={() => handleBlockSubmit(block.id)}
                          multiline
                          placeholder="List item..."
                          placeholderTextColor="#475569"
                          style={[
                            styles.blockInput,
                            block.isBold && styles.textBold,
                            block.isItalic && styles.textItalic,
                          ]}
                          returnKeyType="next"
                          blurOnSubmit={false}
                        />
                      </View>
                    );
                  }

                  // 4. Standard Paragraph Block (WYSIWYG: Bold is visually bold, Italic is visually italic!)
                  return (
                    <View key={block.id} style={styles.paragraphRow}>
                      <TextInput
                        ref={el => { inputRefs.current[block.id] = el; }}
                        value={block.text}
                        onChangeText={(txt) => updateBlockText(block.id, txt)}
                        onFocus={() => setActiveBlockId(block.id)}
                        onSubmitEditing={() => handleBlockSubmit(block.id)}
                        multiline
                        placeholder="Start typing your note here..."
                        placeholderTextColor="#475569"
                        style={[
                          styles.blockInput,
                          block.isBold && styles.textBold,
                          block.isItalic && styles.textItalic,
                        ]}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                  );
                })}

                {/* Tap to append line at bottom */}
                <TouchableOpacity 
                  style={styles.appendBlockArea} 
                  onPress={() => {
                    const newB: NoteBlock = {
                      id: `b_${Date.now()}`,
                      type: 'paragraph',
                      text: '',
                      isBold: false,
                      isItalic: false,
                    };
                    setBlocks(prev => [...prev, newB]);
                    setActiveBlockId(newB.id);
                    setTimeout(() => {
                      inputRefs.current[newB.id]?.focus();
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 60);
                  }}
                  activeOpacity={0.6}
                >
                  <View style={styles.appendIndicator} />
                </TouchableOpacity>
              </ScrollView>

              {/* In-Place Drawing Canvas Overlay (Draws directly ON top of note surface!) */}
              <View 
                style={StyleSheet.absoluteFill}
                pointerEvents={isDrawingMode ? 'auto' : 'none'}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Svg style={StyleSheet.absoluteFill}>
                  {strokes.map((s, idx) => (
                    <Path
                      key={`stroke-${idx}`}
                      d={pointsToSvgPath(s.points)}
                      stroke={s.color}
                      strokeWidth={s.width}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentStroke.length > 0 && (
                    <Path
                      d={pointsToSvgPath(currentStroke)}
                      stroke={brushColor}
                      strokeWidth={brushWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </Svg>
              </View>
            </View>

            {/* Bottom Dock: Formatting Toolbar & Drawing Card (Docked cleanly at bottom without jumping delay) */}
            <View style={styles.bottomDock}>
              {/* Card 1: Formatting Toolbar (Bold, Italic, List, Code | Image, Draw) */}
              <View style={styles.toolbarBox}>
                <View style={styles.formatLeftGroup}>
                  <TouchableOpacity
                    style={[styles.formatBtn, activeBlock?.isBold && styles.formatBtnActive]}
                    onPress={toggleBold}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Bold 
                      size={16} 
                      color={activeBlock?.isBold ? '#F59E0B' : '#CBD5E1'} 
                      strokeWidth={activeBlock?.isBold ? 3 : 2.4} 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatBtn, activeBlock?.isItalic && styles.formatBtnActive]}
                    onPress={toggleItalic}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Italic 
                      size={16} 
                      color={activeBlock?.isItalic ? '#F59E0B' : '#CBD5E1'} 
                      strokeWidth={2.4} 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatBtn, activeBlock?.type === 'bullet' && styles.formatBtnActive]}
                    onPress={toggleList}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <List 
                      size={16} 
                      color={activeBlock?.type === 'bullet' ? '#F59E0B' : '#CBD5E1'} 
                      strokeWidth={2.4} 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formatBtn, activeBlock?.type === 'code' && styles.formatBtnActive]}
                    onPress={toggleCode}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Code 
                      size={16} 
                      color={activeBlock?.type === 'code' ? '#F59E0B' : '#CBD5E1'} 
                      strokeWidth={2.4} 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.formatRightGroup}>
                  <TouchableOpacity
                    style={styles.toolActionBtn}
                    disabled={isUploading}
                    onPress={handlePickImage}
                    activeOpacity={0.75}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#F59E0B" />
                    ) : (
                      <>
                        <ImageIcon size={15} color="#10B981" />
                        <Text style={styles.toolActionText}>Image</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toolActionBtn, isDrawingMode && styles.toolActionBtnActive]}
                    onPress={toggleDrawingMode}
                    activeOpacity={0.75}
                  >
                    <PenTool size={15} color={isDrawingMode ? '#F59E0B' : '#94A3B8'} />
                    <Text style={[styles.toolActionText, isDrawingMode && styles.toolActionTextActive]}>
                      Draw
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Card 2: In-Place Drawing Controls Card (Renders underneath Card 1, lifting Card 1 UP!) */}
              {isDrawingMode && (
                <View style={styles.drawingControlsCard}>
                  {/* Left-edge fade gradient — appears when content has been scrolled right */}
                  {canScrollLeft && (
                    <LinearGradient
                      colors={['#18191D', 'rgba(24, 25, 29, 0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.drawingCardFadeLeft}
                      pointerEvents="none"
                    />
                  )}

                  {/* Horizontal scroll — uses ScrollView with decelerationRate fast for snappy feel */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    decelerationRate="fast"
                    nestedScrollEnabled={true}
                    scrollEventThrottle={16}
                    onScroll={handleDrawingScroll}
                    contentContainerStyle={styles.drawingControlsScrollContent}
                  >
                    {/* Group 1: Brush Colors */}
                    <View style={styles.brushColorsRow}>
                      {PRESET_BRUSH_COLORS.map(c => {
                        const isSelected = brushColor.toLowerCase() === c.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={c}
                            style={[
                              styles.colorRingWrapperSmall,
                              isSelected && styles.colorRingSelected,
                            ]}
                            onPress={() => setBrushColor(c)}
                          >
                            <View style={[styles.colorDotCoreSmall, { backgroundColor: c }]} />
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity
                        style={[
                          styles.colorRingWrapperSmall,
                          isCustomBrush && styles.colorRingSelected,
                          styles.customColorBtnSmall,
                        ]}
                        onPress={() => openCustomColorModal('brush')}
                      >
                        {isCustomBrush ? (
                          <View style={[styles.colorDotCoreSmall, { backgroundColor: brushColor }]} />
                        ) : (
                          <Palette size={11} color="#94A3B8" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.drawingCardDivider} />

                    {/* Group 2: Brush Width */}
                    <View style={styles.brushWidthRow}>
                      {[2, 4, 7].map(w => (
                        <TouchableOpacity
                          key={w}
                          style={[
                            styles.widthBtn,
                            brushWidth === w && styles.widthBtnActive,
                          ]}
                          onPress={() => setBrushWidth(w)}
                        >
                          <View style={{ width: w * 2.2, height: w * 2.2, borderRadius: (w * 2.2) / 2, backgroundColor: brushColor }} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Divider */}
                    <View style={styles.drawingCardDivider} />

                    {/* Group 3: Actions (Undo, Redo, Clear) */}
                    <View style={styles.drawingActionsRow}>
                      <TouchableOpacity 
                        style={styles.canvasToolBtn} 
                        disabled={strokes.length === 0}
                        onPress={handleUndoStroke}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Undo size={14} color={strokes.length > 0 ? "#CBD5E1" : "#475569"} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.canvasToolBtn} 
                        disabled={redoHistory.length === 0}
                        onPress={handleRedoStroke}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Redo size={14} color={redoHistory.length > 0 ? "#CBD5E1" : "#475569"} />
                      </TouchableOpacity>

                      {/* Clear button */}
                      <TouchableOpacity 
                        style={[styles.canvasToolBtn, styles.clearBtn]} 
                        disabled={strokes.length === 0}
                        onPress={handleClearStrokes}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Eraser size={14} color={strokes.length > 0 ? "#F43F5E" : "#475569"} />
                        <Text style={[styles.clearBtnText, { color: strokes.length > 0 ? "#F43F5E" : "#475569" }]}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  {/* Right-edge fade gradient — affordance: hints that content can be scrolled right */}
                  {canScrollRight && (
                    <LinearGradient
                      colors={['rgba(24, 25, 29, 0)', '#18191D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.drawingCardFadeRight}
                      pointerEvents="none"
                    />
                  )}
                </View>
              )}
            </View>
          </View>

        {/* Custom Free Color Picker Modal (Inside Editor) with Live Sliders */}
        <Modal
          visible={colorPickerTarget !== null}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setColorPickerTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              onPress={() => setColorPickerTarget(null)} 
              activeOpacity={1} 
            />

            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <Palette size={18} color="#F59E0B" />
                  <Text style={styles.modalTitle}>
                    {colorPickerTarget === 'cover' ? 'Custom Cover Color' : 'Custom Brush Color'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setColorPickerTarget(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#A1A1AA" />
                </TouchableOpacity>
              </View>

              {/* Live Color Preview & Hex Display */}
              <View style={styles.pickerPreviewRow}>
                <View style={[styles.largePreviewBox, { backgroundColor: tempHexInput || '#F59E0B' }]} />
                <View style={styles.hexInputWrapper}>
                  <Text style={styles.hexLabel}>HEX CODE</Text>
                  <TextInput
                    value={tempHexInput}
                    onChangeText={(val) => {
                      setTempHexInput(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^[0-9A-Fa-f]{6}$/.test(val)) {
                        setHsl(hexToHsl(val));
                      }
                    }}
                    placeholder="#RRGGBB"
                    placeholderTextColor="#71717A"
                    autoCapitalize="characters"
                    style={styles.hexTextInput}
                  />
                </View>
              </View>

              {/* Slider 1: Hue Spectrum Bar (0 - 360) */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.sliderLabel}>Hue</Text>
                  <Text style={styles.sliderValue}>{hsl.h}°</Text>
                </View>
                <View 
                  style={styles.sliderTrackContainer}
                  onLayout={(e) => setSliderTrackWidth(e.nativeEvent.layout.width)}
                  onTouchStart={handleHueTouch}
                  onTouchMove={handleHueTouch}
                >
                  <LinearGradient
                    colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sliderGradientTrack}
                  />
                  <View 
                    style={[
                      styles.sliderThumb, 
                      { left: `${Math.max(0, Math.min(100, (hsl.h / 360) * 100))}%` }
                    ]} 
                  />
                </View>
              </View>

              {/* Slider 2: Brightness / Lightness Bar */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.sliderLabel}>Brightness</Text>
                  <Text style={styles.sliderValue}>{hsl.l}%</Text>
                </View>
                <View 
                  style={styles.sliderTrackContainer}
                  onTouchStart={handleLightnessTouch}
                  onTouchMove={handleLightnessTouch}
                >
                  <LinearGradient
                    colors={['#000000', hslToHex(hsl.h, hsl.s, 50), '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sliderGradientTrack}
                  />
                  <View 
                    style={[
                      styles.sliderThumb, 
                      { left: `${Math.max(0, Math.min(100, hsl.l))}%` }
                    ]} 
                  />
                </View>
              </View>


              {/* Modal Actions */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn}
                  onPress={() => setColorPickerTarget(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalApplyBtn}
                  onPress={() => applyCustomColor(tempHexInput)}
                >
                  <Check size={16} color="#121214" strokeWidth={3} />
                  <Text style={styles.modalApplyText}>Apply Color</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Server Login Modal (Opened if user taps Image when unauthenticated) */}
        <ServerModal
          visible={isServerModalOpen}
          onClose={() => setIsServerModalOpen(false)}
          onLoginSuccess={() => {
            setIsServerModalOpen(false);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121214',
  },
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },

  /* Row 1: Top Action Bar (Cancel on left, Delete in center, Save on right) */
  topActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#121214',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18191D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 11,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121214',
  },

  /* Row 2: Sub-Top Bar (Cover palette on left, Lock icon on right) */
  coverLockBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#18191D',
  },
  coverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  coverLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  /* Halo Ring-Offset Color Dot (26px outer white ring with 2px gap around 18px colored dot) */
  colorRingWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorRingSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  colorDotCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  customColorBtn: {
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  /* Lock Icon Only (NO TEXT!) */
  lockIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#18191D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  lockIconBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },

  /* Title Input */
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F4F4F5',
    paddingVertical: 4,
  },

  /* Attachments */
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18191D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    maxWidth: '85%',
  },
  attachmentName: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
  },

  /* Editor Body Area with In-Place Canvas Overlay */
  editorAreaContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#121214',
  },
  blocksScrollView: {
    flex: 1,
  },
  blocksScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
  },
  paragraphRow: {
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  bulletDot: {
    fontSize: 20,
    lineHeight: 24,
    color: '#F59E0B',
    fontWeight: '900',
  },
  blockInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#E4E4E7',
    padding: 0,
  },

  /* Visual WYSIWYG Styles (Bold is ACTUALLY bold, Italic is ACTUALLY italic) */
  textBold: {
    fontWeight: '800',
    color: '#F4F4F5',
  },
  textItalic: {
    fontStyle: 'italic',
    color: '#D4D4D8',
  },

  /* Code Block Card */
  codeBlockCard: {
    backgroundColor: '#18191D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 12,
    marginBottom: 10,
  },
  codeBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  codeBlockBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  codeBlockInput: {
    fontSize: 14,
    lineHeight: 20,
    color: '#F59E0B',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
    padding: 0,
  },

  /* Image Block */
  imageBlockWrapper: {
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#18191D',
  },
  inlineImage: {
    width: '100%',
    height: 190,
  },
  imageCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageCaptionInput: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    padding: 0,
  },
  imageDeleteBtn: {
    padding: 4,
  },

  appendBlockArea: {
    paddingVertical: 24,
  },
  appendIndicator: {
    height: 1,
  },

  /* Bottom Dock: Clean docked bar at bottom */
  bottomDock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 14 : 10,
    backgroundColor: '#121214',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    gap: 8,
  },

  /* Formatting Toolbar Row (No card background) */
  toolbarBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  formatLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formatBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  formatBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  formatRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  toolActionBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  toolActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toolActionTextActive: {
    color: '#F59E0B',
    fontWeight: '700',
  },

  /* In-Place Drawing Controls Card */
  drawingControlsCard: {
    backgroundColor: '#18191D',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  drawingControlsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingRight: 24,
    gap: 10,
  },
  drawingCardDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#27272A',
    borderRadius: 1,
  },
  drawingCardFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
    zIndex: 10,
    pointerEvents: 'none',
  },
  drawingCardFadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    zIndex: 10,
    pointerEvents: 'none',
  },
  brushColorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  colorRingWrapperSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotCoreSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  customColorBtnSmall: {
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  brushWidthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  widthBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222328',
  },
  widthBtnActive: {
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  drawingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  canvasToolBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#222328',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    width: 'auto',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Custom Color Picker Modal with Sliders */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#17181C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F4F4F5',
  },
  pickerPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  largePreviewBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  hexInputWrapper: {
    flex: 1,
    backgroundColor: '#1F2024',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hexLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  hexTextInput: {
    color: '#F4F4F5',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
    padding: 0,
  },
  sliderGroup: {
    marginBottom: 14,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  sliderValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F4F4F5',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
  },
  sliderTrackContainer: {
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderGradientTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#121214',
    marginLeft: -12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#18191D',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  modalApplyBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
  },
  modalApplyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#121214',
  },
});
