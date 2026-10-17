import { LocalNote } from '@cloudnotes/shared-types';

const STORAGE_KEY_NOTES = 'cloudnotes_cached_notes';
const STORAGE_KEY_PIN_HASH = 'cloudnotes_vault_pinhash';
const STORAGE_KEY_SESSION_PIN = 'cloudnotes_vault_session_pin';
const STORAGE_KEY_AI_CONFIG = 'cloudnotes_ai_config';

export function getCachedNotes(): LocalNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCachedNotes(notes: LocalNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to cache notes in localStorage:', err);
  }
}

export function getStoredPinHash(): string | null {
  return localStorage.getItem(STORAGE_KEY_PIN_HASH);
}

export function setStoredPinHash(hash: string): void {
  localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
}

export function getSessionUnlockedPin(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_SESSION_PIN);
}

export function setSessionUnlockedPin(pin: string | null): void {
  if (pin) {
    sessionStorage.setItem(STORAGE_KEY_SESSION_PIN, pin);
  } else {
    sessionStorage.removeItem(STORAGE_KEY_SESSION_PIN);
  }
}

export function getStoredAiConfig(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAiConfig(config: any): void {
  localStorage.setItem(STORAGE_KEY_AI_CONFIG, JSON.stringify(config));
}
