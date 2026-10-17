import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Key, 
  Check, 
  Loader2, 
  FileText, 
  CheckSquare, 
  Languages, 
  ShieldCheck 
} from 'lucide-react';
import { 
  AiConfig, 
  AiProvider, 
  DEFAULT_MODELS, 
  executeAiQuery, 
  LocalNote 
} from '@cloudnotes/shared-types';
import { getStoredAiConfig, setStoredAiConfig } from '../lib/storage';

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
      model: DEFAULT_MODELS.gemini,
    };
  });

  const [isConfiguring, setIsConfiguring] = useState(!config.apiKey);
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    if (!config.apiKey.trim()) {
      setErrorMsg('Please enter a valid API key');
      return;
    }
    setErrorMsg('');
    setStoredAiConfig(config);
    setIsConfiguring(false);
  };

  const runAction = async (action: 'summarize' | 'grammar' | 'action_items' | 'qa', customPrompt?: string) => {
    if (!config.apiKey) {
      setIsConfiguring(true);
      return;
    }

    setIsLoading(true);
    setResponse('');
    setErrorMsg('');

    try {
      // Build safe context: ONLY unlocked notes, strictly excluding locked & trash
      const unlockedContext = activeNotes
        .filter(n => !n.is_locked && !n.is_deleted)
        .map(n => `### Note: ${n.title}\n${n.content}`)
        .join('\n\n---\n\n');

      const noteText = currentNote && !currentNote.is_locked ? currentNote.content : '';

      const answer = await executeAiQuery(config, {
        action,
        noteContent: noteText || unlockedContext.slice(0, 3000),
        userQuestion: customPrompt || userQuery,
        allUnlockedNotesContext: unlockedContext.slice(0, 6000),
      });

      setResponse(answer);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 glass-header">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center space-x-2">
                <span>AI Note Assistant</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">BYOK</span>
              </h3>
              <p className="text-xs text-slate-400">Contextual Q&A, summaries, and action extraction</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsConfiguring(prev => !prev)}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Configure API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BYOK Configuration Drawer */}
        {isConfiguring && (
          <div className="p-6 bg-slate-900/90 border-b border-slate-800 space-y-4">
            <h4 className="text-sm font-semibold text-slate-200">Configure AI Provider (BYOK)</h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['gemini', 'openai', 'groq', 'deepseek'] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, provider: p, model: DEFAULT_MODELS[p] }))}
                  className={`p-2.5 rounded-xl text-xs font-semibold uppercase border transition-all ${
                    config.provider === p
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">API Key for {config.provider.toUpperCase()}:</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={`Enter your ${config.provider} API Key`}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleSaveConfig}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save Key</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Action Pills */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 flex flex-wrap gap-2">
          <button
            onClick={() => runAction('summarize')}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Summarize</span>
          </button>

          <button
            onClick={() => runAction('action_items')}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Action Items</span>
          </button>

          <button
            onClick={() => runAction('grammar')}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
          >
            <Languages className="w-3.5 h-3.5 text-purple-400" />
            <span>Polish & Grammar</span>
          </button>
        </div>

        {/* Content & Response Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 min-h-[220px]">
          {/* Privacy Note */}
          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Privacy Guard: Locked notes and trash bin are strictly excluded from AI context.</span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-10 space-x-3 text-amber-400 text-sm font-medium">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Generating AI response...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {response && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {response}
            </div>
          )}
        </div>

        {/* Question Input Footer */}
        <div className="px-6 py-4 border-t border-slate-800 glass-header flex items-center space-x-3">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && userQuery.trim() && runAction('qa')}
            placeholder="Ask anything about your unlocked notes..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => userQuery.trim() && runAction('qa')}
            disabled={isLoading || !userQuery.trim()}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all disabled:opacity-50 shadow-md shadow-amber-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
