import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { isValidPin, hashPin, verifyPinHash } from '@cloudnotes/shared-types';

const SECURE_KEY_PIN_HASH = 'cloudnotes_vault_pinhash';
const SECURE_KEY_RAW_PIN = 'cloudnotes_vault_rawpin'; // Encrypted in iOS Keychain / Android KeyStore

/**
 * Check if a Master Stealth PIN is set up
 */
export async function hasMasterPin(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(SECURE_KEY_PIN_HASH);
  return Boolean(hash);
}

/**
 * Save new Stealth PIN (2+ digits) into hardware secure storage
 */
export async function saveMasterPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) {
    throw new Error('PIN must have at least 2 digits');
  }
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(SECURE_KEY_PIN_HASH, hash);
  await SecureStore.setItemAsync(SECURE_KEY_RAW_PIN, pin);
  return true;
}

/**
 * Verify entered stealth PIN
 */
export async function verifyMasterPin(enteredPin: string): Promise<boolean> {
  if (!isValidPin(enteredPin)) return false;
  const storedHash = await SecureStore.getItemAsync(SECURE_KEY_PIN_HASH);
  if (!storedHash) return false;
  return verifyPinHash(enteredPin, storedHash);
}

/**
 * Get raw PIN for decrypting notes in memory during session
 */
export async function getMasterPin(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY_RAW_PIN);
}

/**
 * Authenticate using device biometrics (Fingerprint / Face ID)
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock CloudNotes Stealth Vault',
    fallbackLabel: 'Enter Stealth PIN',
    disableDeviceFallback: false,
  });

  return result.success;
}
