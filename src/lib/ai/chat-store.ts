/**
 * @file src/lib/ai/chat-store.ts
 * @description AI 챗 세션·메시지 CRUD — data/ai-chats/ JSON 파일 기반.
 *
 * 초보자 가이드:
 * - 각 세션은 data/ai-chats/{sessionId}.json으로 저장
 * - index.json에 세션 목록 메타 관리
 * - DB 불필요 — 서버별 data/ 폴더로 독립 관리
 */

import {
  loadSessionIndex, loadChatSession, saveChatSession, deleteChatSession as deleteFile,
  type SessionIndex, type ChatSession, type ChatMessage,
} from '@/lib/ai-config';
import { randomUUID } from 'crypto';

// re-export for API routes
export type SessionMeta = SessionIndex;
export type ChatMessageRow = ChatMessage & { sessionId: string };
export type { ChatSession };

export interface NewMessage {
  sessionId:  string;
  role:       ChatMessage['role'];
  content?:   string | null;
  sqlText?:   string | null;
  resultJson?: string | null;
  tokensIn?:  number;
  tokensOut?: number;
  execMs?:    number;
}

export async function createSession(opts: {
  title?: string; providerId?: string; modelId?: string; personaId?: string;
} = {}): Promise<string> {
  const sessionId = randomUUID();
  const session: ChatSession = {
    sessionId,
    title: opts.title || '새 대화',
    providerId: opts.providerId || null,
    modelId: opts.modelId || null,
    personaId: opts.personaId || null,
    createdAt: new Date().toISOString(),
    lastMessageAt: null,
    messages: [],
  };
  await saveChatSession(session);
  return sessionId;
}

export async function listSessions(limit = 50): Promise<SessionMeta[]> {
  const index = await loadSessionIndex();
  index.sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  return index.slice(0, limit);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteFile(sessionId);
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  const session = await loadChatSession(sessionId);
  if (!session) return;
  session.title = title;
  await saveChatSession(session);
}

export async function loadMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const session = await loadChatSession(sessionId);
  if (!session) return [];
  return session.messages.map((m) => ({ ...m, sessionId }));
}

export async function appendMessage(msg: NewMessage): Promise<string> {
  const session = await loadChatSession(msg.sessionId);
  if (!session) throw new Error(`Session ${msg.sessionId} not found`);

  const messageId = randomUUID();
  const chatMsg: ChatMessage = {
    messageId,
    role: msg.role,
    content: msg.content ?? null,
    sqlText: msg.sqlText ?? null,
    resultJson: msg.resultJson ?? null,
    tokensIn: msg.tokensIn ?? null,
    tokensOut: msg.tokensOut ?? null,
    execMs: msg.execMs ?? null,
    createdAt: new Date().toISOString(),
  };
  session.messages.push(chatMsg);
  session.lastMessageAt = chatMsg.createdAt;
  await saveChatSession(session);
  return messageId;
}

export async function updateSessionMeta(sessionId: string, opts: {
  title?: string; providerId?: string; modelId?: string; personaId?: string;
}): Promise<void> {
  const session = await loadChatSession(sessionId);
  if (!session) return;
  if (opts.title !== undefined) session.title = opts.title;
  if (opts.providerId !== undefined) session.providerId = opts.providerId;
  if (opts.modelId !== undefined) session.modelId = opts.modelId;
  if (opts.personaId !== undefined) session.personaId = opts.personaId;
  await saveChatSession(session);
}
