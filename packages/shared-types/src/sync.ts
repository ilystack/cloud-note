/**
 * Sync Protocol & Conflict Resolution Engine
 * Spec: Deterministic Last-Write-Wins (LWW) + Anti-Data-Loss Protection
 */

import { Note, LocalNote, noteToLocalNote, localNoteToNote } from './note';

export type ConflictResolutionResult = 
  | { action: 'push_local_to_remote'; noteToPush: Note }
  | { action: 'update_local_from_remote'; updatedLocal: LocalNote }
  | { action: 'no_op' };

/**
 * Compare local and remote note versions and timestamps to resolve conflicts
 */
export function resolveNoteConflict(local: LocalNote, remote: Note): ConflictResolutionResult {
  const localTime = new Date(local.client_updated_at).getTime() || 0;
  const remoteTime = new Date(remote.client_updated_at).getTime() || 0;

  // If local is marked for pending delete, local takes precedence to delete remotely
  if (local.sync_status === 'pending_delete') {
    return { action: 'no_op' };
  }

  // If local has local edits pending upload
  if (local.sync_status === 'pending_upload') {
    // If local was edited more recently or has higher version
    if (localTime >= remoteTime || local.version > remote.version) {
      const noteToPush = localNoteToNote(local, remote.user_id);
      // Increment version for remote
      noteToPush.version = Math.max(local.version, remote.version) + 1;
      return { action: 'push_local_to_remote', noteToPush };
    }
    // If remote was updated more recently on another device (e.g. Web while Mobile was offline)
    const updatedLocal = noteToLocalNote(remote, 'synced');
    return { action: 'update_local_from_remote', updatedLocal };
  }

  // If local is already synced
  if (remoteTime > localTime || remote.version > local.version) {
    const updatedLocal = noteToLocalNote(remote, 'synced');
    return { action: 'update_local_from_remote', updatedLocal };
  }

  return { action: 'no_op' };
}

/**
 * Filter safe notes to display in Active Grid vs Trash Grid
 */
export function partitionNotes(notes: (Note | LocalNote)[]) {
  const active: (Note | LocalNote)[] = [];
  const trash: (Note | LocalNote)[] = [];

  for (const n of notes) {
    const isDeleted = 'is_deleted' in n ? Boolean(n.is_deleted) : false;
    if (isDeleted) {
      trash.push(n);
    } else {
      active.push(n);
    }
  }

  return { active, trash };
}
