/**
 * @file src/lib/ai/chat-store.ts
 * @description AI 챗 세션·메시지 CRUD — Oracle DB(AI_CHAT_SESSION / AI_CHAT_MESSAGE) 기반.
 *
 * 초보자 가이드:
 * - 세션 목록은 AI_CHAT_SESSION 테이블에서 관리
 * - 메시지는 AI_CHAT_MESSAGE 테이블에 저장 (SESSION_ID FK, ON DELETE CASCADE)
 * - DML(INSERT/UPDATE/DELETE)은 반드시 executeDml() 사용 (커밋 포함)
 * - SELECT는 executeQuery<T>() 사용
 * - 날짜는 TO_CHAR(col, 'YYYY-MM-DD"T"HH24:MI:SS') ISO 포맷으로 반환
 */

import { executeQuery, executeDml } from '@/lib/db';
import { randomUUID } from 'crypto';

/* ------------------------------------------------------------------ */
/*  타입 정의                                                          */
/* ------------------------------------------------------------------ */

/** 세션 목록에 표시할 메타 정보 */
export interface SessionMeta {
  sessionId: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  personaId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

/** 단일 메시지 */
export interface ChatMessage {
  messageId: string;
  role: string;
  content: string | null;
  sqlText: string | null;
  resultJson: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  execMs: number | null;
  sqlGenMs: number | null;
  sqlExecMs: number | null;
  analysisMs: number | null;
  createdAt: string;
}

/** 메시지 + 세션ID (API 응답용) */
export type ChatMessageRow = ChatMessage & { sessionId: string };

/** 세션 전체 (메시지 포함) */
export interface ChatSession {
  sessionId: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  personaId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  messages: ChatMessage[];
}

/** 새 메시지 추가 시 입력 */
export interface NewMessage {
  sessionId: string;
  role: string;
  content?: string | null;
  sqlText?: string | null;
  resultJson?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  execMs?: number;
  sqlGenMs?: number;
  sqlExecMs?: number;
  analysisMs?: number;
}

/* ------------------------------------------------------------------ */
/*  DB row → TS 객체 매퍼                                              */
/* ------------------------------------------------------------------ */

/** Oracle SELECT 결과의 대문자 컬럼명을 camelCase TS 객체로 변환 */
interface SessionRow {
  SESSION_ID: string;
  TITLE: string;
  PROVIDER_ID: string | null;
  MODEL_ID: string | null;
  PERSONA_ID: string | null;
  CREATED_AT: string;
  LAST_MESSAGE_AT: string | null;
  MESSAGE_COUNT: number;
}

interface MessageRow {
  MESSAGE_ID: string;
  SESSION_ID?: string;
  ROLE: string;
  CONTENT: string | null;
  SQL_TEXT: string | null;
  RESULT_JSON: string | null;
  TOKENS_IN: number | null;
  TOKENS_OUT: number | null;
  EXEC_MS: number | null;
  SQL_GEN_MS: number | null;
  SQL_EXEC_MS: number | null;
  ANALYSIS_MS: number | null;
  CREATED_AT: string;
}

function toSessionMeta(r: SessionRow): SessionMeta {
  return {
    sessionId: r.SESSION_ID,
    title: r.TITLE,
    providerId: r.PROVIDER_ID ?? null,
    modelId: r.MODEL_ID ?? null,
    personaId: r.PERSONA_ID ?? null,
    createdAt: r.CREATED_AT,
    lastMessageAt: r.LAST_MESSAGE_AT ?? null,
    messageCount: r.MESSAGE_COUNT ?? 0,
  };
}

function toChatMessage(r: MessageRow): ChatMessage {
  return {
    messageId: r.MESSAGE_ID,
    role: r.ROLE,
    content: r.CONTENT ?? null,
    sqlText: r.SQL_TEXT ?? null,
    resultJson: r.RESULT_JSON ?? null,
    tokensIn: r.TOKENS_IN ?? null,
    tokensOut: r.TOKENS_OUT ?? null,
    execMs: r.EXEC_MS ?? null,
    sqlGenMs: r.SQL_GEN_MS ?? null,
    sqlExecMs: r.SQL_EXEC_MS ?? null,
    analysisMs: r.ANALYSIS_MS ?? null,
    createdAt: r.CREATED_AT,
  };
}

/* ------------------------------------------------------------------ */
/*  날짜 포맷 SQL 조각                                                 */
/* ------------------------------------------------------------------ */

const TS_FMT = `'YYYY-MM-DD"T"HH24:MI:SS'`;

/* ------------------------------------------------------------------ */
/*  CRUD 함수                                                          */
/* ------------------------------------------------------------------ */

/**
 * 새 세션을 생성하고 SESSION_ID를 반환한다.
 */
export async function createSession(opts: {
  title?: string;
  providerId?: string;
  modelId?: string;
  personaId?: string;
} = {}): Promise<string> {
  const sessionId = randomUUID();
  await executeDml(
    `INSERT INTO AI_CHAT_SESSION (SESSION_ID, TITLE, PROVIDER_ID, MODEL_ID, PERSONA_ID)
     VALUES (:sid, :title, :pid, :mid, :perid)`,
    {
      sid: sessionId,
      title: opts.title || '새 대화',
      pid: opts.providerId || null,
      mid: opts.modelId || null,
      perid: opts.personaId || null,
    },
  );
  return sessionId;
}

/**
 * 세션 목록을 최근 메시지 순으로 조회한다.
 */
export async function listSessions(limit = 50): Promise<SessionMeta[]> {
  const rows = await executeQuery<SessionRow>(
    `SELECT SESSION_ID, TITLE, PROVIDER_ID, MODEL_ID, PERSONA_ID,
            TO_CHAR(CREATED_AT, ${TS_FMT}) AS CREATED_AT,
            TO_CHAR(LAST_MESSAGE_AT, ${TS_FMT}) AS LAST_MESSAGE_AT,
            MESSAGE_COUNT
       FROM AI_CHAT_SESSION
      ORDER BY COALESCE(LAST_MESSAGE_AT, CREATED_AT) DESC
      FETCH FIRST :lim ROWS ONLY`,
    { lim: limit },
  );
  return rows.map(toSessionMeta);
}

/**
 * 단일 세션 삭제 (CASCADE로 메시지도 함께 삭제).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await executeDml(
    `DELETE FROM AI_CHAT_SESSION WHERE SESSION_ID = :sid`,
    { sid: sessionId },
  );
}

/**
 * 여러 세션을 일괄 삭제한다.
 * Oracle IN 절에 바인드 배열을 직접 넣을 수 없으므로 반복 실행.
 */
export async function deleteSessions(sessionIds: string[]): Promise<void> {
  for (const sid of sessionIds) {
    await executeDml(
      `DELETE FROM AI_CHAT_SESSION WHERE SESSION_ID = :sid`,
      { sid },
    );
  }
}

/**
 * 세션 제목을 변경한다.
 */
export async function renameSession(sessionId: string, title: string): Promise<void> {
  await executeDml(
    `UPDATE AI_CHAT_SESSION SET TITLE = :title WHERE SESSION_ID = :sid`,
    { title, sid: sessionId },
  );
}

/**
 * 특정 세션의 메시지 목록을 시간 순으로 조회한다.
 */
export async function loadMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const rows = await executeQuery<MessageRow & { SESSION_ID: string }>(
    `SELECT MESSAGE_ID, SESSION_ID, ROLE, CONTENT, SQL_TEXT, RESULT_JSON,
            TOKENS_IN, TOKENS_OUT, EXEC_MS, SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS,
            TO_CHAR(CREATED_AT, ${TS_FMT}) AS CREATED_AT
       FROM AI_CHAT_MESSAGE
      WHERE SESSION_ID = :sid
      ORDER BY CREATED_AT`,
    { sid: sessionId },
  );
  return rows.map((r) => ({ ...toChatMessage(r), sessionId: r.SESSION_ID }));
}

/**
 * 메시지를 추가하고 세션의 MESSAGE_COUNT, LAST_MESSAGE_AT를 갱신한다.
 * @returns 생성된 MESSAGE_ID
 */
export async function appendMessage(msg: NewMessage): Promise<string> {
  const messageId = randomUUID();

  // 메시지 INSERT
  await executeDml(
    `INSERT INTO AI_CHAT_MESSAGE
       (MESSAGE_ID, SESSION_ID, ROLE, CONTENT, SQL_TEXT, RESULT_JSON,
        TOKENS_IN, TOKENS_OUT, EXEC_MS, SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS)
     VALUES
       (:mid, :sid, :role, :content, :sqlText, :resultJson,
        :tokensIn, :tokensOut, :execMs, :sqlGenMs, :sqlExecMs, :analysisMs)`,
    {
      mid: messageId,
      sid: msg.sessionId,
      role: msg.role,
      content: msg.content ?? null,
      sqlText: msg.sqlText ?? null,
      resultJson: msg.resultJson ?? null,
      tokensIn: msg.tokensIn ?? null,
      tokensOut: msg.tokensOut ?? null,
      execMs: msg.execMs ?? null,
      sqlGenMs: msg.sqlGenMs ?? null,
      sqlExecMs: msg.sqlExecMs ?? null,
      analysisMs: msg.analysisMs ?? null,
    },
  );

  // 세션 메타 갱신 (카운트 + 최종 메시지 시각)
  await executeDml(
    `UPDATE AI_CHAT_SESSION
        SET MESSAGE_COUNT   = MESSAGE_COUNT + 1,
            LAST_MESSAGE_AT = SYSTIMESTAMP
      WHERE SESSION_ID = :sid`,
    { sid: msg.sessionId },
  );

  return messageId;
}

/**
 * 세션 메타 정보를 동적으로 업데이트한다.
 * 전달된 필드만 SET 절에 포함.
 */
export async function updateSessionMeta(sessionId: string, opts: {
  title?: string;
  providerId?: string;
  modelId?: string;
  personaId?: string;
}): Promise<void> {
  const sets: string[] = [];
  const binds: Record<string, string | number | null> = { sid: sessionId };

  if (opts.title !== undefined) {
    sets.push('TITLE = :title');
    binds.title = opts.title;
  }
  if (opts.providerId !== undefined) {
    sets.push('PROVIDER_ID = :pid');
    binds.pid = opts.providerId;
  }
  if (opts.modelId !== undefined) {
    sets.push('MODEL_ID = :mid');
    binds.mid = opts.modelId;
  }
  if (opts.personaId !== undefined) {
    sets.push('PERSONA_ID = :perid');
    binds.perid = opts.personaId;
  }

  if (sets.length === 0) return;

  await executeDml(
    `UPDATE AI_CHAT_SESSION SET ${sets.join(', ')} WHERE SESSION_ID = :sid`,
    binds,
  );
}
