import React, { useState, useEffect } from 'react';
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

  // Physical keyboard support for typing PIN on web desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, confirmPin, setupStep, mode]);

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
          setErrorMsg('PIN must be at least 2 digits (e.g. 79, 1234, 892014)');
          return;
        }
        setSetupStep('confirm');
      } else {
        if (pin !== confirmPin) {
          setErrorMsg('Confirmation does not match. Please try again.');
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

    setSessionUnlockedPin(pin);
    onSuccess(pin);
    onClose();
  };

  const currentDisplayLength = (mode === 'setup' && setupStep === 'confirm') ? confirmPin.length : pin.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-in">
      <div className="relative w-full max-w-sm rounded-2xl modal-surface p-6 sm:p-7 text-left select-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {title || (mode === 'setup' 
                ? (setupStep === 'create' ? 'Create Stealth PIN' : 'Confirm Stealth PIN')
                : 'Vault Verification')}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description || (mode === 'setup'
                ? 'Variable length (2+ digits). Length is strictly hidden.'
                : 'Enter your stealth PIN and submit.')}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="min-h-[46px] w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#121316] border border-slate-300/80 dark:border-neutral-800 flex items-center justify-center space-x-1 overflow-hidden font-mono">
            {currentDisplayLength === 0 ? (
              <span className="text-xs text-slate-400 dark:text-neutral-500 italic">
                {mode === 'setup' && setupStep === 'confirm' ? 'Re-enter PIN...' : 'Type PIN (any length)...'}
              </span>
            ) : (
              <div className="flex items-center space-x-1 tracking-widest text-amber-500 dark:text-amber-400 text-base font-bold">
                {getStealthMask(currentDisplayLength)}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-500 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1d22] dark:hover:bg-[#25262c] text-base font-mono font-semibold text-slate-800 dark:text-neutral-100 transition-all active:scale-[0.97] border border-slate-300/80 dark:border-neutral-800 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#16171b] dark:hover:bg-[#202126] text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center justify-center transition-all active:scale-[0.97] border border-slate-300/80 dark:border-neutral-800 cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1d22] dark:hover:bg-[#25262c] text-base font-mono font-semibold text-slate-800 dark:text-neutral-100 transition-all active:scale-[0.97] border border-slate-300/80 dark:border-neutral-800 cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center transition-all active:scale-[0.97] cursor-pointer"
            title="Submit PIN"
          >
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <button onClick={handleClear} className="hover:text-slate-300 transition-colors">
            Clear
          </button>
          <span>Physical Keyboard Active</span>
        </div>
      </div>
    </div>
  );
};
