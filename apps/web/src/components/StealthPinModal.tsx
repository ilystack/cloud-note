import React, { useState } from 'react';
import { Lock, Delete, ArrowRight, X, AlertCircle } from 'lucide-react';
import { isValidPin, getStealthMask, hashPin, verifyPinHash } from '@cloudnotes/shared-types';
import { getStoredPinHash, setStoredPinHash, setSessionUnlockedPin } from '../lib/storage';

interface StealthPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'setup' | 'unlock_note' | 'unlock_vault';
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
}

export const StealthPinModal: React.FC<StealthPinModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSuccess,
  title,
  description,
}) => {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setErrorMsg('');
    if (mode === 'setup' && setupStep === 'confirm') {
      setConfirmPin(prev => prev + digit);
    } else {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    if (mode === 'setup' && setupStep === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMsg('');
    if (mode === 'setup' && setupStep === 'confirm') {
      setConfirmPin('');
    } else {
      setPin('');
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (mode === 'setup') {
      if (setupStep === 'create') {
        if (!isValidPin(pin)) {
          setErrorMsg('PIN must be at least 2 digits (e.g., 79, 1234, 892014)');
          return;
        }
        setSetupStep('confirm');
      } else {
        if (pin !== confirmPin) {
          setErrorMsg('PIN confirmation does not match. Try again.');
          setConfirmPin('');
          return;
        }
        // Save PIN hash
        const hashed = await hashPin(pin);
        setStoredPinHash(hashed);
        setSessionUnlockedPin(pin);
        onSuccess(pin);
        onClose();
      }
      return;
    }

    // Unlock mode
    if (!isValidPin(pin)) {
      setErrorMsg('Please enter a valid PIN (at least 2 digits)');
      return;
    }

    const storedHash = getStoredPinHash();
    if (storedHash) {
      const isMatch = await verifyPinHash(pin, storedHash);
      if (!isMatch) {
        setErrorMsg('Incorrect PIN. Please try again.');
        return;
      }
    }

    // Success
    setSessionUnlockedPin(pin);
    onSuccess(pin);
    onClose();
  };

  const currentDisplayLength = (mode === 'setup' && setupStep === 'confirm') ? confirmPin.length : pin.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl glass-panel p-6 sm:p-8 border border-slate-700/60 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <Lock className="w-6 h-6" />
          </div>

          <h3 className="text-xl font-bold text-slate-100">
            {title || (mode === 'setup' 
              ? (setupStep === 'create' ? 'Create Stealth PIN' : 'Confirm Stealth PIN')
              : 'Stealth Vault Security')}
          </h3>

          <p className="mt-1 text-xs text-slate-400 max-w-xs">
            {description || (mode === 'setup'
              ? 'Choose any numeric PIN (2 digits or longer). No one can guess the length.'
              : 'Enter your variable-length stealth PIN and tap Unlock.')}
          </p>
        </div>

        {/* Dynamic Stealth Masked Display (No static slots) */}
        <div className="mt-6 flex flex-col items-center">
          <div className="min-h-[52px] w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center space-x-1.5 overflow-hidden">
            {currentDisplayLength === 0 ? (
              <span className="text-xs text-slate-600 font-mono italic">
                {mode === 'setup' && setupStep === 'confirm' ? 'Re-enter PIN...' : 'Type PIN (any length)...'}
              </span>
            ) : (
              <div className="flex items-center space-x-1 tracking-widest text-amber-400 text-lg font-bold">
                {getStealthMask(currentDisplayLength)}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad (Stealth Defense) */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 text-xl font-bold text-slate-100 transition-all active:scale-95 border border-slate-700/40"
            >
              {digit}
            </button>
          ))}

          {/* Clear / Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all active:scale-95 border border-slate-700/30"
          >
            <Delete className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 text-xl font-bold text-slate-100 transition-all active:scale-95 border border-slate-700/40"
          >
            0
          </button>

          {/* Submit Button (Centang / Unlock) */}
          <button
            type="button"
            onClick={handleSubmit}
            className="h-13 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            title="Unlock / Submit"
          >
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Bottom helper */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <button onClick={handleClear} className="hover:text-slate-300 transition-colors">
            Clear
          </button>
          <span>Variable-Length Stealth</span>
        </div>
      </div>
    </div>
  );
};
