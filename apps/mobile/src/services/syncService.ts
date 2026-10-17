import { 
  Note, 
  LocalNote, 
  noteToLocalNote, 
  localNoteToNote, 
  resolveNoteConflict 
} from '@cloudnotes/shared-types';
import { getPocketBase } from './api';
import { 
  getDb, 
  upsertLocalNote, 
  hardDeleteLocalNote, 
  getPendingSyncNotes 
} from '../db/client';

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

let syncStateListener: ((state: SyncState) => void) | null = null;
let currentSyncState: SyncState = 'idle';

export function setSyncState(state: SyncState) {
  currentSyncState = state;
  if (syncStateListener) {
    syncStateListener(state);
  }
}

export function subscribeSyncState(listener: (state: SyncState) => void) {
  syncStateListener = listener;
  listener(currentSyncState);
  return () => {
    syncStateListener = null;
  };
}

/**
 * Execute full bidirectional sync with anti-data-loss protection
 */
export async function syncMobileWithServer(): Promise<void> {
  const pb = await getPocketBase();
  if (!pb.authStore.isValid) {
    setSyncState('offline');
    return;
  }

  try {
    setSyncState('syncing');
    const db = await getDb();

    // 1. Process pending local uploads / deletions
    const pending = await getPendingSyncNotes();
    for (const local of pending) {
      if (local.sync_status === 'pending_delete') {
        if (!local.id.startsWith('local_')) {
          try {
            await pb.collection('notes').delete(local.id);
          } catch (e) {
            console.warn('Remote deletion error:', e);
          }
        }
        await hardDeleteLocalNote(local.id);
      } else if (local.sync_status === 'pending_upload') {
        try {
          const payload = localNoteToNote(local, pb.authStore.model?.id);
          if (local.id.startsWith('local_')) {
            // Create on server
            const created = await pb.collection('notes').create<Note>(payload);
            // Replace local record with remote ID
            await hardDeleteLocalNote(local.id);
            await upsertLocalNote(noteToLocalNote(created, 'synced'));
          } else {
            // Update on server
            const updated = await pb.collection('notes').update<Note>(local.id, payload);
            await upsertLocalNote(noteToLocalNote(updated, 'synced'));
          }
        } catch (err) {
          console.warn('Failed to push note to server:', err);
        }
      }
    }

    // 2. Fetch all remote notes
    const remoteNotes = await pb.collection('notes').getFullList<Note>({
      sort: '-client_updated_at',
    });

    const localRows = await db.getAllAsync<LocalNote>('SELECT * FROM local_notes');
    const localMap = new Map<string, LocalNote>(localRows.map(n => [n.id, n]));

    for (const remote of remoteNotes) {
      const existing = localMap.get(remote.id);
      if (!existing) {
        // Insert new remote note locally
        await upsertLocalNote(noteToLocalNote(remote, 'synced'));
      } else {
        const resolution = resolveNoteConflict(existing, remote);
        if (resolution.action === 'update_local_from_remote') {
          await upsertLocalNote(resolution.updatedLocal);
        } else if (resolution.action === 'push_local_to_remote') {
          // Local is newer: push to server
          try {
            await pb.collection('notes').update(remote.id, resolution.noteToPush);
            await upsertLocalNote({ ...existing, sync_status: 'synced', version: resolution.noteToPush.version });
          } catch (e) {
            console.warn('Failed to push LWW local to server:', e);
          }
        }
        localMap.delete(remote.id);
      }
    }

    // Anti-Data-Loss: Any remaining notes in localMap are retained! Never deleted blindly.
    setSyncState('idle');
  } catch (err) {
    console.warn('Sync error:', err);
    setSyncState('error');
  }
}
