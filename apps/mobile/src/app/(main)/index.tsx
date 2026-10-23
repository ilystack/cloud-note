import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Easing,
  AppState
} from 'react-native';
import { BlurView } from 'expo-blur';
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
import { getPocketBase } from '../../services/api';
import { 
  hasMasterPin, 
  verifyMasterPin, 
  authenticateWithBiometrics 
} from '../../services/pinService';
import { AnimatedNotesTitle } from '../../components/AnimatedNotesTitle';
import { PillFilterTabs, CategoryTab } from '../../components/PillFilterTabs';
import { NoteBentoCard } from '../../components/NoteBentoCard';
import { CurvedBottomBar } from '../../components/CurvedBottomBar';
import { StealthPinPad } from '../../components/StealthPinPad';
import { ServerModal } from '../../components/ServerModal';
import { AiModal } from '../../components/AiModal';
import { SearchModal } from '../../components/SearchModal';
import { NoteEditorModal } from '../../components/NoteEditorModal';
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

export default function DashboardScreen() {
  const [activeNotes, setActiveNotes] = useState<LocalNote[]>([]);
  const [trashNotes, setTrashNotes] = useState<LocalNote[]>([]);
  const [activeTab, setActiveTab] = useState<CategoryTab>('home');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  // In-App Modals
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<LocalNote | null>(null);

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

    // Auto-sync when app returns to foreground from background/offline
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncMobileWithServer().then(loadData);
      }
    });

    // Periodic heartbeat sync every 25 seconds
    const interval = setInterval(() => {
      syncMobileWithServer().then(loadData);
    }, 25000);

    return () => {
      unsub();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncMobileWithServer();
    await loadData();
    setRefreshing(false);
  };

  // Auth Gatekeeper matching Web: if not logged in, prompt Server Login modal
  const requireAuth = async (action: () => void) => {
    const pb = await getPocketBase();
    if (!pb.authStore.isValid) {
      setIsServerModalOpen(true);
      return;
    }
    action();
  };

  const handleSelectTab = async (tab: CategoryTab) => {
    if (tab === 'vault') {
      const pb = await getPocketBase();
      if (!pb.authStore.isValid) {
        setIsServerModalOpen(true);
        return;
      }

      if (!isVaultUnlocked) {
        const exists = await hasMasterPin();
        if (!exists) {
          setIsPinModalOpen(true);
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
        setEditingNote(pendingNoteToOpen);
        setIsEditorOpen(true);
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
        setEditingNote(pendingNoteToOpen);
        setIsEditorOpen(true);
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
    setEditingNote(note);
    setIsEditorOpen(true);
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

  // Dynamic Bento row grouping:
  // - If a note is alone in its row (e.g. single item, or odd trailing item): 1 full-width card ('full')
  // - If paired: 2 equal compact cards side-by-side ('compact')
  const rows: LocalNote[][] = [];
  for (let i = 0; i < displayedNotes.length; i += 2) {
    if (i + 1 < displayedNotes.length) {
      rows.push([displayedNotes[i], displayedNotes[i + 1]]);
    } else {
      rows.push([displayedNotes[i]]);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header: My Notes on left, Search Icon & Sync Status on right */}
      <View style={styles.header}>
        <AnimatedNotesTitle />

        <View style={styles.headerRightActions}>
          {/* Search Icon Button: Opens Full-Screen Search View */}
          <TouchableOpacity 
            style={styles.searchIconBtn} 
            onPress={() => setIsSearchModalOpen(true)}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Sync Status Button */}
          <TouchableOpacity 
            style={styles.syncStatusWidget} 
            onPress={onRefresh}
            activeOpacity={0.75}
          >
            {syncState === 'syncing' ? (
              <>
                <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                  <RefreshCw size={13} color="#F59E0B" />
                </Animated.View>
                <Text style={[styles.syncStatusText, { color: '#F59E0B' }]}>Syncing...</Text>
              </>
            ) : syncState === 'idle' ? (
              <>
                <CheckCircle size={13} color="#10B981" />
                <Text style={[styles.syncStatusText, { color: '#10B981' }]}>Synced</Text>
              </>
            ) : (
              <>
                <CloudOff size={13} color="#64748B" />
                <Text style={[styles.syncStatusText, { color: '#64748B' }]}>Offline</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs: Clean row with active pill only, NO background container */}
      <PillFilterTabs
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

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
              onPress={() => requireAuth(() => setIsPinModalOpen(true))}
              activeOpacity={0.85}
            >
              <KeyRound size={16} color="#121214" />
              <Text style={styles.unlockBtnText}>Unlock Vault</Text>
            </TouchableOpacity>
          </View>
        ) : displayedNotes.length === 0 ? (
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
              {activeTab === 'vault'
                ? 'Stealth Vault is Empty'
                : activeTab === 'archived'
                ? 'No Archived Notes'
                : activeTab === 'trash'
                ? 'Trash Bin is Empty'
                : 'No Notes Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'vault'
                ? 'You have not locked any notes yet.'
                : activeTab === 'archived'
                ? 'Notes you archive will appear here.'
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
                      isVaultUnlocked={isVaultUnlocked}
                      onPress={() => handleOpenNote(row[0])}
                      onDelete={() => handleDelete(row[0].id)}
                      onArchiveToggle={() => handleArchiveToggle(row[0])}
                      onRestore={() => handleRestore(row[0].id)}
                    />
                    <NoteBentoCard
                      note={row[1]}
                      variant="compact"
                      isTrash={activeTab === 'trash'}
                      isVaultUnlocked={isVaultUnlocked}
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
                    isVaultUnlocked={isVaultUnlocked}
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

      {/* Floating Curved Notched Bottom Navigation Bar with Deep Scoop & Big 72px FAB */}
      <CurvedBottomBar
        onPressAdd={() => {
          setEditingNote(null);
          setIsEditorOpen(true);
        }}
        onPressAi={() => requireAuth(() => setIsAiModalOpen(true))}
        onPressProfile={() => setIsServerModalOpen(true)}
      />

      {/* Full-Screen Search Modal */}
      <SearchModal
        visible={isSearchModalOpen}
        notes={activeNotes}
        isVaultUnlocked={isVaultUnlocked}
        onClose={() => setIsSearchModalOpen(false)}
        onOpenNote={handleOpenNote}
        onDeleteNote={handleDelete}
        onArchiveToggle={handleArchiveToggle}
      />

      {/* Server & Profile Modal (Auth Gatekeeper & Account Settings) */}
      <ServerModal
        visible={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onLoginSuccess={loadData}
      />

      {/* AI Assistant In-App Modal */}
      <AiModal
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
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
          <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setIsPinModalOpen(false);
              setPendingNoteToOpen(null);
            }}
            activeOpacity={1}
          />
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
      {/* Full-Screen Note Editor Modal (Slides up from bottom natively like login modal) */}
      <NoteEditorModal
        visible={isEditorOpen}
        note={editingNote}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
        onSaveSuccess={loadData}
        onDeleteSuccess={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8, // shifted title upward slightly
    paddingBottom: 10,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  searchIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#18191D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  syncStatusWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18191D',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  syncStatusText: {
    fontSize: 11,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 130, // room for floating curved bar
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
    backgroundColor: '#18191D',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F4F4F5',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 19,
  },
  lockedContainer: {
    backgroundColor: '#18191D',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#27272A',
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
    color: '#F4F4F5',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 13,
    color: '#A1A1AA',
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
    backgroundColor: 'rgba(3, 7, 18, 0.45)',
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
