/**
 * Client-Side End-to-End Cryptography Module
 * Spec: AES-GCM 256-bit, PBKDF2 (SHA-256, 100,000 iterations, 16-byte random salt, 12-byte IV)
 * Storage Format: enc:v1:<salt_hex>:<iv_hex>:<ciphertext_hex>
 */

import { ENCRYPTION_PREFIX, isEncryptedContent } from './note';

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;
const KEY_BIT_LENGTH = 256;

/**
 * Get WebCrypto SubtleCrypto implementation cross-platform (Web / Node / Hermes)
 */
function getSubtleCrypto(): SubtleCrypto {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('WebCrypto SubtleCrypto is not available in the current environment.');
  }
  return cryptoObj.subtle;
}

function getRandomValues(array: Uint8Array): Uint8Array {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (!cryptoObj || !cryptoObj.getRandomValues) {
    throw new Error('crypto.getRandomValues is not available in the current environment.');
  }
  return cryptoObj.getRandomValues(array);
}

/**
 * Convert byte array to hexadecimal string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hexadecimal string to byte array
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derive an AES-GCM 256-bit key from a PIN or password and salt using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_BIT_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext string using AES-GCM 256-bit with PBKDF2
 * Returns format: enc:v1:<salt_hex>:<iv_hex>:<ciphertext_hex>
 */
export async function encryptNoteContent(plaintext: string, pin: string): Promise<string> {
  if (!pin || pin.length < 2) {
    throw new Error('PIN must have at least 2 characters');
  }

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  
  // Generate random 16-byte salt and 12-byte IV
  const salt = getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const iv = getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

  const key = await deriveKey(pin, salt);
  const data = encoder.encode(plaintext);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    data
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);
  const saltHex = bytesToHex(salt);
  const ivHex = bytesToHex(iv);
  const ciphertextHex = bytesToHex(ciphertextBytes);

  return `${ENCRYPTION_PREFIX}${saltHex}:${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypt ciphertext formatted as enc:v1:<salt_hex>:<iv_hex>:<ciphertext_hex>
 */
export async function decryptNoteContent(encryptedContent: string, pin: string): Promise<string> {
  if (!isEncryptedContent(encryptedContent)) {
    // If not encrypted, return as is
    return encryptedContent;
  }

  if (!pin || pin.length < 2) {
    throw new Error('PIN must have at least 2 characters');
  }

  const parts = encryptedContent.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid encrypted note format. Expected enc:v1:<salt>:<iv>:<ciphertext>');
  }

  const saltHex = parts[2];
  const ivHex = parts[3];
  const ciphertextHex = parts[4];

  const salt = hexToBytes(saltHex);
  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);

  const subtle = getSubtleCrypto();
  const key = await deriveKey(pin, salt);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Decryption failed: Incorrect PIN or tampered ciphertext');
  }
}
