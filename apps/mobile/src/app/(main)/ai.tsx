import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { 
  AiConfig, 
  AiProvider, 
  DEFAULT_MODELS, 
  executeAiQuery, 
  LocalNote 
} from '@cloudnotes/shared-types';
import { getActiveNotes } from '../../db/client';
import { 
  Sparkles, 
  Send, 
  Key, 
  ShieldCheck, 
  FileText, 
  CheckSquare, 
  Languages 
} from 'lucide-react-native';

const SECURE_KEY_AI_CONFIG = 'cloudnotes_mobile_ai_config';

export default function MobileAiScreen() {
  const [config, setConfig] = useState<AiConfig>({
    provider: 'gemini',
    apiKey: '',
    model: DEFAULT_MODELS.gemini,
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeNotes, setActiveNotes] = useState<LocalNote[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(SECURE_KEY_AI_CONFIG);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
          if (!parsed.apiKey) setIsConfiguring(true);
        } catch {
          setIsConfiguring(true);
        }
      } else {
        setIsConfiguring(true);
      }
      const notes = await getActiveNotes();
      setActiveNotes(notes);
    })();
  }, []);

  const handleSaveConfig = async () => {
    if (!config.apiKey.trim()) {
      Alert.alert('Required', 'Please enter an API Key.');
      return;
    }
    await SecureStore.setItemAsync(SECURE_KEY_AI_CONFIG, JSON.stringify(config));
    setIsConfiguring(false);
    Alert.alert('Saved', 'AI Key configured successfully.');
  };

  const runAi = async (action: 'summarize' | 'grammar' | 'action_items' | 'qa') => {
    if (!config.apiKey) {
      setIsConfiguring(true);
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      // Privacy Guard: Strictly exclude locked notes and deleted notes
      const unlockedNotes = activeNotes.filter(n => !n.is_locked && !n.is_deleted);
      const context = unlockedNotes.map(n => `### ${n.title}\n${n.content}`).join('\n\n---\n\n');

      const answer = await executeAiQuery(config, {
        action,
        noteContent: context.slice(0, 3000),
        userQuestion: query,
        allUnlockedNotesContext: context.slice(0, 6000),
      });

      setResponse(answer);
    } catch (err: any) {
      Alert.alert('AI Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.sparkleCircle}>
            <Sparkles size={20} color="#C084FC" />
          </View>
          <View>
            <Text style={styles.title}>AI Note Assistant</Text>
            <Text style={styles.subtitle}>BYOK • Privacy Guard Enabled</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.keyBtn}
          onPress={() => setIsConfiguring(prev => !prev)}
        >
          <Key size={16} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {/* Config Drawer */}
      {isConfiguring && (
        <View style={styles.configBox}>
          <Text style={styles.configTitle}>AI Provider Configuration (BYOK)</Text>
          <View style={styles.providerRow}>
            {(['gemini', 'openai', 'groq', 'deepseek'] as AiProvider[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.providerBtn, config.provider === p && styles.providerBtnActive]}
                onPress={() => setConfig(prev => ({ ...prev, provider: p, model: DEFAULT_MODELS[p] }))}
              >
                <Text style={[styles.providerBtnText, config.provider === p && styles.providerBtnTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={config.apiKey}
            onChangeText={(val) => setConfig(prev => ({ ...prev, apiKey: val }))}
            placeholder={`Enter ${config.provider} API Key`}
            placeholderTextColor="#475569"
            secureTextEntry
            style={styles.keyInput}
          />

          <TouchableOpacity style={styles.saveKeyBtn} onPress={handleSaveConfig}>
            <Text style={styles.saveKeyText}>Save API Key</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Action Pills */}
      <View style={styles.pillsRow}>
        <TouchableOpacity style={styles.pill} onPress={() => runAi('summarize')}>
          <FileText size={14} color="#60A5FA" />
          <Text style={styles.pillText}>Summarize</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pill} onPress={() => runAi('action_items')}>
          <CheckSquare size={14} color="#34D399" />
          <Text style={styles.pillText}>Action Items</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pill} onPress={() => runAi('grammar')}>
          <Languages size={14} color="#C084FC" />
          <Text style={styles.pillText}>Polish</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
        <View style={styles.privacyNote}>
          <ShieldCheck size={16} color="#10B981" />
          <Text style={styles.privacyText}>
            Privacy Guard: Locked notes & trash are never shared with AI.
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={styles.loadingText}>Generating AI response...</Text>
          </View>
        )}

        {response ? (
          <View style={styles.responseCard}>
            <Text style={styles.responseText}>{response}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Query Bar */}
      <View style={styles.bottomBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ask anything about unlocked notes..."
          placeholderTextColor="#64748B"
          style={styles.queryInput}
        />
        <TouchableOpacity 
          style={styles.sendBtn} 
          disabled={loading || !query.trim()}
          onPress={() => runAi('qa')}
        >
          <Send size={16} color="#0B0F19" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#111827',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sparkleCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  keyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configBox: {
    backgroundColor: '#162032',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 10,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
  },
  providerBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  providerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  providerBtnTextActive: {
    color: '#F59E0B',
  },
  keyInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 10,
  },
  saveKeyBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveKeyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B0F19',
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#111827',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  privacyText: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  responseCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  responseText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#111827',
  },
  queryInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#F8FAFC',
    fontSize: 13,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
