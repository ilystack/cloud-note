import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Check, 
  Loader2, 
  FileText, 
  CheckSquare, 
  Languages, 
  ShieldCheck,
  Copy,
  SlidersHorizontal
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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-modal-in">
      <div className="relative w-full max-w-2xl rounded-2xl modal-surface flex flex-col max-h-[90vh] overflow-hidden text-left">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141518]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900 dark:text-neutral-100 text-sm tracking-tight">AI Note Copilot</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                  {config.provider}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">Contextual writing, summaries, and synthesis</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsConfiguring(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-[#202126] transition-colors"
              title="Configure API Key"
              aria-label="Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-200 dark:hover:bg-[#202126] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isConfiguring && (
          <div className="p-5 bg-slate-100 dark:bg-[#141518] border-b border-slate-200 dark:border-neutral-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">AI Provider & Key Setup (BYOK)</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-500">Keys stored locally in browser</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['gemini', 'openai', 'groq', 'deepseek'] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, provider: p, model: DEFAULT_MODELS[p] }))}
                  className={`p-2 rounded-lg text-xs font-mono uppercase border transition-colors ${
                    config.provider === p
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                      : 'bg-white dark:bg-[#1c1d22] text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={`Paste your ${config.provider} API key here...`}
                className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-neutral-800/60 bg-slate-50 dark:bg-[#16171b] flex flex-wrap gap-2">
          <button
            onClick={() => runAction('summarize')}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1c1d22] hover:bg-slate-100 dark:hover:bg-[#25262c] text-slate-700 dark:text-neutral-300 text-xs font-medium border border-slate-200 dark:border-neutral-800 transition-colors disabled:opacity-50"
          >
            <FileText className="w-3 h-3 text-blue-500 dark:text-blue-400" />
            <span>Summarize</span>
          </button>

          <button
            onClick={() => runAction('action_items')}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1c1d22] hover:bg-slate-100 dark:hover:bg-[#25262c] text-slate-700 dark:text-neutral-300 text-xs font-medium border border-slate-200 dark:border-neutral-800 transition-colors disabled:opacity-50"
          >
            <CheckSquare className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            <span>Action Items</span>
          </button>

          <button
            onClick={() => runAction('grammar')}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1c1d22] hover:bg-slate-100 dark:hover:bg-[#25262c] text-slate-700 dark:text-neutral-300 text-xs font-medium border border-slate-200 dark:border-neutral-800 transition-colors disabled:opacity-50"
          >
            <Languages className="w-3 h-3 text-purple-500 dark:text-purple-400" />
            <span>Polish & Grammar</span>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4 min-h-[220px] bg-slate-50/50 dark:bg-[#121214]">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800/80 text-[11px] text-slate-600 dark:text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <span>Zero Knowledge: Locked notes and trash items are strictly excluded from AI context.</span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-10 space-x-2.5 text-amber-500 dark:text-amber-400 text-xs font-mono">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Synthesizing response...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {response && (
            <div className="relative group p-4 rounded-xl bg-white dark:bg-[#18191d] border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
              <div className="absolute top-2.5 right-2.5">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 dark:bg-[#222328] hover:bg-slate-200 dark:hover:bg-[#2b2c33] text-slate-700 dark:text-neutral-300 text-[10px] font-mono transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              {response}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141518] flex items-center space-x-2">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && userQuery.trim() && runAction('qa')}
            placeholder="Ask anything about your unlocked notes..."
            className="flex-1 px-3.5 py-2 rounded-lg bg-white dark:bg-[#121214] border border-slate-300 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
          />
          <button
            onClick={() => userQuery.trim() && runAction('qa')}
            disabled={isLoading || !userQuery.trim()}
            className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors disabled:opacity-50"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
