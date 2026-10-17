/**
 * Domain entities and types for CloudNotes (Web, Mobile, Server)
 */

export type SyncStatus = 'synced' | 'pending_upload' | 'pending_delete';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: Point[];
}

export interface DrawingData {
  strokes: Stroke[];
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * PocketBase / Remote Note Record
 */
export interface Note {
  id: string;
  user_id?: string;
  title: string;
  cover_color: string;
  cover_icon: string;
  content: string;
  excerpt: string;
  attachments?: string[];
  is_locked: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  deleted_at?: string | null;
  version: number;
  client_updated_at: string;
  created?: string;
  updated?: string;
}

/**
 * SQLite Local Note representation on Mobile (and local cache on Web)
 */
export interface LocalNote {
  id: string;
  title: string;
  cover_color: string;
  cover_icon: string;
  content: string;
  excerpt: string;
  is_locked: number; // 0 or 1 in SQLite
  is_archived: number; // 0 or 1
  is_deleted: number; // 0 or 1
  deleted_at: string | null;
  sync_status: SyncStatus;
  version: number;
  updated_at: string;
  client_updated_at: string;
  attachments_json?: string; // Serialized string[] for SQLite
}

export const ENCRYPTED_EXCERPT_PLACEHOLDER = '[Encrypted Note]';
export const ENCRYPTION_PREFIX = 'enc:v1:';

/**
 * Helper to check if a content string is encrypted
 */
export function isEncryptedContent(content: string): boolean {
  return typeof content === 'string' && content.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Extract clean plain text excerpt from HTML/text content
 */
export function generateExcerpt(content: string, isLocked: boolean, maxLength: number = 180): string {
  if (isLocked || isEncryptedContent(content)) {
    return ENCRYPTED_EXCERPT_PLACEHOLDER;
  }
  // Remove HTML tags
  const clean = content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) {
    return clean;
  }
  return clean.slice(0, maxLength) + '...';
}

/**
 * Convert remote PocketBase Note to LocalNote
 */
export function noteToLocalNote(note: Note, syncStatus: SyncStatus = 'synced'): LocalNote {
  return {
    id: note.id,
    title: note.title || 'Untitled Note',
    cover_color: note.cover_color || '#F59E0B',
    cover_icon: note.cover_icon || 'file-text',
    content: note.content || '',
    excerpt: note.excerpt || generateExcerpt(note.content || '', note.is_locked),
    is_locked: note.is_locked ? 1 : 0,
    is_archived: note.is_archived ? 1 : 0,
    is_deleted: note.is_deleted ? 1 : 0,
    deleted_at: note.deleted_at || null,
    sync_status: syncStatus,
    version: note.version || 1,
    updated_at: note.updated || new Date().toISOString(),
    client_updated_at: note.client_updated_at || new Date().toISOString(),
    attachments_json: JSON.stringify(note.attachments || []),
  };
}

/**
 * Convert LocalNote to Note representation for UI / Remote Push
 */
export function localNoteToNote(local: LocalNote, userId?: string): Note {
  let attachments: string[] = [];
  if (local.attachments_json) {
    try {
      attachments = JSON.parse(local.attachments_json);
    } catch {
      attachments = [];
    }
  }

  return {
    id: local.id,
    user_id: userId,
    title: local.title,
    cover_color: local.cover_color,
    cover_icon: local.cover_icon,
    content: local.content,
    excerpt: local.excerpt,
    attachments,
    is_locked: Boolean(local.is_locked),
    is_archived: Boolean(local.is_archived),
    is_deleted: Boolean(local.is_deleted),
    deleted_at: local.deleted_at,
    version: local.version,
    client_updated_at: local.client_updated_at,
    updated: local.updated_at,
  };
}
