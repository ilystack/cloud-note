import { ChatMessage } from '@cloudnotes/shared-types';

export interface AiChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY_AI_SESSIONS = 'cloudnotes_ai_chat_sessions_v1';
const STORAGE_KEY_ACTIVE_SESSION_ID = 'cloudnotes_ai_active_session_id_v1';

/**
 * Retrieve all saved AI chat sessions from localStorage
 */
export function getStoredChatSessions(): AiChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

/**
 * Save or update a chat session in localStorage
 */
export function saveChatSession(session: AiChatSession): void {
  try {
    const sessions = getStoredChatSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = {
        ...session,
        updatedAt: Date.now(),
      };
    } else {
      sessions.unshift({
        ...session,
        updatedAt: Date.now(),
      });
    }

    localStorage.setItem(STORAGE_KEY_AI_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION_ID, session.id);
  } catch (err) {
    console.error('Failed to save AI chat session:', err);
  }
}

/**
 * Delete a specific chat session permanently
 */
export function deleteChatSession(sessionId: string): void {
  try {
    const sessions = getStoredChatSessions().filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY_AI_SESSIONS, JSON.stringify(sessions));

    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION_ID);
    if (activeId === sessionId) {
      if (sessions.length > 0) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION_ID, sessions[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION_ID);
      }
    }
  } catch (err) {
    console.error('Failed to delete AI chat session:', err);
  }
}

/**
 * Create a new clean chat session
 */
export function createNewChatSession(initialTitle = 'New Chat'): AiChatSession {
  const newSession: AiChatSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: initialTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };

  saveChatSession(newSession);
  return newSession;
}

/**
 * Get active session ID
 */
export function getStoredActiveSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION_ID);
  } catch {
    return null;
  }
}
