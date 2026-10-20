import React, { useState, useEffect } from 'react';
import { useNotes } from './hooks/useNotes';
import { Header } from './components/Header';
import { BentoGrid } from './components/BentoGrid';
import { NoteEditorModal } from './components/NoteEditorModal';
import { TrashGalleryModal } from './components/TrashGalleryModal';
import { StealthPinModal } from './components/StealthPinModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ServerConnectionModal } from './components/ServerConnectionModal';
import { ProfileModal } from './components/ProfileModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ConfirmLogoutModal } from './components/ConfirmLogoutModal';
import { getSessionUnlockedPin, setSessionUnlockedPin, getStoredPinHash } from './lib/storage';
import { LocalNote } from '@cloudnotes/shared-types';
import { Plus, Bot, Trash2, Search, X } from 'lucide-react';
import { pb } from './lib/pocketbase';
import { useTheme } from './hooks/useTheme';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    activeNotes,
    deletedNotes,
    syncStatus,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    saveNote,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    syncWithServer,
  } = useNotes();

  const [selectedNote, setSelectedNote] = useState<LocalNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTrashGalleryOpen, setIsTrashGalleryOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

  // Vault PIN & Note Protection Modal state
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    mode: 'setup' | 'unlock_note' | 'unlock_vault' | 'change_pin';
    noteToOpen?: LocalNote | null;
    tagToSelect?: string;
  } | null>(null);

  // Lock body scroll when any modal is open to isolate modal and prevent background scrolling
  useEffect(() => {
    const isAnyModalOpen = 
      isEditorOpen || 
      isTrashGalleryOpen || 
      isAiModalOpen || 
      isServerModalOpen || 
      isProfileModalOpen || 
      isLogoutModalOpen || 
      Boolean(pinModalConfig?.isOpen) || 
      Boolean(noteToDeleteId);

    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [
    isEditorOpen,
    isTrashGalleryOpen,
    isAiModalOpen,
    isServerModalOpen,
    isProfileModalOpen,
    isLogoutModalOpen,
    pinModalConfig,
    noteToDeleteId,
  ]);

  const handleOpenNewNote = () => {
    setSelectedNote(null);
    setIsEditorOpen(true);
  };

  const handleOpenNote = (note: LocalNote) => {
    if (note.is_locked) {
      const sessionPin = getSessionUnlockedPin();
      if (sessionPin) {
        setSelectedNote(note);
        setIsEditorOpen(true);
        return;
      }
      const storedHash = getStoredPinHash();
      setPinModalConfig({
        isOpen: true,
        mode: storedHash ? 'unlock_note' : 'setup',
        noteToOpen: note,
      });
      return;
    }
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleSelectTag = (tag: string) => {
    if (tag === 'vault') {
      const storedHash = getStoredPinHash();
      setPinModalConfig({
        isOpen: true,
        mode: storedHash ? 'unlock_vault' : 'setup',
        tagToSelect: 'vault',
      });
      return;
    }
    // Leaving vault - re-lock session so vault is never left open
    if (selectedTag === 'vault') {
      setSessionUnlockedPin(null);
    }
    setSelectedTag(tag);
  };

  const handlePinSuccess = (pin: string) => {
    setSessionUnlockedPin(pin);
    if (pinModalConfig?.noteToOpen) {
      setSelectedNote(pinModalConfig.noteToOpen);
      setIsEditorOpen(true);
    } else if (pinModalConfig?.tagToSelect) {
      setSelectedTag(pinModalConfig.tagToSelect);
    }
    setPinModalConfig(null);
  };

  const handleArchiveToggle = async (note: LocalNote) => {
    await saveNote({
      id: note.id,
      title: note.title,
      content: note.content,
      cover_color: note.cover_color,
      cover_icon: note.cover_icon,
      is_locked: Boolean(note.is_locked),
      is_archived: !Boolean(note.is_archived),
    });
  };

  const handleExecuteLogout = () => {
    pb.authStore.clear();
    setSessionUnlockedPin(null);
    localStorage.removeItem('cloudnotes_cached_notes');
    window.location.href = '/';
  };

  const isLoggedIn = pb.authStore.isValid;

  // Gate-keeper: Open server modal if user tries to access protected features while logged out
  const requireAuth = (action: () => void) => {
    if (!isLoggedIn) {
      setIsServerModalOpen(true);
      return;
    }
    action();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500/25 selection:text-amber-200 relative pb-28 transition-colors duration-200">
      <Header
        selectedTag={selectedTag}
        onSelectTag={handleSelectTag}
        onRequireAuth={requireAuth}
        syncStatus={syncStatus}
        onSyncClick={() => requireAuth(syncWithServer)}
        onOpenProfile={() => {
          if (!isLoggedIn) {
            setIsServerModalOpen(true);
          } else {
            setIsProfileModalOpen(true);
          }
        }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
        {/* Center Search Bar */}
        <div className="-mt-4 sm:mt-2 mb-10 max-w-lg mx-auto w-full px-2 sm:px-0">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100/90 dark:bg-[#141518] border border-slate-300/80 dark:border-neutral-800 text-xs sm:text-sm text-slate-900 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <BentoGrid
          activeNotes={activeNotes}
          onOpenNote={handleOpenNote}
          onDeleteNote={(id) => requireAuth(() => setNoteToDeleteId(id))}
          onArchiveToggle={(note) => requireAuth(() => handleArchiveToggle(note))}
        />
      </main>

      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 flex flex-col items-end space-y-3 pointer-events-auto">
        <div 
          className={`flex items-center space-x-2.5 group cursor-pointer transition-opacity ${
            !isLoggedIn ? 'opacity-65 hover:opacity-100' : ''
          }`}
          onClick={() => requireAuth(() => setIsTrashGalleryOpen(true))}
          title={isLoggedIn ? 'Open Trash Gallery' : 'Sign in to access Trash Bin'}
        >
          <span className="text-xs font-semibold text-rose-700 bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-[#1a1215] dark:border-rose-900/40 px-3 py-1 rounded-full select-none transition-all duration-200 group-hover:-translate-x-1 group-hover:border-rose-400/50 flex items-center space-x-1.5 shadow-sm">
            <span>Trash</span>
            {deletedNotes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold">
                {deletedNotes.length}
              </span>
            )}
          </span>
          <button
            type="button"
            className="w-12 h-12 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 dark:bg-[#1a1215] dark:hover:bg-[#25151c] dark:text-rose-300 dark:hover:text-rose-200 dark:border-rose-900/40 flex items-center justify-center transition-all duration-200 group-hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            aria-label="Trash Bin"
          >
            <Trash2 className="w-5 h-5 stroke-[2] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
          </button>
        </div>

        <div 
          className={`flex items-center space-x-2.5 group cursor-pointer transition-opacity ${
            !isLoggedIn ? 'opacity-65 hover:opacity-100' : ''
          }`}
          onClick={() => requireAuth(() => setIsAiModalOpen(true))}
          title={isLoggedIn ? 'Ask AI Assistant' : 'Sign in to access AI Copilot'}
        >
          <span className="text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 dark:text-purple-300 dark:bg-[#1a1820] dark:border-purple-500/30 px-3 py-1 rounded-full select-none transition-all duration-200 group-hover:-translate-x-1 group-hover:border-purple-400/50 shadow-sm">
            Ask AI
          </span>
          <button
            type="button"
            className="w-12 h-12 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 dark:bg-[#1c1824] dark:hover:bg-[#272133] dark:text-purple-300 dark:hover:text-purple-100 dark:border-purple-500/40 flex items-center justify-center transition-all duration-200 group-hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            aria-label="Ask AI"
          >
            <Bot className="w-5 h-5 stroke-[2] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
          </button>
        </div>

        <button
          onClick={handleOpenNewNote}
          className="group w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 flex items-center justify-center border-2 border-amber-300/40 shadow-lg shadow-amber-500/25 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Create New Note"
          aria-label="New Note"
        >
          <Plus className="w-7 h-7 stroke-[3] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90 group-active:rotate-180" />
        </button>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenPinSetup={() => {
          const storedHash = getStoredPinHash();
          setPinModalConfig({ 
            isOpen: true, 
            mode: storedHash ? 'change_pin' : 'setup' 
          });
        }}
        onOpenServerSettings={() => setIsServerModalOpen(true)}
        onLogout={() => setIsLogoutModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <NoteEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        note={selectedNote}
        onSave={saveNote}
        onDelete={moveToTrash}
        syncStatus={syncStatus}
      />

      <TrashGalleryModal
        isOpen={isTrashGalleryOpen}
        onClose={() => setIsTrashGalleryOpen(false)}
        trashNotes={deletedNotes}
        onRestore={restoreFromTrash}
        onPermanentDelete={permanentlyDelete}
        onEmptyTrash={emptyTrash}
      />

      <StealthPinModal
        isOpen={Boolean(pinModalConfig?.isOpen)}
        onClose={() => setPinModalConfig(null)}
        mode={pinModalConfig?.mode || 'setup'}
        onSuccess={handlePinSuccess}
      />

      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeNotes={activeNotes}
        currentNote={selectedNote}
      />

      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onAuthChange={syncWithServer}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(noteToDeleteId)}
        onClose={() => setNoteToDeleteId(null)}
        onConfirm={() => {
          if (noteToDeleteId) {
            moveToTrash(noteToDeleteId);
            setNoteToDeleteId(null);
          }
        }}
      />

      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleExecuteLogout}
      />
    </div>
  );
};
