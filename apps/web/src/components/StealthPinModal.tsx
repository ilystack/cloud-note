import React, { useState, useEffect } from 'react';
import { Delete, ArrowRight, X, AlertCircle } from 'lucide-react';
import { isValidPin, hashPin, verifyPinHash } from '@cloudnotes/shared-types';
import { getStoredPinHash, setStoredPinHash, setSessionUnlockedPin } from '../lib/storage';

interface StealthPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'setup' | 'unlock_note' | 'unlock_vault' | 'change_pin';
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
  const [changeStep, setChangeStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reset all states cleanly whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setSetupStep('create');
      // If changing PIN but no PIN was ever set, start at 'new'
      setChangeStep(getStoredPinHash() ? 'current' : 'new');
      setErrorMsg('');
    }
  }, [isOpen, mode]);

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
  }, [isOpen, pin, confirmPin, currentPin, newPin, confirmNewPin, setupStep, changeStep, mode]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setErrorMsg('');
    if (currentDisplayLength >= 24) return;

    if (mode === 'change_pin') {
      if (changeStep === 'current') {
        setCurrentPin(prev => prev + digit);
      } else if (changeStep === 'new') {
        setNewPin(prev => prev + digit);
      } else {
        setConfirmNewPin(prev => prev + digit);
      }
    } else if (mode === 'setup') {
      if (setupStep === 'confirm') {
        setConfirmPin(prev => prev + digit);
      } else {
        setPin(prev => prev + digit);
      }
    } else {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    if (mode === 'change_pin') {
      if (changeStep === 'current') {
        setCurrentPin(prev => prev.slice(0, -1));
      } else if (changeStep === 'new') {
        setNewPin(prev => prev.slice(0, -1));
      } else {
        setConfirmNewPin(prev => prev.slice(0, -1));
      }
    } else if (mode === 'setup') {
      if (setupStep === 'confirm') {
        setConfirmPin(prev => prev.slice(0, -1));
      } else {
        setPin(prev => prev.slice(0, -1));
      }
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (mode === 'change_pin') {
      if (changeStep === 'current') {
        if (!isValidPin(currentPin)) {
          setErrorMsg('Please enter your current PIN');
          return;
        }
        const storedHash = getStoredPinHash();
        if (storedHash) {
          const isMatch = await verifyPinHash(currentPin, storedHash);
          if (!isMatch) {
            setErrorMsg('Incorrect current PIN. Try again.');
            setCurrentPin('');
            return;
          }
        }
        setErrorMsg('');
        setChangeStep('new');
        return;
      }

      if (changeStep === 'new') {
        if (!isValidPin(newPin)) {
          setErrorMsg('New PIN must be at least 2 digits');
          return;
        }
        if (currentPin && newPin === currentPin) {
          setErrorMsg('New PIN must be different from current PIN');
          return;
        }
        setErrorMsg('');
        setChangeStep('confirm');
        return;
      }

      if (changeStep === 'confirm') {
        if (newPin !== confirmNewPin) {
          setErrorMsg('PINs do not match');
          setConfirmNewPin('');
          return;
        }
        const hashed = await hashPin(newPin);
        setStoredPinHash(hashed);
        setSessionUnlockedPin(newPin);
        onSuccess(newPin);
        onClose();
        return;
      }
      return;
    }

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

  let currentDisplayLength = pin.length;
  if (mode === 'change_pin') {
    if (changeStep === 'current') currentDisplayLength = currentPin.length;
    else if (changeStep === 'new') currentDisplayLength = newPin.length;
    else currentDisplayLength = confirmNewPin.length;
  } else if (mode === 'setup') {
    currentDisplayLength = (setupStep === 'confirm') ? confirmPin.length : pin.length;
  }

  let headerTitle = title;
  let subtitle = description;

  if (mode === 'change_pin') {
    if (changeStep === 'current') {
      headerTitle = 'Enter Current PIN';
      subtitle = 'Verify your current PIN before creating a new one';
    } else if (changeStep === 'new') {
      headerTitle = 'Enter New PIN';
      subtitle = 'Choose a new PIN (at least 2 digits)';
    } else {
      headerTitle = 'Confirm New PIN';
      subtitle = 'Re-enter your new PIN to confirm';
    }
  } else if (mode === 'setup') {
    headerTitle = setupStep === 'create' ? 'Create Your PIN' : 'Confirm Your PIN';
    subtitle = setupStep === 'create' ? 'Choose a PIN of at least 2 digits' : 'Re-enter your PIN to confirm';
  } else if (!headerTitle) {
    headerTitle = mode === 'unlock_vault' ? 'Unlock Stealth Vault' : 'Enter Your PIN';
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-in select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xs rounded-3xl modal-surface p-7 text-center shadow-2xl border border-slate-200/80 dark:border-neutral-800 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean On-Point Typography Header */}
        <div className="mb-6 pt-1">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-sans">
            {headerTitle}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Minimalist PIN Dots Indicator with Strict Bounds & Dynamic Sizing */}
        <div className="mb-6">
          <div className="relative h-12 w-full px-3.5 rounded-2xl bg-slate-100/90 dark:bg-[#121316] border border-slate-200/80 dark:border-neutral-800 flex items-center justify-center overflow-hidden">
            {currentDisplayLength === 0 ? (
              <span className="text-base text-slate-300 dark:text-neutral-600 font-mono tracking-widest select-none">
                ••••
              </span>
            ) : (
              <div 
                className={`flex items-center max-w-full overflow-hidden transition-all duration-150 ${
                  currentDisplayLength <= 8 
                    ? 'justify-center gap-2' 
                    : currentDisplayLength <= 12 
                      ? 'justify-center gap-1.5' 
                      : 'justify-end gap-1 px-1 w-full'
                }`}
                style={currentDisplayLength > 12 ? {
                  maskImage: 'linear-gradient(to right, transparent 0%, black 20px)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20px)'
                } : undefined}
              >
                {Array.from({ length: currentDisplayLength }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`rounded-full bg-amber-500 animate-in fade-in duration-150 flex-shrink-0 ${
                      currentDisplayLength <= 8 
                        ? 'w-2.5 h-2.5' 
                        : currentDisplayLength <= 12 
                          ? 'w-2 h-2' 
                          : 'w-1.5 h-1.5'
                    }`}
                  />
                ))}
                {currentDisplayLength > 14 && (
                  <span className="text-[10px] font-mono text-amber-500 font-bold ml-1.5 flex-shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {currentDisplayLength}
                  </span>
                )}
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
