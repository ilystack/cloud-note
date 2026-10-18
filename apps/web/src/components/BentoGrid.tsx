import React from 'react';
import { LocalNote } from '@cloudnotes/shared-types';
import { NoteCard } from './NoteCard';
import { FileText } from 'lucide-react';

interface BentoGridProps {
  activeNotes: LocalNote[];
  onOpenNote: (note: LocalNote) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveToggle: (note: LocalNote) => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  activeNotes,
  onOpenNote,
  onDeleteNote,
  onArchiveToggle,
}) => {
  if (activeNotes.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-[#16171b] border border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 mb-3">
          <FileText className="w-5 h-5 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          No notes yet
        </h4>
        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-xs">
          Start capturing ideas or documents by clicking the (+) button.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
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
    </div>
  );
};
