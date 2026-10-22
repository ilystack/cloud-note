import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { 
  AiConfig, 
  AiProvider, 
  executeAiChat, 
  ChatMessage,
  LocalNote 
} from '@cloudnotes/shared-types';
import { getActiveNotes } from '../db/client';
import { Bot, Send, Key, X } from 'lucide-react-native';

const SECURE_KEY_AI_CONFIG = 'cloudnotes_mobile_ai_config';

interface AiModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AiModal: React.FC<AiModalProps> = ({ visible, onClose }) => {
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
    if (visible) {
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
    }
  }, [visible]);

  const handleSaveConfig = async () => {
    if (!config.apiKey.trim()) {
      Alert.alert('Required', 'Please enter a valid API key.');
      return;
    }
    await SecureStore.setItemAsync(SECURE_KEY_AI_CONFIG, JSON.stringify(config));
    setIsConfiguring(false);
    Alert.alert('Saved', 'AI Configuration updated.');
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (!config.apiKey) {
      setIsConfiguring(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
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
      Alert.alert('AI Error', err.message || 'Failed to communicate with AI provider.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botIconCircle}>
              <Bot size={20} color="#C084FC" />
            </View>
            <View>
              <Text style={styles.title}>AI Note Assistant</Text>
              <Text style={styles.subtitle}>{config.provider.toUpperCase()} Copilot</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => setIsConfiguring(prev => !prev)}
            >
              <Key size={16} color="#F59E0B" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={onClose}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Configuration Drawer */}
        {isConfiguring && (
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>API Key Configuration</Text>
            <View style={styles.providerRow}>
              {(['gemini', 'openai', 'groq'] as AiProvider[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.providerBtn, config.provider === p && styles.providerBtnActive]}
                  onPress={() => setConfig(prev => ({ ...prev, provider: p }))}
                >
                  <Text style={[styles.providerText, config.provider === p && styles.providerTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={config.apiKey}
              onChangeText={(val) => setConfig(prev => ({ ...prev, apiKey: val }))}
              placeholder="Paste your API key here..."
              placeholderTextColor="#64748B"
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
              <Bot size={36} color="#C084FC" style={{ opacity: 0.7, marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Chat with your Notes</Text>
              <Text style={styles.emptySubtitle}>
                Ask questions, summarize thoughts, or brainstorm ideas based on your local notes.
              </Text>
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

        {/* Bottom Input */}
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
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]} 
            disabled={loading || !inputText.trim()}
            onPress={handleSendMessage}
          >
            <Send size={18} color="#0B0F19" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
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
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#161E2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  configCard: {
    backgroundColor: '#111622',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#161E2E',
  },
  providerBtnActive: {
    backgroundColor: '#F59E0B',
  },
  providerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  providerTextActive: {
    color: '#0B0F19',
  },
  keyInput: {
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  saveKeyBtn: {
    backgroundColor: '#1E293B',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveKeyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E293B',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#F8FAFC',
  },
  aiText: {
    color: '#E2E8F0',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#111622',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  loadingText: {
    fontSize: 12,
    color: '#C084FC',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F1522',
    gap: 10,
  },
  queryInput: {
    flex: 1,
    backgroundColor: '#161E2E',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    color: '#F8FAFC',
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#C084FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
