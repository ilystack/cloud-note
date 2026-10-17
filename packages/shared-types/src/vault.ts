/**
 * Stealth Variable-Length PIN and Vault Management
 * Rule: PIN length must be at least 2 numeric digits (^\d{2,}$), with no arbitrary upper ceiling.
 * Stealth requirement: UI must not leak PIN length (no static 4 dots).
 */

import { bytesToHex } from './crypto';

export const PIN_MIN_LENGTH = 2;
export const PIN_REGEX = /^\d{2,}$/;

/**
 * Validates whether the given PIN satisfies the variable-length stealth PIN rules.
 */
export function isValidPin(pin: string): boolean {
  if (typeof pin !== 'string') return false;
  return PIN_REGEX.test(pin.trim());
}

/**
 * Returns stealth masked string (e.g. '●●●') matching the current input length
 * without showing total capacity or predefined slot boxes.
 */
export function getStealthMask(length: number): string {
  if (length <= 0) return '';
  return '●'.repeat(length);
}

/**
 * Hash a PIN with salt for secure local comparison (e.g., verifying entered PIN against stored hash)
 */
export async function hashPin(pin: string, salt: string = 'cloudnotes_vault_salt_v1'): Promise<string> {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('WebCrypto SubtleCrypto is not available.');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin.trim()}`);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Verify whether an entered PIN matches the stored hash
 */
export async function verifyPinHash(pin: string, storedHash: string, salt: string = 'cloudnotes_vault_salt_v1'): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}
