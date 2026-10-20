import React, { useState, useEffect } from 'react';
import { Delete, ArrowRight, X, AlertCircle } from 'lucide-react';
import { isValidPin, hashPin, verifyPinHash } from '@cloudnotes/shared-types';
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
}) => {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Physical keyboard support
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

  const handleSubmit = async () => {
    setErrorMsg('');

    if (mode === 'setup') {
      if (setupStep === 'create') {
        if (!isValidPin(pin)) {
          setErrorMsg('PIN must be at least 2 digits');
          return;
        }
        setSetupStep('confirm');
      } else {
        if (pin !== confirmPin) {
          setErrorMsg('PINs do not match');
          setConfirmPin('');
          return;
        }
        const hashed = await hashPin(pin);
        setStoredPinHash(hashed);
        setSessionUnlockedPin(pin);
        onSuccess(pin);
        onClose();
      }
      return;
    }

    if (!isValidPin(pin)) {
      setErrorMsg('Please enter a valid PIN');
      return;
    }

    const storedHash = getStoredPinHash();
    if (storedHash) {
      const isMatch = await verifyPinHash(pin, storedHash);
      if (!isMatch) {
        setErrorMsg('Incorrect PIN. Try again.');
        setPin('');
        return;
      }
    }

    setSessionUnlockedPin(pin);
    onSuccess(pin);
    onClose();
  };

  const currentDisplayLength = (mode === 'setup' && setupStep === 'confirm') ? confirmPin.length : pin.length;

  const headerTitle = title || (mode === 'setup'
    ? (setupStep === 'create' ? 'Create Your PIN' : 'Confirm Your PIN')
    : 'Enter Your PIN');

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-in select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xs rounded-3xl modal-surface p-7 text-center shadow-2xl border border-slate-200/80 dark:border-neutral-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean On-Point Typography Header */}
        <div className="mb-6 pt-1">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-sans">
            {headerTitle}
          </h3>
        </div>

        {/* Minimalist PIN Dots Indicator */}
        <div className="mb-6">
          <div className="h-12 w-full px-4 rounded-2xl bg-slate-100/90 dark:bg-[#121316] border border-slate-200/80 dark:border-neutral-800 flex items-center justify-center space-x-2.5">
            {currentDisplayLength === 0 ? (
              <span className="text-base text-slate-300 dark:text-neutral-600 font-mono tracking-widest">
                ••••
              </span>
            ) : (
              <div className="flex items-center space-x-2.5">
                {Array.from({ length: currentDisplayLength }).map((_, idx) => (
                  <span
                    key={idx}
                    className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-in fade-in duration-150"
                  />
                ))}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-2.5 flex items-center justify-center space-x-1.5 text-xs text-rose-500 dark:text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Minimal Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#1a1b20] dark:hover:bg-[#23242a] text-lg font-mono font-medium text-slate-800 dark:text-neutral-100 transition-all active:scale-95 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-[#141518] dark:hover:bg-[#1e1f24] text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Backspace"
            aria-label="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#1a1b20] dark:hover:bg-[#23242a] text-lg font-mono font-medium text-slate-800 dark:text-neutral-100 transition-all active:scale-95 cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold flex items-center justify-center transition-all cursor-pointer shadow-sm shadow-amber-500/20"
            title="Submit PIN"
            aria-label="Submit"
          >
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
