import PocketBase from 'pocketbase';

export const STORAGE_KEY_SERVER_URL = 'cloudnotes_server_url';
export const DEFAULT_SERVER_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export function getActiveServerUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }
  return DEFAULT_SERVER_URL;
}

export function setActiveServerUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SERVER_URL, url.trim());
    pb = new PocketBase(url.trim());
  }
}

export let pb = new PocketBase(getActiveServerUrl());

/**
 * Health check endpoint for testing connection
 */
export async function checkServerHealth(customUrl?: string): Promise<{ ok: boolean; message: string }> {
  const targetUrl = customUrl ? customUrl.trim() : getActiveServerUrl();
  try {
    const res = await fetch(`${targetUrl.replace(/\/$/, '')}/api/health`, {
      method: 'GET',
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: `Connected! PocketBase healthy (code ${data.code || 200})` };
    }
    return { ok: false, message: `Server returned HTTP status ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to connect to server' };
  }
}

/**
 * Generates full URL for lossless server media / attachments
 */
export function getNoteFileUrl(recordId: string, filename: string): string {
  return `${pb.baseUrl}/api/files/notes/${recordId}/${filename}`;
}

/**
 * Upload a raw lossless file/image to server storage
 */
export async function uploadNoteAttachment(recordId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('attachments', file);

  const updatedRecord = await pb.collection('notes').update(recordId, formData);
  const attachments = (updatedRecord as any).attachments as string[];
  const uploadedFilename = attachments[attachments.length - 1];
  return getNoteFileUrl(recordId, uploadedFilename);
}
