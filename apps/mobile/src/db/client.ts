import * as SQLite from 'expo-sqlite';
import { LocalNote } from '@cloudnotes/shared-types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('cloudnotes.db');
    await initSchema(dbInstance);
  }
  return dbInstance;
}

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS local_notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      cover_color TEXT NOT NULL,
      cover_icon TEXT NOT NULL DEFAULT 'file-text',
      content TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      is_locked INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      client_updated_at TEXT NOT NULL,
      attachments_json TEXT DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_local_notes_sync ON local_notes(sync_status);
    CREATE INDEX IF NOT EXISTS idx_local_notes_deleted ON local_notes(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_local_notes_updated ON local_notes(client_updated_at DESC);
  `);
}

export async function getActiveNotes(): Promise<LocalNote[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalNote>(
    'SELECT * FROM local_notes WHERE is_deleted = 0 ORDER BY client_updated_at DESC'
  );
  return rows;
}

export async function getTrashNotes(): Promise<LocalNote[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalNote>(
    'SELECT * FROM local_notes WHERE is_deleted = 1 ORDER BY deleted_at DESC'
  );
  return rows;
}

export async function upsertLocalNote(note: LocalNote): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO local_notes (
      id, title, cover_color, cover_icon, content, excerpt,
      is_locked, is_archived, is_deleted, deleted_at,
      sync_status, version, updated_at, client_updated_at, attachments_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      cover_color = excluded.cover_color,
      cover_icon = excluded.cover_icon,
      content = excluded.content,
      excerpt = excluded.excerpt,
      is_locked = excluded.is_locked,
      is_archived = excluded.is_archived,
      is_deleted = excluded.is_deleted,
      deleted_at = excluded.deleted_at,
      sync_status = excluded.sync_status,
      version = excluded.version,
      updated_at = excluded.updated_at,
      client_updated_at = excluded.client_updated_at,
      attachments_json = excluded.attachments_json`,
    [
      note.id,
      note.title,
      note.cover_color,
      note.cover_icon,
      note.content,
      note.excerpt,
      note.is_locked,
      note.is_archived,
      note.is_deleted,
      note.deleted_at,
      note.sync_status,
      note.version,
      note.updated_at,
      note.client_updated_at,
      note.attachments_json || '[]',
    ]
  );
}

export async function softDeleteLocalNote(noteId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE local_notes SET 
      is_deleted = 1, 
      deleted_at = ?, 
      sync_status = 'pending_upload',
      client_updated_at = ?
    WHERE id = ?`,
    [now, now, noteId]
  );
}

export async function restoreLocalNote(noteId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE local_notes SET 
      is_deleted = 0, 
      deleted_at = NULL, 
      sync_status = 'pending_upload',
      client_updated_at = ?
    WHERE id = ?`,
    [now, noteId]
  );
}

export async function toggleArchiveLocalNote(noteId: string, currentArchived: boolean): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const nextVal = currentArchived ? 0 : 1;
  await db.runAsync(
    `UPDATE local_notes SET 
      is_archived = ?, 
      sync_status = 'pending_upload',
      client_updated_at = ?
    WHERE id = ?`,
    [nextVal, now, noteId]
  );
}

export async function hardDeleteLocalNote(noteId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM local_notes WHERE id = ?', [noteId]);
}

export async function getPendingSyncNotes(): Promise<LocalNote[]> {
  const db = await getDb();
  return db.getAllAsync<LocalNote>(
    "SELECT * FROM local_notes WHERE sync_status != 'synced'"
  );
}
