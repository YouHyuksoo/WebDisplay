/**
 * @file src/lib/ai/chat-store.ts
 * @description AI_CHAT_SESSION/AI_CHAT_MESSAGE 테이블 CRUD.
 *
 * 초보자 가이드:
 * - createSession: 새 세션 INSERT, sessionId 반환
 * - listSessions: 최근 정렬 N개
 * - loadMessages: 세션의 모든 메시지 시간순
 * - appendMessage: 메시지 INSERT + 세션의 LAST_MESSAGE_AT/MESSAGE_COUNT 갱신
 */

import type oracledb from 'oracledb';
import { executeQuery, executeDml } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface SessionMeta {
  sessionId:      string;
  title:          string;
  providerId:     string | null;
  modelId:        string | null;
  personaId:      string | null;
  createdAt:      string;
  lastMessageAt:  string | null;
  messageCount:   number;
}

export interface ChatMessageRow {
  messageId: string;
  sessionId: string;
  role:      'user' | 'assistant' | 'system' | 'sql' | 'sql_result';
  content:   string | null;
  sqlText:   string | null;
  resultJson: string | null;
  tokensIn:  number | null;
  tokensOut: number | null;
  execMs:    number | null;
  createdAt: string;
}

export interface NewMessage {
  sessionId:  string;
  role:       ChatMessageRow['role'];
  content?:   string | null;
  sqlText?:   string | null;
  resultJson?: string | null;
  tokensIn?:  number;
  tokensOut?: number;
  execMs?:    number;
}

interface SessionDbRow {
  SESSION_ID: string; TITLE: string;
  PROVIDER_ID: string | null; MODEL_ID: string | null; PERSONA_ID: string | null;
  CREATED_AT: Date; LAST_MESSAGE_AT: Date | null; MESSAGE_COUNT: number;
}

interface MessageDbRow {
  MESSAGE_ID: string; SESSION_ID: string; ROLE: string;
  CONTENT: string | null; SQL_TEXT: string | null; RESULT_JSON: string | null;
  TOKENS_IN: number | null; TOKENS_OUT: number | null; EXEC_MS: number | null;
  CREATED_AT: Date;
}

export async function createSession(opts: {
  title?: string; providerId?: string; modelId?: string; personaId?: string;
} = {}): Promise<string> {
  const sessionId = randomUUID();
  const title = opts.title || '새 대화';
  await executeDml(
    `INSERT INTO AI_CHAT_SESSION (SESSION_ID,TITLE,PROVIDER_ID,MODEL_ID,PERSONA_ID,CREATED_AT)
     VALUES (:sessionId,:title,:providerId,:modelId,:personaId,SYSTIMESTAMP)`,
    {
      sessionId, title,
      providerId: opts.providerId || null,
      modelId:    opts.modelId    || null,
      personaId:  opts.personaId  || null,
    },
  );
  return sessionId;
}

export async function listSessions(limit = 50): Promise<SessionMeta[]> {
  const rows = await executeQuery<SessionDbRow>(
    `SELECT * FROM (
       SELECT SESSION_ID,TITLE,PROVIDER_ID,MODEL_ID,PERSONA_ID,
              CREATED_AT,LAST_MESSAGE_AT,MESSAGE_COUNT
         FROM AI_CHAT_SESSION
        ORDER BY NVL(LAST_MESSAGE_AT, CREATED_AT) DESC
     ) WHERE ROWNUM <= :limit`,
    { limit },
  );
  return rows.map((r) => ({
    sessionId: r.SESSION_ID,
    title: r.TITLE,
    providerId: r.PROVIDER_ID,
    modelId: r.MODEL_ID,
    personaId: r.PERSONA_ID,
    createdAt: r.CREATED_AT.toISOString(),
    lastMessageAt: r.LAST_MESSAGE_AT?.toISOString() ?? null,
    messageCount: r.MESSAGE_COUNT,
  }));
}

export async function deleteSession(sessionId: string): Promise<void> {
  await executeDml('DELETE FROM AI_CHAT_SESSION WHERE SESSION_ID = :sessionId', { sessionId });
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  await executeDml(
    'UPDATE AI_CHAT_SESSION SET TITLE = :title WHERE SESSION_ID = :sessionId',
    { title, sessionId },
  );
}

export async function loadMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const rows = await executeQuery<MessageDbRow>(
    `SELECT MESSAGE_ID,SESSION_ID,ROLE,CONTENT,SQL_TEXT,RESULT_JSON,
            TOKENS_IN,TOKENS_OUT,EXEC_MS,CREATED_AT
       FROM AI_CHAT_MESSAGE
      WHERE SESSION_ID = :sessionId
      ORDER BY CREATED_AT, MESSAGE_ID`,
    { sessionId },
  );
  return rows.map((r) => ({
    messageId: r.MESSAGE_ID, sessionId: r.SESSION_ID,
    role: r.ROLE as ChatMessageRow['role'],
    content: r.CONTENT, sqlText: r.SQL_TEXT, resultJson: r.RESULT_JSON,
    tokensIn: r.TOKENS_IN, tokensOut: r.TOKENS_OUT, execMs: r.EXEC_MS,
    createdAt: r.CREATED_AT.toISOString(),
  }));
}

export async function appendMessage(msg: NewMessage): Promise<string> {
  const messageId = randomUUID();
  await executeDml(
    `INSERT INTO AI_CHAT_MESSAGE
       (MESSAGE_ID,SESSION_ID,ROLE,CONTENT,SQL_TEXT,RESULT_JSON,
        TOKENS_IN,TOKENS_OUT,EXEC_MS,CREATED_AT)
     VALUES
       (:messageId,:sessionId,:role,:content,:sqlText,:resultJson,
        :tokensIn,:tokensOut,:execMs,SYSTIMESTAMP)`,
    {
      messageId, sessionId: msg.sessionId, role: msg.role,
      content:    msg.content    ?? null,
      sqlText:    msg.sqlText    ?? null,
      resultJson: msg.resultJson ?? null,
      tokensIn:   msg.tokensIn   ?? null,
      tokensOut:  msg.tokensOut  ?? null,
      execMs:     msg.execMs     ?? null,
    },
  );
  await executeDml(
    `UPDATE AI_CHAT_SESSION
        SET LAST_MESSAGE_AT = SYSTIMESTAMP,
            MESSAGE_COUNT   = MESSAGE_COUNT + 1
      WHERE SESSION_ID = :sessionId`,
    { sessionId: msg.sessionId },
  );
  return messageId;
}

export async function updateSessionMeta(sessionId: string, opts: {
  title?: string; providerId?: string; modelId?: string; personaId?: string;
}): Promise<void> {
  const fields: string[] = [];
  const binds: Record<string, unknown> = { sessionId };
  if (opts.title !== undefined)      { fields.push('TITLE = :title');           binds.title = opts.title; }
  if (opts.providerId !== undefined) { fields.push('PROVIDER_ID = :providerId'); binds.providerId = opts.providerId; }
  if (opts.modelId !== undefined)    { fields.push('MODEL_ID = :modelId');       binds.modelId = opts.modelId; }
  if (opts.personaId !== undefined)  { fields.push('PERSONA_ID = :personaId');   binds.personaId = opts.personaId; }
  if (fields.length === 0) return;
  await executeDml(
    `UPDATE AI_CHAT_SESSION SET ${fields.join(', ')} WHERE SESSION_ID = :sessionId`,
    binds as oracledb.BindParameters,
  );
}
