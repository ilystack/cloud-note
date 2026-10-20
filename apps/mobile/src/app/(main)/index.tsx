import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Easing
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalNote } from '@cloudnotes/shared-types';
import { 
  getActiveNotes, 
  getTrashNotes, 
  softDeleteLocalNote, 
  restoreLocalNote, 
  hardDeleteLocalNote,
  toggleArchiveLocalNote 
} from '../../db/client';
import { syncMobileWithServer, subscribeSyncState, SyncState } from '../../services/syncService';
import { 
  hasMasterPin, 
  verifyMasterPin, 
  authenticateWithBiometrics 
} from '../../services/pinService';
import { AnimatedNotesTitle } from '../../components/AnimatedNotesTitle';
import { NoteBentoCard } from '../../components/NoteBentoCard';
import { CurvedBottomBar } from '../../components/CurvedBottomBar';
import { StealthPinPad } from '../../components/StealthPinPad';
import { 
  Search, 
  RefreshCw, 
  CheckCircle, 
  CloudOff, 
  Lock, 
  FileText, 
  Archive, 
  Trash2,
  X,
  KeyRound
} from 'lucide-react-native';

export type CategoryTab = 'home' | 'vault' | 'archived' | 'trash';

const CATEGORY_TABS: { id: CategoryTab; label: string }[] = [
  { id: 'home', label: 'HOME' },
  { id: 'vault', label: 'VAULT' },
  { id: 'archived', label: 'ARCHIVED' },
  { id: 'trash', label: 'TRASH' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [activeNotes, setActiveNotes] = useState<LocalNote[]>([]);
  const [trashNotes, setTrashNotes] = useState<LocalNote[]>([]);
  const [activeTab, setActiveTab] = useState<CategoryTab>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  // Vault PIN Session State
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pendingNoteToOpen, setPendingNoteToOpen] = useState<LocalNote | null>(null);

  // Sync animation rotation
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (syncState === 'syncing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [syncState, spinAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const loadData = useCallback(async () => {
    try {
      const active = await getActiveNotes();
      const trash = await getTrashNotes();
      setActiveNotes(active);
      setTrashNotes(trash);
    } catch (e) {
      console.warn('Error loading notes:', e);
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

  const handleSelectTab = async (tab: CategoryTab) => {
    if (tab === 'vault' && !isVaultUnlocked) {
      const exists = await hasMasterPin();
      if (!exists) {
        Alert.alert(
          'Stealth PIN Setup Required',
          'You need to create a Stealth PIN first to access the Vault.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Setup PIN', onPress: () => router.push('/(auth)/pin' as any) },
          ]
        );
        return;
      }

      // Try biometrics first for instant smooth unlock
      const bioSuccess = await authenticateWithBiometrics();
      if (bioSuccess) {
        setIsVaultUnlocked(true);
        setActiveTab('vault');
        return;
      }

      // Open Stealth PIN keypad modal
      setIsPinModalOpen(true);
      return;
    }

    // Auto re-lock session when navigating away from vault
    if (activeTab === 'vault' && tab !== 'vault') {
      setIsVaultUnlocked(false);
    }

    setActiveTab(tab);
  };

  const handlePinSuccess = async (enteredPin: string) => {
    if (enteredPin === 'biometrics_authenticated') {
      setIsVaultUnlocked(true);
      setIsPinModalOpen(false);
      setActiveTab('vault');
      if (pendingNoteToOpen) {
        router.push({ pathname: '/(main)/editor' as any, params: { id: pendingNoteToOpen.id } });
        setPendingNoteToOpen(null);
      }
      return;
    }

    const isValid = await verifyMasterPin(enteredPin);
    if (isValid) {
      setIsVaultUnlocked(true);
      setIsPinModalOpen(false);
      setActiveTab('vault');
      if (pendingNoteToOpen) {
        router.push({ pathname: '/(main)/editor' as any, params: { id: pendingNoteToOpen.id } });
        setPendingNoteToOpen(null);
      }
    } else {
      Alert.alert('Incorrect PIN', 'Stealth PIN is incorrect. Try again.');
    }
  };

  const handleOpenNote = async (note: LocalNote) => {
    if (note.is_locked && !isVaultUnlocked) {
      setPendingNoteToOpen(note);
      setIsPinModalOpen(true);
      return;
    }
    router.push({ pathname: '/(main)/editor' as any, params: { id: note.id } });
  };

  const handleDelete = async (noteId: string) => {
    if (activeTab === 'trash') {
      Alert.alert(
        'Permanent Delete',
        'Permanently delete this note? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Forever',
            style: 'destructive',
            onPress: async () => {
              await hardDeleteLocalNote(noteId);
              await loadData();
              syncMobileWithServer().then(loadData);
            },
          },
        ]
      );
    } else {
      await softDeleteLocalNote(noteId);
      await loadData();
      syncMobileWithServer().then(loadData);
    }
  };

  const handleRestore = async (noteId: string) => {
    await restoreLocalNote(noteId);
    await loadData();
    syncMobileWithServer().then(loadData);
  };

  const handleArchiveToggle = async (note: LocalNote) => {
    await toggleArchiveLocalNote(note.id, Boolean(note.is_archived));
    await loadData();
    syncMobileWithServer().then(loadData);
  };

  // Determine which notes to display for current tab
  let displayedNotes: LocalNote[] = [];
  if (activeTab === 'home') {
    displayedNotes = activeNotes.filter(n => !n.is_archived && !n.is_locked);
  } else if (activeTab === 'vault') {
    displayedNotes = isVaultUnlocked ? activeNotes.filter(n => Boolean(n.is_locked)) : [];
  } else if (activeTab === 'archived') {
    displayedNotes = activeNotes.filter(n => Boolean(n.is_archived));
  } else if (activeTab === 'trash') {
    displayedNotes = trashNotes;
  }

  // Filter by search query
  const filteredNotes = displayedNotes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || (n.excerpt || '').toLowerCase().includes(q);
  });

  // Dynamic Bento row grouping:
  // - If a note is alone in its row (e.g. single item, or odd trailing item): 1 full-width card ('full')
  // - If paired: 2 equal compact cards side-by-side ('compact')
  const rows: LocalNote[][] = [];
  for (let i = 0; i < filteredNotes.length; i += 2) {
    if (i + 1 < filteredNotes.length) {
      rows.push([filteredNotes[i], filteredNotes[i + 1]]);
    } else {
      rows.push([filteredNotes[i]]);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header: MY NOTES on left, SYNC on right */}
      <View style={styles.header}>
        <AnimatedNotesTitle />

        <TouchableOpacity 
          style={styles.syncBtn} 
          onPress={onRefresh}
          activeOpacity={0.75}
        >
          <Text style={styles.syncBtnText}>SYNC</Text>
          {syncState === 'syncing' ? (
            <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
              <RefreshCw size={14} color="#F59E0B" />
            </Animated.View>
          ) : syncState === 'idle' ? (
            <CheckCircle size={14} color="#10B981" />
          ) : (
            <CloudOff size={14} color="#64748B" />
          )}
        </TouchableOpacity>
      </View>

      {/* Category Tabs: HOME | VAULT | ARCHIVED | TRASH */}
      <View style={styles.tabsContainer}>
        {CATEGORY_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => handleSelectTab(tab.id)}
              style={[
                styles.tabPill,
                isActive && styles.tabPillActive,
              ]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTab} notes...`}
          placeholderTextColor="#64748B"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Scroll View */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Vault Locked Guard Card */}
        {activeTab === 'vault' && !isVaultUnlocked ? (
          <View style={styles.lockedContainer}>
            <View style={styles.lockedIconCircle}>
              <Lock size={32} color="#F59E0B" />
            </View>
            <Text style={styles.lockedTitle}>Stealth Vault Locked</Text>
            <Text style={styles.lockedSubtitle}>
              Protected with encrypted stealth PIN. Authenticate to view your private notes.
            </Text>
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={() => setIsPinModalOpen(true)}
              activeOpacity={0.85}
            >
              <KeyRound size={16} color="#0B0F19" />
              <Text style={styles.unlockBtnText}>Unlock Vault</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotes.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              {activeTab === 'vault' ? (
                <Lock size={30} color="#F59E0B" />
              ) : activeTab === 'archived' ? (
                <Archive size={30} color="#60A5FA" />
              ) : activeTab === 'trash' ? (
                <Trash2 size={30} color="#F43F5E" />
              ) : (
                <FileText size={30} color="#94A3B8" />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'No matching notes'
                : activeTab === 'vault'
                ? 'Stealth Vault is Empty'
                : activeTab === 'archived'
                ? 'No Archived Notes'
                : activeTab === 'trash'
                ? 'Trash Bin is Empty'
                : 'No Notes Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `No notes match "${searchQuery}". Try a different keyword.`
                : activeTab === 'vault'
                ? 'You have not locked any notes yet.'
                : activeTab === 'archived'
                ? 'Archived notes will be stored here.'
                : activeTab === 'trash'
                ? 'Deleted notes will be preserved here before permanent purge.'
                : 'Tap the + button below to create your very first note.'}
            </Text>
          </View>
        ) : (
          /* Dynamic Bento Grid of Note Cards */
          <View style={styles.gridContainer}>
            {rows.map((row, rowIndex) => {
              // 2 Cards Side-by-Side (Compact)
              if (row.length === 2) {
                return (
                  <View key={`row-${rowIndex}-${row[0].id}-${row[1].id}`} style={styles.rowPair}>
                    <NoteBentoCard
                      note={row[0]}
                      variant="compact"
                      isTrash={activeTab === 'trash'}
                      onPress={() => handleOpenNote(row[0])}
                      onDelete={() => handleDelete(row[0].id)}
                      onArchiveToggle={() => handleArchiveToggle(row[0])}
                      onRestore={() => handleRestore(row[0].id)}
                    />
                    <NoteBentoCard
                      note={row[1]}
                      variant="compact"
                      isTrash={activeTab === 'trash'}
                      onPress={() => handleOpenNote(row[1])}
                      onDelete={() => handleDelete(row[1].id)}
                      onArchiveToggle={() => handleArchiveToggle(row[1])}
                      onRestore={() => handleRestore(row[1].id)}
                    />
                  </View>
                );
              }

              // 1 Card Alone (Full Width / Memanjang)
              return (
                <View key={`row-${rowIndex}-${row[0].id}`} style={styles.rowSingle}>
                  <NoteBentoCard
                    note={row[0]}
                    variant="full"
                    isTrash={activeTab === 'trash'}
                    onPress={() => handleOpenNote(row[0])}
                    onDelete={() => handleDelete(row[0].id)}
                    onArchiveToggle={() => handleArchiveToggle(row[0])}
                    onRestore={() => handleRestore(row[0].id)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Curved Notched Bottom Navigation Bar */}
      <CurvedBottomBar
        onPressAdd={() => router.push('/(main)/editor' as any)}
        onPressAi={() => router.push('/(main)/ai' as any)}
        onPressProfile={() => router.push('/(auth)/server' as any)}
      />

      {/* Stealth Vault PIN Modal */}
      <Modal
        visible={isPinModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsPinModalOpen(false);
          setPendingNoteToOpen(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setIsPinModalOpen(false);
                setPendingNoteToOpen(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>

            <StealthPinPad
              onSuccess={handlePinSuccess}
              title="Stealth Vault PIN"
              subtitle="Enter your stealth PIN to unlock confidential notes"
              allowBiometrics={true}
            />
          </View>
        </View>
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 6,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1.2,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  tabPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  tabLabelActive: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
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
    height: 38,
    color: '#F8FAFC',
    fontSize: 13.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 120, // ensure last card is never covered by curved bottom bar
  },
  gridContainer: {
    width: '100%',
  },
  rowPair: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowSingle: {
    width: '100%',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  lockedContainer: {
    backgroundColor: '#111827',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 28,
    alignItems: 'center',
    marginTop: 20,
  },
  lockedIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  unlockBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0F19',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingTop: 16,
    paddingBottom: 24,
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    padding: 6,
  },
});
