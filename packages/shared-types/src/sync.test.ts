import { describe, it, expect } from 'vitest';
import { resolveNoteConflict, partitionNotes } from './sync';
import { LocalNote, Note, noteToLocalNote } from './note';

describe('Sync Protocol & Conflict Resolution', () => {
  const baseRemote: Note = {
    id: 'note_1234567890',
    title: 'Remote Title',
    cover_color: '#F59E0B',
    cover_icon: 'file-text',
    content: 'Remote content',
    excerpt: 'Remote content',
    is_locked: false,
    is_archived: false,
    is_deleted: false,
    deleted_at: null,
    version: 2,
    client_updated_at: '2026-10-18T00:00:00.000Z',
  };

  it('should push local to remote if local has newer timestamp and pending_upload', () => {
    const local: LocalNote = {
      ...noteToLocalNote(baseRemote, 'pending_upload'),
      title: 'Local Newer Title',
      client_updated_at: '2026-10-18T01:00:00.000Z',
    };

    const result = resolveNoteConflict(local, baseRemote);
    expect(result.action).toBe('push_local_to_remote');
    if (result.action === 'push_local_to_remote') {
      expect(result.noteToPush.title).toBe('Local Newer Title');
      expect(result.noteToPush.version).toBe(3); // Bumped version
    }
  });

  it('should update local from remote if remote is newer', () => {
    const local: LocalNote = {
      ...noteToLocalNote(baseRemote, 'synced'),
      title: 'Older Local Title',
      client_updated_at: '2026-10-17T00:00:00.000Z',
    };

    const result = resolveNoteConflict(local, baseRemote);
    expect(result.action).toBe('update_local_from_remote');
    if (result.action === 'update_local_from_remote') {
      expect(result.updatedLocal.title).toBe('Remote Title');
      expect(result.updatedLocal.sync_status).toBe('synced');
    }
  });

  it('should partition notes into active and trash correctly', () => {
    const notes = [
      { id: '1', title: 'Active 1', is_deleted: false },
      { id: '2', title: 'Trash 1', is_deleted: true },
      { id: '3', title: 'Active 2', is_deleted: false },
    ] as (Note | LocalNote)[];

    const { active, trash } = partitionNotes(notes);
    expect(active.length).toBe(2);
    expect(trash.length).toBe(1);
    expect(trash[0].id).toBe('2');
  });
});
