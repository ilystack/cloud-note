import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StealthPinPad } from '../../components/StealthPinPad';
import { 
  hasMasterPin, 
  saveMasterPin, 
  verifyMasterPin, 
  authenticateWithBiometrics 
} from '../../services/pinService';

export default function StealthPinAuthScreen() {
  const router = useRouter();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');

  useEffect(() => {
    (async () => {
      const exists = await hasMasterPin();
      if (!exists) {
        setIsSetupMode(true);
      } else {
        // Try auto biometrics first
        const bioSuccess = await authenticateWithBiometrics();
        if (bioSuccess) {
          router.replace('/(main)/' as any);
        }
      }
    })();
  }, [router]);

  const handlePinSuccess = async (enteredPin: string) => {
    if (enteredPin === 'biometrics_authenticated') {
      router.replace('/(main)/' as any);
      return;
    }

    if (isSetupMode) {
      if (setupStep === 'create') {
        setFirstPin(enteredPin);
        setSetupStep('confirm');
      } else {
        if (enteredPin !== firstPin) {
          Alert.alert('Mismatch', 'PIN confirmation did not match. Please try again.');
          setSetupStep('create');
          setFirstPin('');
          return;
        }
        await saveMasterPin(enteredPin);
        router.replace('/(main)/' as any);
      }
      return;
    }

    // Unlock mode
    const isValid = await verifyMasterPin(enteredPin);
    if (isValid) {
      router.replace('/(main)/' as any);
    } else {
      Alert.alert('Incorrect PIN', 'Stealth PIN is incorrect. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.padWrapper}>
        <StealthPinPad
          onSuccess={handlePinSuccess}
          title={isSetupMode ? (setupStep === 'create' ? 'Create Stealth PIN' : 'Confirm Stealth PIN') : 'Stealth Vault Security'}
          subtitle={isSetupMode ? 'Enter at least 2 digits. Length is stealthy and hidden.' : 'Type your variable-length PIN and tap Confirm'}
          allowBiometrics={!isSetupMode}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  padWrapper: {
    width: '100%',
    alignItems: 'center',
  },
});
