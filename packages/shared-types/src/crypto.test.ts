import { describe, it, expect } from 'vitest';
import { encryptNoteContent, decryptNoteContent, bytesToHex, hexToBytes } from './crypto';
import { ENCRYPTION_PREFIX } from './note';

describe('WebCrypto AES-GCM 256-bit & PBKDF2 Module', () => {
  const sampleText = 'Rahasia Penting: Rencana Arsitektur CloudNotes 2026';
  const pin = '7912';

  it('should convert bytes to hex and back accurately', () => {
    const original = new Uint8Array([0, 15, 255, 128, 42]);
    const hex = bytesToHex(original);
    expect(hex).toBe('000fff802a');
    const restored = hexToBytes(hex);
    expect(restored).toEqual(original);
  });

  it('should encrypt note content to enc:v1 format', async () => {
    const encrypted = await encryptNoteContent(sampleText, pin);
    expect(encrypted.startsWith(ENCRYPTION_PREFIX)).toBe(true);

    const parts = encrypted.split(':');
    expect(parts.length).toBe(5);
    expect(parts[0]).toBe('enc');
    expect(parts[1]).toBe('v1');
    expect(parts[2].length).toBe(32); // 16 bytes salt
    expect(parts[3].length).toBe(24); // 12 bytes IV
    expect(parts[4].length).toBeGreaterThan(0); // Ciphertext
  });

  it('should decrypt encrypted note with the exact same PIN', async () => {
    const encrypted = await encryptNoteContent(sampleText, pin);
    const decrypted = await decryptNoteContent(encrypted, pin);
    expect(decrypted).toBe(sampleText);
  });

  it('should work with 2-digit variable-length stealth PIN (e.g. 79)', async () => {
    const twoDigitPin = '79';
    const encrypted = await encryptNoteContent(sampleText, twoDigitPin);
    const decrypted = await decryptNoteContent(encrypted, twoDigitPin);
    expect(decrypted).toBe(sampleText);
  });

  it('should fail decryption when given wrong PIN', async () => {
    const encrypted = await encryptNoteContent(sampleText, pin);
    await expect(decryptNoteContent(encrypted, '9999')).rejects.toThrow('Decryption failed');
  });

  it('should return unencrypted text as-is if string does not have enc:v1 prefix', async () => {
    const plain = 'Just plain text note';
    const result = await decryptNoteContent(plain, pin);
    expect(result).toBe(plain);
  });
});
