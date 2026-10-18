import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LocalNote, 
  Note, 
  noteToLocalNote, 
  localNoteToNote, 
  generateExcerpt, 
  encryptNoteContent,
  resolveNoteConflict 
} from '@cloudnotes/shared-types';
import { pb } from '../lib/pocketbase';
import { getCachedNotes, setCachedNotes } from '../lib/storage';

export function useNotes() {
  const [notes, setNotes] = useState<LocalNote[]>(() => getCachedNotes());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('home');

  useEffect(() => {
    setCachedNotes(notes);
  }, [notes]);

  const syncWithServer = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setSyncStatus('offline');
      return;
    }

    try {
      setSyncStatus('syncing');

      // 1. Process pending offline notes first
      const currentNotes = getCachedNotes();
      for (const local of currentNotes) {
        if (local.sync_status === 'pending_upload') {
          const remotePayload = localNoteToNote(local, pb.authStore.model?.id);
          if (local.id.startsWith('local_')) {
            try {
              const created = await pb.collection('notes').create<Note>(remotePayload);
              setNotes(prev => prev.map(n => n.id === local.id ? noteToLocalNote(created, 'synced') : n));
            } catch (err) {
              console.warn('Failed to create offline note on server:', err);
            }
          } else {
            try {
              const updated = await pb.collection('notes').update<Note>(local.id, remotePayload);
              setNotes(prev => prev.map(n => n.id === local.id ? noteToLocalNote(updated, 'synced') : n));
            } catch (err) {
              console.warn('Failed to update note on server:', err);
            }
          }
        } else if (local.sync_status === 'pending_delete' && !local.id.startsWith('local_')) {
          try {
            await pb.collection('notes').delete(local.id);
          } catch (err) {
            console.warn('Failed to delete note on server:', err);
          }
        }
      }

      // 2. Fetch all remote notes
      const records = await pb.collection('notes').getFullList<Note>({
        sort: '-client_updated_at',
      });

      setNotes((prevNotes) => {
        const localMap = new Map<string, LocalNote>(prevNotes.map(n => [n.id, n]));
        const updatedList: LocalNote[] = [];

        for (const remote of records) {
          const existing = localMap.get(remote.id);
          if (!existing) {
            updatedList.push(noteToLocalNote(remote, 'synced'));
          } else {
            const resolution = resolveNoteConflict(existing, remote);
            if (resolution.action === 'update_local_from_remote') {
              updatedList.push(resolution.updatedLocal);
            } else if (resolution.action === 'push_local_to_remote') {
              pb.collection('notes').update(remote.id, resolution.noteToPush).catch(console.error);
              updatedList.push({ ...existing, sync_status: 'synced' });
            } else {
              updatedList.push(existing);
            }
            localMap.delete(remote.id);
          }
        }

        // Anti-data-loss: Keep local notes that haven't been pushed yet (e.g. offline created)
        for (const [_, remaining] of localMap) {
          if (remaining.sync_status === 'pending_upload' || remaining.id.startsWith('local_')) {
            updatedList.push(remaining);
          }
        }

        return updatedList;
      });

      setSyncStatus('synced');
    } catch (err) {
      console.warn('Failed to sync with PocketBase:', err);
      setSyncStatus('offline');
    }
  }, []);

  // Realtime subscription via SSE
  useEffect(() => {
    syncWithServer();

    if (pb.authStore.isValid) {
      pb.collection('notes').subscribe<Note>('*', (e) => {
        if (e.action === 'create' || e.action === 'update') {
          const remote = e.record;
          setNotes((prev) => {
            const idx = prev.findIndex(n => n.id === remote.id);
            const local = noteToLocalNote(remote, 'synced');
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = local;
              return updated;
            }
            return [local, ...prev];
          });
        } else if (e.action === 'delete') {
          setNotes(prev => prev.filter(n => n.id !== e.record.id));
        }
      }).catch(console.error);
    }

    return () => {
      pb.collection('notes').unsubscribe('*').catch(() => {});
    };
  }, [syncWithServer]);

  const saveNote = useCallback(async (noteData: Partial<Note> & { id?: string }, lockPin?: string) => {
    const isNew = !noteData.id;
    const noteId = noteData.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    let contentToStore = noteData.content || '';
    let isLocked = Boolean(noteData.is_locked);

    // If locked and pin provided, encrypt content
    if (isLocked && lockPin) {
      contentToStore = await encryptNoteContent(contentToStore, lockPin);
    }

    const localNote: LocalNote = {
      id: noteId,
      title: (noteData.title && noteData.title.trim()) || 'Untitled Note',
      cover_color: noteData.cover_color || '#F59E0B',
      cover_icon: noteData.cover_icon || 'file-text',
      content: contentToStore,
      excerpt: generateExcerpt(contentToStore, isLocked),
      is_locked: isLocked ? 1 : 0,
      is_archived: noteData.is_archived ? 1 : 0,
      is_deleted: 0,
      deleted_at: null,
      sync_status: 'pending_upload',
      version: (noteData.version || 0) + 1,
      updated_at: now,
      client_updated_at: now,
      attachments_json: JSON.stringify(noteData.attachments || []),
    };

    setNotes((prev) => {
      const idx = prev.findIndex(n => n.id === noteId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = localNote;
        return copy;
      }
      return [localNote, ...prev];
    });

    if (pb.authStore.isValid) {
      try {
        const payload = localNoteToNote(localNote, pb.authStore.model?.id);
        if (isNew || noteId.startsWith('local_')) {
          const created = await pb.collection('notes').create<Note>(payload);
          setNotes(prev => prev.map(n => n.id === noteId ? noteToLocalNote(created, 'synced') : n));
        } else {
          const updated = await pb.collection('notes').update<Note>(noteId, payload);
          setNotes(prev => prev.map(n => n.id === noteId ? noteToLocalNote(updated, 'synced') : n));
        }
      } catch (err) {
        console.warn('Saved offline, will sync later:', err);
      }
    }
  }, []);

  const moveToTrash = useCallback(async (noteId: string) => {
    const now = new Date().toISOString();
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          is_deleted: 1,
          deleted_at: now,
          sync_status: 'pending_upload',
          client_updated_at: now,
        };
      }
      return n;
    }));

    if (pb.authStore.isValid && !noteId.startsWith('local_')) {
      try {
        await pb.collection('notes').update(noteId, {
          is_deleted: true,
          deleted_at: now,
          client_updated_at: now,
        });
      } catch (err) {
        console.warn('Soft-delete queued for background sync:', err);
      }
    }
  }, []);

  const restoreFromTrash = useCallback(async (noteId: string) => {
    const now = new Date().toISOString();
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          is_deleted: 0,
          deleted_at: null,
          sync_status: 'pending_upload',
          client_updated_at: now,
        };
      }
      return n;
    }));

    if (pb.authStore.isValid && !noteId.startsWith('local_')) {
      try {
        await pb.collection('notes').update(noteId, {
          is_deleted: false,
          deleted_at: null,
          client_updated_at: now,
        });
      } catch (err) {
        console.warn('Restore queued for background sync:', err);
      }
    }
  }, []);

  const permanentlyDelete = useCallback(async (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));

    if (pb.authStore.isValid && !noteId.startsWith('local_')) {
      try {
        await pb.collection('notes').delete(noteId);
      } catch (err) {
        console.warn('Server permanent delete error:', err);
      }
    }
  }, []);

  const emptyTrash = useCallback(async () => {
    const trashItems = notes.filter(n => n.is_deleted === 1);
    setNotes(prev => prev.filter(n => n.is_deleted === 0));

    if (pb.authStore.isValid) {
      for (const item of trashItems) {
        if (!item.id.startsWith('local_')) {
          pb.collection('notes').delete(item.id).catch(console.error);
        }
      }
    }
  }, [notes]);

  const activeNotes = useMemo(() => {
    return notes
      .filter(n => n.is_deleted === 0)
      .filter(n => {
        if (selectedTag === 'vault') {
          return n.is_archived === 0 && Boolean(n.is_locked);
        }
        if (selectedTag === 'archive' || selectedTag === 'archived') {
          return Boolean(n.is_archived);
        }
        return n.is_archived === 0;
      })
      .filter(n => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.client_updated_at).getTime() - new Date(a.client_updated_at).getTime());
  }, [notes, selectedTag, searchQuery]);

  const deletedNotes = useMemo(() => {
    return notes
      .filter(n => n.is_deleted === 1)
      .sort((a, b) => new Date(b.deleted_at || b.client_updated_at).getTime() - new Date(a.deleted_at || a.client_updated_at).getTime());
  }, [notes]);

  return {
    notes,
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
  };
}
