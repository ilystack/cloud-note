import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { 
  getPocketBase, 
  setServerUrl, 
  testServerConnection, 
  SECURE_KEY_SERVER_URL, 
  DEFAULT_SERVER_URL 
} from '../../services/api';
import { syncMobileWithServer } from '../../services/syncService';
import { Server, CheckCircle2, AlertCircle, LogOut } from 'lucide-react-native';

export default function ServerAuthScreen() {
  const router = useRouter();
  const [serverUrl, setUrl] = useState(DEFAULT_SERVER_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(SECURE_KEY_SERVER_URL);
      if (saved) setUrl(saved);

      const pb = await getPocketBase();
      if (pb.authStore.isValid) {
        setIsLoggedIn(true);
        setUserEmail(pb.authStore.model?.email || 'Logged in');
      }
    })();
  }, []);

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
        router.back();
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
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Auth Failed', err.message);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Server size={28} color="#F59E0B" />
        </View>
        <Text style={styles.title}>PocketBase Connection</Text>
        <Text style={styles.subtitle}>Connect mobile to your private self-hosted backend</Text>
      </View>

      {/* URL Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Server URL:</Text>
        <View style={styles.urlRow}>
          <TextInput
            value={serverUrl}
            onChangeText={setUrl}
            autoCapitalize="none"
            placeholder="http://192.168.1.5:8090"
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
              <CheckCircle2 size={16} color="#10B981" />
            ) : (
              <AlertCircle size={16} color="#F43F5E" />
            )}
            <Text style={[styles.resultText, testResult.ok ? styles.resultTextOk : styles.resultTextErr]}>
              {testResult.message}
            </Text>
          </View>
        )}
      </View>

      {/* Auth Account */}
      <View style={styles.section}>
        {isLoggedIn ? (
          <View style={styles.loggedBox}>
            <View>
              <Text style={styles.loggedLabel}>Connected User:</Text>
              <Text style={styles.loggedEmail}>{userEmail}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={16} color="#F43F5E" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.tabsRow}>
              <TouchableOpacity 
                style={[styles.tabBtn, authMode === 'login' && styles.tabBtnActive]}
                onPress={() => setAuthMode('login')}
              >
                <Text style={[styles.tabText, authMode === 'login' && styles.tabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, authMode === 'register' && styles.tabBtnActive]}
                onPress={() => setAuthMode('register')}
              >
                <Text style={[styles.tabText, authMode === 'register' && styles.tabTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Master Password (min 8 chars)"
              placeholderTextColor="#475569"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity 
              style={styles.authSubmitBtn} 
              disabled={loading}
              onPress={handleAuth}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0B0F19" />
              ) : (
                <Text style={styles.authSubmitText}>
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  testBtn: {
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  resultOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  resultErr: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultTextOk: {
    color: '#10B981',
  },
  resultTextErr: {
    color: '#F43F5E',
  },
  loggedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loggedLabel: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  loggedEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
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
  },
  logoutText: {
    fontSize: 12,
    color: '#F43F5E',
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#F59E0B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0B0F19',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  authSubmitBtn: {
    backgroundColor: '#F59E0B',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  authSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0F19',
  },
});
