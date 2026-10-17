import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalNote } from '@cloudnotes/shared-types';
import { getActiveNotes, getTrashNotes, softDeleteLocalNote } from '../../db/client';
import { syncMobileWithServer, subscribeSyncState, SyncState } from '../../services/syncService';
import { NoteBentoCard } from '../../components/NoteBentoCard';
import { TrashBentoCard } from '../../components/TrashBentoCard';
import { 
  Plus, 
  Sparkles, 
  Server, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Cloud 
} from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const [activeNotes, setActiveNotes] = useState<LocalNote[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  const loadData = useCallback(async () => {
    try {
      const active = await getActiveNotes();
      const trash = await getTrashNotes();
      setActiveNotes(active);
      setTrashCount(trash.length);
    } catch (e) {
      console.warn('Error loading local notes:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeSyncState(setSyncState);
    syncMobileWithServer().then(loadData);
    return unsub;
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncMobileWithServer();
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = async (noteId: string) => {
    await softDeleteLocalNote(noteId);
    await loadData();
    syncMobileWithServer().then(loadData);
  };

  const filteredNotes = activeNotes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>CloudNotes</Text>
              <View style={styles.vaultPill}>
                <Text style={styles.vaultPillText}>VAULT</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>Offline-First • Lossless</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => router.push('/(main)/ai' as any)}
          >
            <Sparkles size={18} color="#C084FC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => router.push('/(auth)/server' as any)}
          >
            <Server size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.syncBtn} onPress={onRefresh}>
            {syncState === 'syncing' ? (
              <RefreshCw size={14} color="#F59E0B" />
            ) : syncState === 'idle' ? (
              <CheckCircle size={14} color="#10B981" />
            ) : (
              <Cloud size={14} color="#64748B" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search notes..."
          placeholderTextColor="#64748B"
          style={styles.searchInput}
        />
      </View>

      {/* Main Bento Scroll View */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
        }
      >
        {/* Active Notes */}
        {filteredNotes.map(note => (
          <NoteBentoCard
            key={note.id}
            note={note}
            onPress={() => router.push({ pathname: '/(main)/editor' as any, params: { id: note.id } })}
            onDelete={() => handleDelete(note.id)}
          />
        ))}

        {/* Trash Bento Card: ALWAYS last (N+1) or first if empty (N=0) */}
        <TrashBentoCard
          count={trashCount}
          onPress={() => router.push('/(main)/trash' as any)}
          isOnlyCard={filteredNotes.length === 0}
        />
      </ScrollView>

      {/* Floating Action Button (New Note) */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.fab}
        onPress={() => router.push('/(main)/editor' as any)}
      >
        <Plus size={26} color="#0B0F19" strokeWidth={3} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B0F19',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  vaultPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  vaultPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtn: {
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#F8FAFC',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
