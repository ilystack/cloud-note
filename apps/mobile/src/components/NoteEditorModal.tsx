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
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
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
import { uploadMediaFromMobile } from '../services/api';
import { syncMobileWithServer } from '../services/syncService';
import { getMasterPin } from '../services/pinService';
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

// 24 Swatches for Custom Free Color Picker (matching Web)
const EXTENDED_PALETTE = [
  '#EF4444', '#F43F5E', '#EC4899', '#E11D48',
  '#F59E0B', '#F97316', '#FB923C', '#FBBF24',
  '#10B981', '#059669', '#14B8A6', '#84CC16',
  '#38BDF8', '#0EA5E9', '#3B82F6', '#06B6D4',
  '#8B5CF6', '#A855F7', '#C084FC', '#6366F1',
  '#F8FAFC', '#CBD5E1', '#64748B', '#1E293B',
];

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

  // In-Place Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState<string>(PRESET_BRUSH_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoHistory, setRedoHistory] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Custom Color Picker Modal State
  const [colorPickerTarget, setColorPickerTarget] = useState<'cover' | 'brush' | null>(null);
  const [tempHexInput, setTempHexInput] = useState('');

  // Dynamic Keyboard Tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Refs for focusing inputs & auto-scrolling
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const scrollRef = useRef<ScrollView | null>(null);

  // Listen to keyboard show/hide events to dynamically follow keyboard on Android & iOS
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height || 0;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(height);
    };

    const onHide = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  // Dynamic Toggle Drawing Mode with smooth transition & keyboard dismiss
  const toggleDrawingMode = () => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDrawingMode(prev => !prev);
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

  // Image Upload
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        const recordId = note?.id || `local_${Date.now()}`;
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        try {
          const serverUrl = await uploadMediaFromMobile(recordId, asset.uri, fileName, mimeType);
          setAttachments(prev => [...prev, fileName]);

          const imgBlock: NoteBlock = {
            id: `b_img_${Date.now()}`,
            type: 'image',
            text: fileName,
            imageUrl: serverUrl || asset.uri,
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
        } catch (err: any) {
          Alert.alert('Upload Error', 'Could not upload to server: ' + err.message);
        } finally {
          setIsUploading(false);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const removeBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      setBlocks([{ id: `b_${Date.now()}`, type: 'paragraph', text: '', isBold: false, isItalic: false }]);
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  // In-Place Drawing Handlers
  const handleTouchStart = (e: GestureResponderEvent) => {
    if (!isDrawingMode) return;
    const { locationX, locationY } = e.nativeEvent;
    setCurrentStroke([{ x: locationX, y: locationY }]);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!isDrawingMode) return;
    const { locationX, locationY } = e.nativeEvent;
    setCurrentStroke(prev => [...prev, { x: locationX, y: locationY }]);
  };

  const handleTouchEnd = () => {
    if (!isDrawingMode) return;
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

  const pointsToSvgPath = (points: Point[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
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

  // Custom Color Selection Handlers
  const openCustomColorModal = (target: 'cover' | 'brush') => {
    Keyboard.dismiss();
    setColorPickerTarget(target);
    const curr = target === 'cover' ? coverColor : brushColor;
    setTempHexInput(curr);
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
        edges={keyboardHeight > 0 ? ['top'] : ['top', 'bottom']}
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
                  <ActivityIndicator size="small" color="#0B0F19" />
                ) : (
                  <>
                    <Check size={17} color="#0B0F19" strokeWidth={3} />
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

            {/* Bottom Dock: Dynamic Formatting Toolbar & Drawing Card */}
            <View 
              style={[
                styles.bottomDock,
                keyboardHeight > 0 && {
                  paddingBottom: keyboardHeight + (Platform.OS === 'android' ? 8 : 4),
                }
              ]}
            >
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

                    {/* Clear button with Eraser icon and text (NO trash icon) */}
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
                </View>
              )}
            </View>
          </View>

        {/* Custom Free Color Picker Modal (Inside Editor) */}
        <Modal
          visible={colorPickerTarget !== null}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setColorPickerTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
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
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Color Swatches Grid */}
              <View style={styles.swatchesGrid}>
                {EXTENDED_PALETTE.map(hex => (
                  <TouchableOpacity
                    key={hex}
                    style={[
                      styles.swatchItem,
                      { backgroundColor: hex },
                      tempHexInput.toLowerCase() === hex.toLowerCase() && styles.swatchItemSelected,
                    ]}
                    onPress={() => setTempHexInput(hex)}
                    activeOpacity={0.8}
                  />
                ))}
              </View>

              {/* Hex Code Input with Live Preview */}
              <View style={styles.hexInputRow}>
                <View style={[styles.hexPreviewBox, { backgroundColor: tempHexInput || '#1E293B' }]} />
                <TextInput
                  value={tempHexInput}
                  onChangeText={setTempHexInput}
                  placeholder="#RRGGBB"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  style={styles.hexTextInput}
                />
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
                  <Check size={16} color="#0B0F19" strokeWidth={3} />
                  <Text style={styles.modalApplyText}>Apply Color</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
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
    borderBottomColor: '#1E293B',
    backgroundColor: '#0B0F19',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161E2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
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
    color: '#0B0F19',
  },

  /* Row 2: Sub-Top Bar (Cover palette on left, Lock icon on right) */
  coverLockBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0E1422',
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
    borderColor: '#334155',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  /* Lock Icon Only (NO TEXT!) */
  lockIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#161E2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
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
    backgroundColor: '#161E2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxWidth: '85%',
  },
  attachmentName: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Editor Body Area with In-Place Canvas Overlay */
  editorAreaContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0B0F19',
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
    color: '#E2E8F0',
    padding: 0,
  },

  /* Visual WYSIWYG Styles (Bold is ACTUALLY bold, Italic is ACTUALLY italic) */
  textBold: {
    fontWeight: '800',
    color: '#F8FAFC',
  },
  textItalic: {
    fontStyle: 'italic',
    color: '#CBD5E1',
  },

  /* Code Block Card */
  codeBlockCard: {
    backgroundColor: '#141B2B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    borderColor: '#1E293B',
    backgroundColor: '#111624',
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

  /* Bottom Dock: Stacks Formatting Toolbar & Drawing Toolbar dynamically */
  bottomDock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 12 : 8,
    backgroundColor: '#0B0F19',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
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

  /* In-Place Drawing Controls Card (Card 2: Sits underneath Card 1) */
  drawingControlsCard: {
    backgroundColor: '#0F1522',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderColor: '#334155',
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
    backgroundColor: '#161E2E',
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
    backgroundColor: '#161E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    width: 'auto',
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Custom Color Picker Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0F1522',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
  },
  swatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  swatchItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchItemSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  hexInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    backgroundColor: '#161F30',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hexPreviewBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hexTextInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
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
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
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
    color: '#0B0F19',
  },
});
