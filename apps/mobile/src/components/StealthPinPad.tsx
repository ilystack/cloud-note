import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { 
  isValidPin, 
  getStealthMask 
} from '@cloudnotes/shared-types';
import { 
  authenticateWithBiometrics 
} from '../services/pinService';
import { 
  Delete, 
  Check, 
  Fingerprint, 
  Lock 
} from 'lucide-react-native';

interface StealthPinPadProps {
  onSuccess: (pin: string) => void;
  title?: string;
  subtitle?: string;
  allowBiometrics?: boolean;
}

export const StealthPinPad: React.FC<StealthPinPadProps> = ({
  onSuccess,
  title = 'Stealth Vault PIN',
  subtitle = 'Enter your variable-length stealth PIN and tap Confirm',
  allowBiometrics = true,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDigit = (digit: string) => {
    setErrorMsg('');
    setPin(prev => prev + digit);
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!isValidPin(pin)) {
      setErrorMsg('PIN must be at least 2 digits');
      return;
    }
    onSuccess(pin);
  };

  const handleBiometrics = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      onSuccess('biometrics_authenticated');
    } else {
      setErrorMsg('Biometrics authentication failed or cancelled');
    }
  };

  return (
    <View style={styles.container}>
      {/* Icon & Title */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Lock size={28} color="#F59E0B" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Dynamic Stealth Masked Display (No static 4 slots) */}
      <View style={styles.displayBox}>
        {pin.length === 0 ? (
          <Text style={styles.placeholderText}>Type PIN (any length)...</Text>
        ) : (
          <Text style={styles.maskText}>{getStealthMask(pin.length)}</Text>
        )}
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keyRow}>
            {row.map(digit => (
              <TouchableOpacity
                key={digit}
                activeOpacity={0.7}
                style={styles.keyButton}
                onPress={() => handleDigit(digit)}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Bottom row: Biometrics/Clear, 0, Submit (Check) */}
        <View style={styles.keyRow}>
          {allowBiometrics ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.keyButton, styles.specialKey]}
              onPress={handleBiometrics}
            >
              <Fingerprint size={24} color="#10B981" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.keyButton, styles.specialKey]}
              onPress={handleBackspace}
            >
              <Delete size={22} color="#94A3B8" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.keyButton}
            onPress={() => handleDigit('0')}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          {/* Submit / Confirm Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.keyButton, styles.submitKey]}
            onPress={handleSubmit}
          >
            <Check size={26} color="#121214" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Clear backspace row */}
      {allowBiometrics && pin.length > 0 && (
        <TouchableOpacity style={styles.clearRow} onPress={handleBackspace}>
          <Text style={styles.clearText}>Delete Last Digit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F4F4F5',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  displayBox: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#18191D',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: '#71717A',
    fontStyle: 'italic',
  },
  maskText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F43F5E',
    marginBottom: 8,
  },
  keypad: {
    width: '100%',
    marginTop: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keyButton: {
    width: 76,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#18191D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  specialKey: {
    backgroundColor: '#222328',
  },
  submitKey: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  clearRow: {
    marginTop: 12,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 13,
    color: '#A1A1AA',
    textDecorationLine: 'underline',
  },
});
