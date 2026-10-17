import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { LocalNote } from '@cloudnotes/shared-types';
import { getPaletteByColor } from '@cloudnotes/design-system';
import { 
  getTrashNotes, 
  restoreLocalNote, 
  hardDeleteLocalNote 
} from '../../db/client';
import { syncMobileWithServer } from '../../services/syncService';
import { 
  Trash2, 
  RotateCcw, 
  Lock, 
  FileText 
} from 'lucide-react-native';

export default function TrashGalleryScreen() {
  const [trashNotes, setTrashNotes] = useState<LocalNote[]>([]);

  const loadTrash = useCallback(async () => {
    const list = await getTrashNotes();
    setTrashNotes(list);
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (noteId: string) => {
    await restoreLocalNote(noteId);
    await loadTrash();
    syncMobileWithServer().catch(console.error);
  };

  const handlePermanentDelete = async (noteId: string) => {
    Alert.alert(
      'Permanent Purge',
      'Are you sure you want to permanently delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
            await hardDeleteLocalNote(noteId);
            await loadTrash();
            syncMobileWithServer().catch(console.error);
          }
        }
      ]
    );
  };

  const handleEmptyTrash = async () => {
    Alert.alert(
      'Empty Entire Trash',
      'Permanently destroy all soft-deleted notes? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            for (const n of trashNotes) {
              await hardDeleteLocalNote(n.id);
            }
            await loadTrash();
            syncMobileWithServer().catch(console.error);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Action Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Trash Bin Gallery</Text>
          <Text style={styles.headerSubtitle}>
            {trashNotes.length} {trashNotes.length === 1 ? 'item' : 'items'} in trash
          </Text>
        </View>

        {trashNotes.length > 0 && (
          <TouchableOpacity style={styles.emptyBtn} onPress={handleEmptyTrash}>
            <Trash2 size={14} color="#FDA4AF" />
            <Text style={styles.emptyBtnText}>Empty All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {trashNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Trash2 size={36} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>Trash is empty</Text>
            <Text style={styles.emptyDesc}>
              Deleted notes will appear here temporarily in a matching Bento layout.
            </Text>
          </View>
        ) : (
          trashNotes.map(note => {
            const palette = getPaletteByColor(note.cover_color);
            const isLocked = Boolean(note.is_locked);

            return (
              <View 
                key={note.id} 
                style={[
                  styles.card,
                  { borderTopColor: palette.primary, borderTopWidth: 3 }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBadge, { backgroundColor: palette.bgDark, borderColor: palette.borderDark }]}>
                    <FileText size={16} color={palette.primary} />
                  </View>

                  {isLocked && (
                    <View style={styles.lockBadge}>
                      <Lock size={12} color="#F59E0B" />
                    </View>
                  )}
                </View>

                <Text style={styles.noteTitle} numberOfLines={2}>
                  {note.title || 'Untitled Note'}
                </Text>

                <Text style={styles.noteExcerpt} numberOfLines={3}>
                  {isLocked ? '[Encrypted Note in Trash]' : (note.excerpt || 'No content')}
                </Text>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={styles.restoreBtn} 
                    onPress={() => handleRestore(note.id)}
                  >
                    <RotateCcw size={14} color="#10B981" />
                    <Text style={styles.restoreText}>Restore</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.purgeBtn} 
                    onPress={() => handlePermanentDelete(note.id)}
                  >
                    <Trash2 size={14} color="#F43F5E" />
                    <Text style={styles.purgeText}>Purge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#111827',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  emptyBtnText: {
    fontSize: 12,
    color: '#FDA4AF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1F293D',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 5,
    borderRadius: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  noteExcerpt: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  restoreText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  purgeText: {
    fontSize: 12,
    color: '#F43F5E',
    fontWeight: '600',
  },
});
