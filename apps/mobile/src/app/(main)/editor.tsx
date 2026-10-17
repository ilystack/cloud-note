import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { NOTE_PALETTES } from '@cloudnotes/design-system';
import { 
  generateExcerpt, 
  encryptNoteContent, 
  decryptNoteContent, 
  isEncryptedContent,
  LocalNote
} from '@cloudnotes/shared-types';
import { getDb, upsertLocalNote, softDeleteLocalNote } from '../../db/client';
import { uploadMediaFromMobile } from '../../services/api';
import { syncMobileWithServer } from '../../services/syncService';
import { getMasterPin } from '../../services/pinService';
import { 
  Trash2, 
  Lock, 
  Unlock, 
  Image as ImageIcon, 
  Check 
} from 'lucide-react-native';

export default function NoteEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverColor, setCoverColor] = useState(NOTE_PALETTES[0].primary);
  const [coverIcon, setCoverIcon] = useState('file-text');
  const [isLocked, setIsLocked] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      const db = await getDb();
      const existing = await db.getFirstAsync<LocalNote>('SELECT * FROM local_notes WHERE id = ?', [id]);
      if (existing) {
        setTitle(existing.title);
        setCoverColor(existing.cover_color);
        setCoverIcon(existing.cover_icon);
        setIsLocked(Boolean(existing.is_locked));

        if (existing.attachments_json) {
          try {
            setAttachments(JSON.parse(existing.attachments_json));
          } catch {
            setAttachments([]);
          }
        }

        // Decrypt if locked
        if (isEncryptedContent(existing.content)) {
          const masterPin = await getMasterPin();
          if (masterPin) {
            try {
              const decrypted = await decryptNoteContent(existing.content, masterPin);
              setContent(decrypted);
            } catch {
              setContent(existing.content);
            }
          } else {
            setContent(existing.content);
          }
        } else {
          setContent(existing.content);
        }
      }
    })();
  }, [id]);

  // Pick Image Lossless (No downscaling) & Upload to Server
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Lossless full resolution
        quality: 1, // 100% full original quality
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        const recordId = id || `local_${Date.now()}`;
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        try {
          const serverUrl = await uploadMediaFromMobile(recordId, asset.uri, fileName, mimeType);
          setAttachments(prev => [...prev, fileName]);

          // Embed media tag into content
          const embed = `\n<img src="${serverUrl}" alt="${fileName}" />\n`;
          setContent(prev => prev + embed);
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const noteId = id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      let contentToSave = content;
      if (isLocked) {
        const masterPin = await getMasterPin();
        if (masterPin) {
          contentToSave = await encryptNoteContent(content, masterPin);
        }
      }

      const noteToSave: LocalNote = {
        id: noteId,
        title: title.trim() || 'Untitled Note',
        cover_color: coverColor,
        cover_icon: coverIcon,
        content: contentToSave,
        excerpt: generateExcerpt(contentToSave, isLocked),
        is_locked: isLocked ? 1 : 0,
        is_archived: 0,
        is_deleted: 0,
        deleted_at: null,
        sync_status: 'pending_upload',
        version: 1,
        updated_at: now,
        client_updated_at: now,
        attachments_json: JSON.stringify(attachments),
      };

      await upsertLocalNote(noteToSave);
      syncMobileWithServer().catch(console.error);
      router.back();
    } catch (err: any) {
      Alert.alert('Save Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      router.back();
      return;
    }
    await softDeleteLocalNote(id);
    syncMobileWithServer().catch(console.error);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <View style={styles.toolbar}>
        <View style={styles.paletteRow}>
          {NOTE_PALETTES.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.colorDot,
                { backgroundColor: p.primary },
                coverColor === p.primary && styles.colorDotSelected,
              ]}
              onPress={() => setCoverColor(p.primary)}
            />
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.toolBtn, isLocked && styles.toolBtnActive]}
            onPress={() => setIsLocked(prev => !prev)}
          >
            {isLocked ? <Lock size={16} color="#F59E0B" /> : <Unlock size={16} color="#94A3B8" />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolBtn} 
            disabled={isUploading}
            onPress={handlePickImage}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#F59E0B" />
            ) : (
              <ImageIcon size={16} color="#10B981" />
            )}
          </TouchableOpacity>

          {id && (
            <TouchableOpacity style={styles.toolBtn} onPress={handleDelete}>
              <Trash2 size={16} color="#F43F5E" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.saveBtn} 
            disabled={isSaving}
            onPress={handleSave}
          >
            <Check size={18} color="#0B0F19" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor Body */}
      <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Note title..."
          placeholderTextColor="#475569"
          style={styles.titleInput}
        />

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your note here... (lossless media embeds & drawings supported)"
          placeholderTextColor="#475569"
          multiline
          textAlignVertical="top"
          style={styles.contentInput}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#111827',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorScroll: {
    flex: 1,
  },
  editorContent: {
    padding: 20,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 24,
    minHeight: 350,
  },
});
