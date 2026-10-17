/**
 * BYOK AI Note Assistant Module
 * Supports Google Gemini, OpenAI, Groq, DeepSeek, and custom OpenAI-compatible endpoints.
 */

export type AiProvider = 'gemini' | 'openai' | 'groq' | 'deepseek' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
  customEndpoint?: string;
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  custom: 'default',
};

export interface AiPromptRequest {
  action: 'summarize' | 'grammar' | 'action_items' | 'qa';
  noteContent?: string;
  userQuestion?: string;
  allUnlockedNotesContext?: string;
}

/**
 * Build appropriate AI prompt according to the requested action
 */
export function buildPrompt(req: AiPromptRequest): { systemInstruction: string; userMessage: string } {
  const systemInstruction = `You are CloudNotes AI Assistant, a concise, privacy-conscious productivity assistant. Provide clear, accurate answers formatted in clean markdown. Always respond in the same language as the user or note content unless instructed otherwise.`;

  switch (req.action) {
    case 'summarize':
      return {
        systemInstruction,
        userMessage: `Please summarize the following note content into key takeaways with bullet points:\n\n${req.noteContent || ''}`,
      };
    case 'grammar':
      return {
        systemInstruction,
        userMessage: `Please fix any spelling, punctuation, and grammar issues in the following note content while preserving its original meaning and tone:\n\n${req.noteContent || ''}`,
      };
    case 'action_items':
      return {
        systemInstruction,
        userMessage: `Extract all actionable tasks, to-dos, and deadlines from this note as a markdown task list (- [ ] Task):\n\n${req.noteContent || ''}`,
      };
    case 'qa':
      return {
        systemInstruction,
        userMessage: `Context from user notes (only unlocked notes):\n${req.allUnlockedNotesContext || 'No additional notes.'}\n\nUser Question: ${req.userQuestion || ''}`,
      };
  }
}

/**
 * Execute AI generation across any of the supported providers
 */
export async function executeAiQuery(config: AiConfig, request: AiPromptRequest): Promise<string> {
  const { apiKey, provider } = config;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(`API key is required for provider: ${provider}`);
  }

  const { systemInstruction, userMessage } = buildPrompt(request);
  const model = config.model || DEFAULT_MODELS[provider];

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || 'No response generated from Gemini.';
  }

  // OpenAI / Groq / DeepSeek / Custom (all follow OpenAI-compatible chat completions)
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/chat/completions';
  } else if (provider === 'custom' && config.customEndpoint) {
    endpoint = config.customEndpoint;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider.toUpperCase()} API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}
