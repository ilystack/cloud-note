import React, { useState, useEffect, useRef } from 'react';
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
  executeAiChat, 
  ChatMessage,
  LocalNote 
} from '@cloudnotes/shared-types';
import { getActiveNotes } from '../../db/client';
import { 
  Bot, 
  Send, 
  Key 
} from 'lucide-react-native';

const SECURE_KEY_AI_CONFIG = 'cloudnotes_mobile_ai_config';

export default function MobileAiScreen() {
  const [config, setConfig] = useState<AiConfig>({
    provider: 'gemini',
    apiKey: '',
    model: '',
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeNotes, setActiveNotes] = useState<LocalNote[]>([]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    if (!config.apiKey) {
      setIsConfiguring(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const unlockedNotes = activeNotes.filter(n => !n.is_locked && !n.is_deleted);
      const context = unlockedNotes.map(n => `### ${n.title}\n${n.content}`).join('\n\n---\n\n').slice(0, 6000);

      const reply = await executeAiChat(config, {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        contextNotes: context,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      Alert.alert('AI Error', err.message || 'Failed to get response');
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
            <Bot size={18} color="#C084FC" />
          </View>
          <View>
            <Text style={styles.title}>Ask AI</Text>
            <Text style={styles.subtitle}>{config.provider.toUpperCase()}</Text>
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
          <Text style={styles.configTitle}>API Configuration</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.providerScroll}
            style={{ marginBottom: 12 }}
          >
            {(['gemini', 'openai', 'anthropic', 'openrouter', 'groq', 'deepseek', 'custom'] as AiProvider[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.providerBtn, config.provider === p && styles.providerBtnActive]}
                onPress={() => setConfig(prev => ({ 
                  ...prev, 
                  provider: p, 
                  model: '',
                  customEndpoint: prev.customEndpoint || (p === 'custom' ? 'https://api.openai.com/v1/chat/completions' : undefined)
                }))}
              >
                <Text style={[styles.providerBtnText, config.provider === p && styles.providerBtnTextActive]}>
                  {p === 'anthropic' ? 'CLAUDE' : p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {config.provider === 'custom' && (
            <TextInput
              value={config.customEndpoint || ''}
              onChangeText={(val) => setConfig(prev => ({ ...prev, customEndpoint: val }))}
              placeholder="Endpoint URL (https://.../v1/chat/completions)"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              style={styles.keyInput}
            />
          )}

          <TextInput
            value={config.model || ''}
            onChangeText={(val) => setConfig(prev => ({ ...prev, model: val }))}
            placeholder="Model"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            style={styles.keyInput}
          />

          <TextInput
            value={config.apiKey}
            onChangeText={(val) => setConfig(prev => ({ ...prev, apiKey: val }))}
            placeholder={`Enter ${config.provider} API Key`}
            placeholderTextColor="#475569"
            secureTextEntry
            style={styles.keyInput}
          />

          <TouchableOpacity style={styles.saveKeyBtn} onPress={handleSaveConfig}>
            <Text style={styles.saveKeyText}>Save Configuration</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages Scroll Area */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.bodyScroll} 
        contentContainerStyle={styles.bodyContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Bot size={28} color="#C084FC" style={{ opacity: 0.6, marginBottom: 8 }} />
            <Text style={styles.emptyText}>Start a conversation with AI about your notes.</Text>
          </View>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <View 
              key={m.id} 
              style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}
            >
              <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                {m.content}
              </Text>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#C084FC" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Query Bar */}
      <View style={styles.bottomBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#64748B"
          style={styles.queryInput}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity 
          style={styles.sendBtn} 
          disabled={loading || !inputText.trim()}
          onPress={handleSendMessage}
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
  providerScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  providerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#F59E0B',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userText: {
    color: '#0B0F19',
    fontWeight: '600',
  },
  aiText: {
    color: '#F8FAFC',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
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
