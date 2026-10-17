import { describe, it, expect } from 'vitest';
import { isValidPin, getStealthMask, hashPin, verifyPinHash } from './vault';

describe('Stealth Variable-Length PIN Module', () => {
  it('should accept variable-length PINs (2 digits, 3 digits, 6 digits, 10 digits)', () => {
    expect(isValidPin('79')).toBe(true);
    expect(isValidPin('123')).toBe(true);
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('892014')).toBe(true);
    expect(isValidPin('123456789012')).toBe(true);
  });

  it('should reject PINs with less than 2 digits or containing non-digits', () => {
    expect(isValidPin('')).toBe(false);
    expect(isValidPin('1')).toBe(false);
    expect(isValidPin('ab')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin(' 4 ')).toBe(false);
  });

  it('should generate dynamic stealth mask dots without leaking max capacity', () => {
    expect(getStealthMask(0)).toBe('');
    expect(getStealthMask(2)).toBe('●●');
    expect(getStealthMask(5)).toBe('●●●●●');
    expect(getStealthMask(8)).toBe('●●●●●●●●');
  });

  it('should hash PIN and verify successfully', async () => {
    const pin = '7982';
    const hash = await hashPin(pin);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 hex string

    const isMatch = await verifyPinHash(pin, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPinHash('0000', hash);
    expect(isWrong).toBe(false);
  });
});
