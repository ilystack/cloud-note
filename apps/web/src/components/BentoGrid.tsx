import React from 'react';
import { LocalNote } from '@cloudnotes/shared-types';
import { NoteCard } from './NoteCard';
import { TrashBentoCard } from './TrashBentoCard';

interface BentoGridProps {
  activeNotes: LocalNote[];
  deletedNotesCount: number;
  onOpenNote: (note: LocalNote) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveToggle: (note: LocalNote) => void;
  onOpenTrashGallery: () => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  activeNotes,
  deletedNotesCount,
  onOpenNote,
  onDeleteNote,
  onArchiveToggle,
  onOpenTrashGallery,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* 1. Active Notes */}
      {activeNotes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onClick={() => onOpenNote(note)}
          onDelete={(e) => {
            e.stopPropagation();
            onDeleteNote(note.id);
          }}
          onArchiveToggle={(e) => {
            e.stopPropagation();
            onArchiveToggle(note);
          }}
        />
      ))}

      {/* 2. Trash Bento Card: ALWAYS in last position (N+1), or first if activeNotes is empty (N=0) */}
      <TrashBentoCard
        count={deletedNotesCount}
        onClick={onOpenTrashGallery}
        isOnlyCard={activeNotes.length === 0}
      />
    </div>
  );
};
