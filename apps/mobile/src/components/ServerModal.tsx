import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import { 
  getPocketBase, 
  setServerUrl, 
  testServerConnection, 
  SECURE_KEY_SERVER_URL, 
  DEFAULT_SERVER_URL 
} from '../services/api';
import { syncMobileWithServer } from '../services/syncService';
import { Server, CheckCircle2, AlertCircle, LogOut, X } from 'lucide-react-native';

interface ServerModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  visible,
  onClose,
  onLoginSuccess,
}) => {
  const [serverUrl, setUrl] = useState(DEFAULT_SERVER_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const refreshAuth = async () => {
    const saved = await SecureStore.getItemAsync(SECURE_KEY_SERVER_URL);
    if (saved) setUrl(saved);

    const pb = await getPocketBase();
    if (pb.authStore.isValid && pb.authStore.model) {
      setIsLoggedIn(true);
      setUserEmail(pb.authStore.model.email || 'Logged in');
    } else {
      setIsLoggedIn(false);
      setUserEmail('');
    }
  };

  useEffect(() => {
    if (visible) {
      refreshAuth();
    }
  }, [visible]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testServerConnection(serverUrl);
    setTestResult(res);
    setTesting(false);
    if (res.ok) {
      await setServerUrl(serverUrl);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please fill in email and password.');
      return;
    }

    setLoading(true);
    try {
      const pb = await getPocketBase();
      if (authMode === 'login') {
        await pb.collection('users').authWithPassword(email.trim(), password);
        setIsLoggedIn(true);
        setUserEmail(email);
        Alert.alert('Success', 'Logged in to server!');
        syncMobileWithServer().catch(console.error);
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      } else {
        await pb.collection('users').create({
          email: email.trim(),
          password,
          passwordConfirm: password,
        });
        await pb.collection('users').authWithPassword(email.trim(), password);
        setIsLoggedIn(true);
        setUserEmail(email);
        Alert.alert('Success', 'Account created and logged in!');
        syncMobileWithServer().catch(console.error);
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Auth Failed', err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const pb = await getPocketBase();
    pb.authStore.clear();
    setIsLoggedIn(false);
    setUserEmail('');
    Alert.alert('Logged Out', 'You are now disconnected from the server.');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Frosted Glass Blur Overlay */}
        <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={onClose} 
          activeOpacity={1} 
        />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Server size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.title}>
                  {isLoggedIn ? 'Account & Server' : 'Sign In Required'}
                </Text>
                <Text style={styles.subtitle}>
                  {isLoggedIn ? 'Manage server and active session' : 'Sign in to access AI Copilot & sync'}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Server URL Config */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Server Endpoint:</Text>
              <View style={styles.urlRow}>
                <TextInput
                  value={serverUrl}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  placeholder="http://127.0.0.1:8090"
                  placeholderTextColor="#475569"
                  style={styles.urlInput}
                />
                <TouchableOpacity style={styles.testBtn} disabled={testing} onPress={handleTest}>
                  {testing ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                  ) : (
                    <Text style={styles.testBtnText}>Test</Text>
                  )}
                </TouchableOpacity>
              </View>

              {testResult && (
                <View style={[styles.resultBox, testResult.ok ? styles.resultOk : styles.resultErr]}>
                  {testResult.ok ? (
                    <CheckCircle2 size={15} color="#10B981" />
                  ) : (
                    <AlertCircle size={15} color="#F43F5E" />
                  )}
                  <Text style={[styles.resultText, testResult.ok ? styles.resultTextOk : styles.resultTextErr]}>
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>

            {/* Auth Section */}
            {isLoggedIn ? (
              <View style={styles.loggedBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loggedLabel}>Active Account</Text>
                  <Text style={styles.loggedEmail}>{userEmail}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <LogOut size={16} color="#F43F5E" />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authCard}>
                <View style={styles.authTabs}>
                  <TouchableOpacity
                    style={[styles.authTab, authMode === 'login' && styles.authTabActive]}
                    onPress={() => setAuthMode('login')}
                  >
                    <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.authTab, authMode === 'register' && styles.authTabActive]}
                    onPress={() => setAuthMode('register')}
                  >
                    <Text style={[styles.authTabText, authMode === 'register' && styles.authTabTextActive]}>
                      Register
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                  placeholderTextColor="#475569"
                  style={styles.inputField}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor="#475569"
                  style={styles.inputField}
                />

                <TouchableOpacity 
                  style={styles.submitBtn} 
                  disabled={loading} 
                  onPress={handleAuth}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#0B0F19" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {authMode === 'login' ? 'Sign In to Server' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F1522',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '85%',
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#161E2E',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#1E293B',
    fontSize: 13,
  },
  testBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  resultOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultErr: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  resultText: {
    fontSize: 12,
    flex: 1,
  },
  resultTextOk: {
    color: '#10B981',
  },
  resultTextErr: {
    color: '#F43F5E',
  },
  loggedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161E2E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  loggedLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  loggedEmail: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F43F5E',
  },
  authCard: {
    backgroundColor: '#161E2E',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  authTabs: {
    flexDirection: 'row',
    marginBottom: 14,
    backgroundColor: '#0F1522',
    borderRadius: 12,
    padding: 3,
  },
  authTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
  },
  authTabActive: {
    backgroundColor: '#1E293B',
  },
  authTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  authTabTextActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  inputField: {
    backgroundColor: '#0F1522',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: '#F59E0B',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '800',
  },
});
