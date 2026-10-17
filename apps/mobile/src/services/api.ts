import PocketBase from 'pocketbase';
import * as SecureStore from 'expo-secure-store';

export const SECURE_KEY_SERVER_URL = 'cloudnotes_mobile_server_url';
export const SECURE_KEY_AUTH_TOKEN = 'cloudnotes_mobile_auth_token';
export const DEFAULT_SERVER_URL = 'http://127.0.0.1:8090';

let mobilePb: PocketBase | null = null;

export async function getPocketBase(): Promise<PocketBase> {
  if (!mobilePb) {
    let serverUrl = await SecureStore.getItemAsync(SECURE_KEY_SERVER_URL);
    if (!serverUrl || !serverUrl.trim()) {
      serverUrl = DEFAULT_SERVER_URL;
    }
    mobilePb = new PocketBase(serverUrl.trim());

    // Restore auth token if saved
    const token = await SecureStore.getItemAsync(SECURE_KEY_AUTH_TOKEN);
    if (token) {
      mobilePb.authStore.save(token, null);
    }

    mobilePb.authStore.onChange(async (newToken) => {
      if (newToken) {
        await SecureStore.setItemAsync(SECURE_KEY_AUTH_TOKEN, newToken);
      } else {
        await SecureStore.deleteItemAsync(SECURE_KEY_AUTH_TOKEN);
      }
    });
  }
  return mobilePb;
}

export async function setServerUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY_SERVER_URL, url.trim());
  mobilePb = new PocketBase(url.trim());
}

export async function testServerConnection(url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/health`);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: `Connected! Health status ${data.code || 200}` };
    }
    return { ok: false, message: `HTTP Error ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Cannot reach server' };
  }
}

/**
 * Upload a media file directly from mobile to PocketBase server storage (database/files)
 * Lossless, without canvas downscaling!
 */
export async function uploadMediaFromMobile(
  recordId: string, 
  fileUri: string, 
  fileName: string, 
  mimeType: string
): Promise<string> {
  const pb = await getPocketBase();
  const formData = new FormData();

  formData.append('attachments', {
    uri: fileUri,
    name: fileName,
    type: mimeType || 'image/jpeg',
  } as any);

  const updatedRecord = await pb.collection('notes').update(recordId, formData);
  const attachments = (updatedRecord as any).attachments as string[];
  const uploadedFilename = attachments[attachments.length - 1];
  
  return `${pb.baseUrl}/api/files/notes/${recordId}/${uploadedFilename}`;
}
