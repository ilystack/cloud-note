/**
 * BYOK AI Chat Assistant Module
 * Supports Google Gemini, OpenAI, Anthropic Claude, OpenRouter, Groq, DeepSeek, and Custom endpoints.
 */

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq' | 'deepseek' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
  customEndpoint?: string;
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  openrouter: 'anthropic/claude-3.5-haiku',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  custom: 'gpt-4o-mini',
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  contextNotes?: string;
}

/**
 * Execute multi-turn conversational AI chat
 */
export async function executeAiChat(config: AiConfig, request: AiChatRequest): Promise<string> {
  const { apiKey, provider } = config;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(`API key is required for provider: ${provider}`);
  }

  const model = config.model || DEFAULT_MODELS[provider];
  const systemPrompt = request.contextNotes
    ? `You are CloudNotes Assistant, a concise, helpful assistant. Format replies in clean markdown. Reply in the same language as the user.\n\nUser unlocked notes context:\n${request.contextNotes}`
    : `You are CloudNotes Assistant, a concise, helpful assistant. Format replies in clean markdown. Reply in the same language as the user.`;

  // 1. Google Gemini
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = request.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.5 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  }

  // 2. Anthropic Claude (Messages API)
  if (provider === 'anthropic') {
    const url = 'https://api.anthropic.com/v1/messages';
    const messages = request.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || 'No response generated.';
  }

  // 3. OpenAI / OpenRouter / Groq / DeepSeek / Custom (OpenAI-compatible)
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/chat/completions';
  } else if (provider === 'custom' && config.customEndpoint) {
    endpoint = config.customEndpoint;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://cloudnotes.app';
    headers['X-Title'] = 'CloudNotes';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...request.messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider.toUpperCase()} error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

/**
 * Backward-compatible helper for single prompt execution
 */
export async function executeAiQuery(
  config: AiConfig,
  request: {
    userQuestion?: string;
    allUnlockedNotesContext?: string;
    action?: string;
    noteContent?: string;
    messages?: { role: 'user' | 'assistant'; content: string }[];
  }
): Promise<string> {
  const userText = request.userQuestion || request.noteContent || 'Ping';
  const messages = request.messages || [{ role: 'user', content: userText }];

  return executeAiChat(config, {
    messages,
    contextNotes: request.allUnlockedNotesContext,
  });
}

