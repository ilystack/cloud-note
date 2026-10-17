import React, { useState } from 'react';
import { useNotes } from './hooks/useNotes';
import { Header } from './components/Header';
import { BentoGrid } from './components/BentoGrid';
import { NoteEditorModal } from './components/NoteEditorModal';
import { TrashGalleryModal } from './components/TrashGalleryModal';
import { StealthPinModal } from './components/StealthPinModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ServerConnectionModal } from './components/ServerConnectionModal';
import { LocalNote } from '@cloudnotes/shared-types';

export const App: React.FC = () => {
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

  // Modals state
  const [selectedNote, setSelectedNote] = useState<LocalNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTrashGalleryOpen, setIsTrashGalleryOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  // New Note Action
  const handleOpenNewNote = () => {
    setSelectedNote(null);
    setIsEditorOpen(true);
  };

  // Open Existing Note
  const handleOpenNote = (note: LocalNote) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  // Archive Toggle
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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Glassmorphic Navigation Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        syncStatus={syncStatus}
        onSyncClick={syncWithServer}
        onNewNote={handleOpenNewNote}
        onOpenAi={() => setIsAiModalOpen(true)}
        onOpenVault={() => setIsVaultModalOpen(true)}
        onOpenServerModal={() => setIsServerModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8">
        {/* Banner Section */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {selectedTag === 'archived' ? 'Archived Notes' : 'Personal Vault Notes'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {activeNotes.length} active notes • End-to-end client encrypted • Native lossless storage
            </p>
          </div>
        </div>

        {/* Bento Grid */}
        <BentoGrid
          activeNotes={activeNotes}
          deletedNotesCount={deletedNotes.length}
          onOpenNote={handleOpenNote}
          onDeleteNote={moveToTrash}
          onArchiveToggle={handleArchiveToggle}
          onOpenTrashGallery={() => setIsTrashGalleryOpen(true)}
        />
      </main>

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        note={selectedNote}
        onSave={saveNote}
        onDelete={moveToTrash}
      />

      {/* Trash Bin Bento Gallery Modal */}
      <TrashGalleryModal
        isOpen={isTrashGalleryOpen}
        onClose={() => setIsTrashGalleryOpen(false)}
        trashNotes={deletedNotes}
        onRestore={restoreFromTrash}
        onPermanentDelete={permanentlyDelete}
        onEmptyTrash={emptyTrash}
      />

      {/* Stealth Vault Security PIN Modal */}
      <StealthPinModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        mode="setup"
        onSuccess={() => {}}
      />

      {/* AI Assistant Modal (BYOK) */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeNotes={activeNotes}
        currentNote={selectedNote}
      />

      {/* Server Connection & Auth Modal */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onAuthChange={syncWithServer}
      />
    </div>
  );
};
