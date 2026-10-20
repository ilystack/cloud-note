import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Check, 
  Loader2, 
  Copy, 
  SlidersHorizontal, 
  KeyRound, 
  ArrowLeft,
  PanelLeft,
  SquarePen,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { 
  AiConfig, 
  AiProvider, 
  DEFAULT_MODELS, 
  executeAiChat, 
  ChatMessage, 
  LocalNote 
} from '@cloudnotes/shared-types';
import { getStoredAiConfig, setStoredAiConfig } from '../lib/storage';
import { 
  AiChatSession, 
  getStoredChatSessions, 
  saveChatSession, 
  deleteChatSession, 
  createNewChatSession, 
  getStoredActiveSessionId 
} from '../lib/aiHistory';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNotes: LocalNote[];
  currentNote?: LocalNote | null;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  activeNotes,
  currentNote,
}) => {
  const [config, setConfig] = useState<AiConfig>(() => {
    const saved = getStoredAiConfig();
    return saved || {
      provider: 'gemini',
      apiKey: '',
      model: '',
    };
  });

  const [view, setView] = useState<'setup' | 'chat'>('setup');
  const [isChecking, setIsChecking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History & Sessions state
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<AiChatSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current session's messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Sync state & history sessions whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const savedConfig = getStoredAiConfig();
      if (savedConfig && savedConfig.apiKey && savedConfig.apiKey.trim().length > 0) {
        setConfig(savedConfig);
        setView('chat');
      } else {
        setView('setup');
      }

      setErrorMsg('');
      setInputText('');

      // Load sessions
      const storedSessions = getStoredChatSessions();
      if (storedSessions.length > 0) {
        const storedActiveId = getStoredActiveSessionId();
        const current = storedSessions.find((s) => s.id === storedActiveId) || storedSessions[0];
        setSessions(storedSessions);
        setActiveSessionId(current.id);
      } else {
        const freshSession = createNewChatSession();
        setSessions([freshSession]);
        setActiveSessionId(freshSession.id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidateAndSave = async () => {
    const trimmedKey = config.apiKey.trim();
    if (!trimmedKey) {
      setErrorMsg('Please enter an API key');
      return;
    }

    setIsChecking(true);
    setErrorMsg('');

    try {
      const activeModel = config.model?.trim() || DEFAULT_MODELS[config.provider];
      
      if (config.provider === 'custom' && !config.customEndpoint?.trim()) {
        setErrorMsg('Please enter an endpoint URL');
        setIsChecking(false);
        return;
      }

      const testConfig: AiConfig = {
        provider: config.provider,
        apiKey: trimmedKey,
        model: config.model?.trim() || undefined,
        customEndpoint: config.customEndpoint?.trim() || undefined,
      };

      // Perform a ping test query to verify API key validity
      await executeAiChat({
        ...testConfig,
        model: activeModel,
      }, {
        messages: [{ role: 'user', content: 'Ping' }],
      });

      // Save to storage on success
      setStoredAiConfig(testConfig);
      setConfig(testConfig);
      setIsChecking(false);
      setView('chat');
    } catch (err: any) {
      setIsChecking(false);
      setErrorMsg(err.message || 'API key verification failed. Please check the key.');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    const newSession = createNewChatSession();
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInputText('');
    setErrorMsg('');
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem('cloudnotes_ai_active_session_id_v1', sessionId);
    setErrorMsg('');
  };

  const handleConfirmDeleteSession = () => {
    if (!sessionToDelete) return;

    deleteChatSession(sessionToDelete.id);
    const updated = sessions.filter((s) => s.id !== sessionToDelete.id);
    setSessions(updated);

    if (activeSessionId === sessionToDelete.id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        const fresh = createNewChatSession();
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      }
    }

    setSessionToDelete(null);
  };

  const handleSendMessage = async () => {
    const query = inputText.trim();
    if (!query || isLoading) return;

    if (!config.apiKey) {
      setView('setup');
      return;
    }

    let currentSession = activeSession;
    if (!currentSession) {
      currentSession = createNewChatSession();
      setSessions([currentSession]);
      setActiveSessionId(currentSession.id);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    };

    // Auto-update session title if it's the default 'New Chat'
    const newTitle = currentSession.title === 'New Chat' || currentSession.messages.length === 0
      ? query.slice(0, 36).trim() + (query.length > 36 ? '...' : '')
      : currentSession.title;

    const newMessages = [...currentSession.messages, userMessage];

    const updatedSessionWithUser: AiChatSession = {
      ...currentSession,
      title: newTitle,
      messages: newMessages,
      updatedAt: Date.now(),
    };

    saveChatSession(updatedSessionWithUser);
    setSessions(prev => prev.map(s => s.id === updatedSessionWithUser.id ? updatedSessionWithUser : s));
    setInputText('');
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Build safe unlocked notes context
      const unlockedContext = activeNotes
        .filter(n => !n.is_locked && !n.is_deleted)
        .map(n => `### ${n.title}\n${n.content}`)
        .join('\n\n---\n\n');

      const currentNoteContext = currentNote && !currentNote.is_locked 
        ? `\n\nActive Note (${currentNote.title}):\n${currentNote.content}` 
        : '';
      const combinedContext = (unlockedContext + currentNoteContext).slice(0, 6000);

      const replyText = await executeAiChat(config, {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        contextNotes: combinedContext,
      });

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyText,
      };

      const finalSession: AiChatSession = {
        ...updatedSessionWithUser,
        messages: [...newMessages, assistantMessage],
        updatedAt: Date.now(),
      };

      saveChatSession(finalSession);
      setSessions(prev => prev.map(s => s.id === finalSession.id ? finalSession : s));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const providers: { id: AiProvider; label: string }[] = [
    { id: 'gemini', label: 'Gemini' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'anthropic', label: 'Claude' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'groq', label: 'Groq' },
    { id: 'deepseek', label: 'DeepSeek' },
    { id: 'custom', label: 'Custom' },
  ];
  const hasSavedKey = Boolean(getStoredAiConfig()?.apiKey);

  const formatSessionTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-modal-in">
      <div 
        className={`relative w-full rounded-2xl modal-surface shadow-2xl flex flex-col overflow-hidden text-left border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141518] transition-all duration-300 ease-out ${
          view === 'setup'
            ? 'max-w-lg max-h-[85vh]'
            : 'max-w-4xl h-[650px] max-h-[90vh]'
        }`}
      >
        
        {/* ================= STEP 1: API KEY SETUP ================= */}
        {view === 'setup' ? (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800/80">
              <div className="flex items-center space-x-2.5">
                {hasSavedKey && (
                  <button
                    onClick={() => {
                      setErrorMsg('');
                      setView('chat');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Back to chat"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">AI Setup</h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">Configure your API key to continue</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[calc(85vh-130px)] overflow-y-auto">
              {/* Provider Selection */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-2">
                  Provider
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#1c1d22]">
                  {providers.map((p) => {
                    const isSelected = config.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setConfig(prev => ({ 
                            ...prev, 
                            provider: p.id, 
                            model: '',
                            customEndpoint: prev.customEndpoint || (p.id === 'custom' ? 'https://api.openai.com/v1/chat/completions' : undefined)
                          }));
                          setErrorMsg('');
                        }}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-mono transition-all truncate text-center ${
                          isSelected
                            ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 font-semibold shadow-sm'
                            : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                        }`}
                        title={p.label}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Endpoint URL (for Custom provider) */}
              {config.provider === 'custom' && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-1.5">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={config.customEndpoint || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, customEndpoint: e.target.value }))}
                    placeholder="https://api.your-router.com/v1/chat/completions"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 font-mono transition-colors"
                  />
                </div>
              )}

              {/* Model Name Input */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-1.5">
                  Model
                </label>
                <input
                  type="text"
                  value={config.model || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Enter model name..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 font-mono transition-colors"
                />
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, apiKey: e.target.value }));
                    if (errorMsg) setErrorMsg('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !isChecking && handleValidateAndSave()}
                  placeholder={`Paste ${config.provider} API key...`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 font-mono transition-colors"
                />
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Action Button Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-[#141518]">
              <button
                type="button"
                onClick={handleValidateAndSave}
                disabled={isChecking || !config.apiKey.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ================= STEP 2: CHAT WITH SIDEBAR ================= */
          <div className="flex flex-col h-full relative">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-neutral-800/80 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                {/* Toggle Sidebar Icon Button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isSidebarOpen
                      ? 'bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 border-slate-300 dark:border-neutral-700'
                      : 'bg-slate-100 dark:bg-[#18191d] text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100'
                  }`}
                  title={isSidebarOpen ? "Close chat history" : "Open chat history"}
                  aria-label="Toggle history sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>

                <span className="font-semibold text-slate-900 dark:text-neutral-100 text-sm">Ask AI</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400">
                  {config.provider}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setErrorMsg('');
                    setView('setup');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Change API Key / Provider"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Area: Sidebar + Chat */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Collapsible History Sidebar */}
              {isSidebarOpen && (
                <div className="w-60 sm:w-64 border-r border-slate-100 dark:border-neutral-800/80 bg-slate-50/70 dark:bg-[#111214] flex flex-col flex-shrink-0 animate-fade-in">
                  {/* New Chat Button */}
                  <div className="p-3 border-b border-slate-100 dark:border-neutral-800/60">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-medium flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer"
                    >
                      <SquarePen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>New Chat</span>
                    </button>
                  </div>

                  {/* Sessions List */}
                  <div className="p-2 flex-1 overflow-y-auto space-y-1">
                    {sessions.length === 0 ? (
                      <div className="text-center py-8 text-[11px] text-slate-400 dark:text-neutral-500">
                        No previous chats
                      </div>
                    ) : (
                      sessions.map((s) => {
                        const isActive = s.id === activeSessionId;
                        return (
                          <div
                            key={s.id}
                            onClick={() => handleSelectSession(s.id)}
                            className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                              isActive
                                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 font-semibold shadow-sm border border-slate-200/80 dark:border-neutral-700/80'
                                : 'text-slate-600 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#18191d] hover:text-slate-900 dark:hover:text-neutral-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate pr-6">
                              <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                              <div className="truncate text-left">
                                <p className="truncate text-[12px] leading-tight">{s.title}</p>
                                <span className="text-[10px] font-normal text-slate-400 dark:text-neutral-500">
                                  {formatSessionTime(s.updatedAt)}
                                </span>
                              </div>
                            </div>

                            {/* Delete Button on Hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(s);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Chat View Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#141518]">
                {/* Conversation Messages */}
                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
                  {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-neutral-500 py-20">
                      <MessageSquare className="w-7 h-7 mb-2 opacity-30 text-purple-500" />
                      <p className="text-xs">Start a conversation with AI about your notes.</p>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`relative group max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed ${
                            isUser
                              ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-br-sm text-xs sm:text-sm whitespace-pre-wrap'
                              : 'bg-slate-100 dark:bg-[#18191d] border border-slate-200/80 dark:border-neutral-800/80 text-slate-800 dark:text-neutral-200 rounded-bl-sm'
                          }`}
                        >
                          {!isUser && (
                            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="p-1 rounded-md bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 transition-colors shadow-sm"
                                title="Copy message"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}

                          {isUser ? (
                            msg.content
                          ) : (
                            <MarkdownRenderer content={msg.content} />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex items-center space-x-2 text-slate-400 dark:text-neutral-500 text-xs py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                      <span>Thinking...</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
                      {errorMsg}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-neutral-800/80 flex items-center space-x-2 bg-slate-50/50 dark:bg-[#141518] flex-shrink-0">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputText.trim()}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Delete History Confirmation Modal */}
        {sessionToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-modal-in">
            <div className="w-full max-w-sm rounded-2xl p-5 bg-white dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 shadow-2xl space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Delete Conversation</h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                  Permanently delete <span className="font-semibold text-slate-700 dark:text-neutral-200">"{sessionToDelete.title}"</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSession}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};



