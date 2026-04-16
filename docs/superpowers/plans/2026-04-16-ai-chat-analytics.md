# AI 챗 분석 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 챗 저장소를 JSON→DB로 전환하고, 피드백 영속화 + 분석 대시보드를 구현한다.

**Architecture:** Oracle DB 기반. chat-store.ts 내부를 executeQuery/executeDml로 교체 (시그니처 유지). 피드백은 독립 테이블 AI_CHAT_FEEDBACK에 저장. 분석 페이지는 /ai-chat/analytics 라우트.

**Tech Stack:** Next.js 15 App Router, Oracle (oracledb), Recharts, Tailwind CSS 4

---

### Task 1: DB 마이그레이션 파일 생성

**Files:**
- Create: `migrations/002_ai_chat_feedback.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- migrations/002_ai_chat_feedback.sql
-- AI 챗 피드백 + 메시지 성능 필드 추가
-- 실행: oracle_connector.py --execute-file migrations/002_ai_chat_feedback.sql --site SVEHICLEPDB

-- AI_CHAT_MESSAGE에 성능 측정 컬럼 추가
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE AI_CHAT_MESSAGE ADD (SQL_GEN_MS NUMBER)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1430 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE AI_CHAT_MESSAGE ADD (SQL_EXEC_MS NUMBER)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1430 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE AI_CHAT_MESSAGE ADD (ANALYSIS_MS NUMBER)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1430 THEN RAISE; END IF;
END;
/

-- 피드백 테이블
CREATE TABLE AI_CHAT_FEEDBACK (
  FEEDBACK_ID      VARCHAR2(40)  PRIMARY KEY,
  MESSAGE_ID       VARCHAR2(40)  NOT NULL,
  SESSION_ID       VARCHAR2(40)  NOT NULL,
  RATING           VARCHAR2(10)  NOT NULL,
  USER_QUERY       CLOB,
  LLM_RESPONSE     CLOB,
  SQL_QUERY        CLOB,
  RESULT_JSON      CLOB,
  PROVIDER_ID      VARCHAR2(20),
  MODEL_ID         VARCHAR2(80),
  TOTAL_MS         NUMBER,
  SQL_GEN_MS       NUMBER,
  SQL_EXEC_MS      NUMBER,
  ANALYSIS_MS      NUMBER,
  CREATED_AT       TIMESTAMP DEFAULT SYSTIMESTAMP
)
/

CREATE INDEX IX_AI_FEEDBACK_CREATED ON AI_CHAT_FEEDBACK(CREATED_AT DESC)
/
CREATE INDEX IX_AI_FEEDBACK_RATING ON AI_CHAT_FEEDBACK(RATING)
/
CREATE INDEX IX_AI_FEEDBACK_SESSION ON AI_CHAT_FEEDBACK(SESSION_ID)
/

COMMIT
/
```

- [ ] **Step 2: DB에 마이그레이션 실행**

```bash
python C:/Users/hsyou/.claude/skills/oracle-db/scripts/oracle_connector.py --execute-file migrations/002_ai_chat_feedback.sql --site SVEHICLEPDB
```

Expected: `blocks_executed: 7`, 모든 블록 success

- [ ] **Step 3: 테이블 확인**

```bash
python C:/Users/hsyou/.claude/skills/oracle-db/scripts/oracle_connector.py --site SVEHICLEPDB --query "SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME = 'AI_CHAT_FEEDBACK'"
```

Expected: 1행 반환

- [ ] **Step 4: 커밋**

```bash
git add migrations/002_ai_chat_feedback.sql
git commit -m "feat: AI_CHAT_FEEDBACK 테이블 + 메시지 성능 컬럼 추가 (002)"
```

---

### Task 2: chat-store.ts JSON → DB 전환

**Files:**
- Modify: `src/lib/ai/chat-store.ts` (전체 재작성)

- [ ] **Step 1: chat-store.ts를 DB 기반으로 재작성**

기존 시그니처 유지, 내부를 `executeQuery`/`executeDml`로 교체.

```typescript
/**
 * @file src/lib/ai/chat-store.ts
 * @description AI 챗 세션·메시지 CRUD — Oracle DB 기반.
 * 초보자 가이드: AI_CHAT_SESSION + AI_CHAT_MESSAGE 테이블 사용.
 * 함수 시그니처는 기존 JSON 버전과 동일 — 호출하는 API 라우트 수정 불필요.
 */

import { executeQuery, executeDml } from '@/lib/db';
import { randomUUID } from 'crypto';

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

export type ChatMessageRow = ChatMessage & { sessionId: string };

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

export async function createSession(opts: {
  title?: string; providerId?: string; modelId?: string; personaId?: string;
} = {}): Promise<string> {
  const sessionId = randomUUID();
  await executeDml(
    `INSERT INTO AI_CHAT_SESSION (SESSION_ID, TITLE, PROVIDER_ID, MODEL_ID, PERSONA_ID)
     VALUES (:sessionId, :title, :providerId, :modelId, :personaId)`,
    {
      sessionId,
      title: opts.title || '새 대화',
      providerId: opts.providerId || null,
      modelId: opts.modelId || null,
      personaId: opts.personaId || null,
    },
  );
  return sessionId;
}

export async function listSessions(limit = 50): Promise<SessionMeta[]> {
  const rows = await executeQuery<{
    SESSION_ID: string; TITLE: string; PROVIDER_ID: string | null;
    MODEL_ID: string | null; PERSONA_ID: string | null;
    CREATED_AT: string; LAST_MESSAGE_AT: string | null; MESSAGE_COUNT: number;
  }>(
    `SELECT SESSION_ID, TITLE, PROVIDER_ID, MODEL_ID, PERSONA_ID,
            TO_CHAR(CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT,
            TO_CHAR(LAST_MESSAGE_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS LAST_MESSAGE_AT,
            MESSAGE_COUNT
       FROM AI_CHAT_SESSION
      ORDER BY LAST_MESSAGE_AT DESC NULLS LAST
      FETCH FIRST :limit ROWS ONLY`,
    { limit },
  );
  return rows.map((r) => ({
    sessionId: r.SESSION_ID,
    title: r.TITLE,
    providerId: r.PROVIDER_ID,
    modelId: r.MODEL_ID,
    personaId: r.PERSONA_ID,
    createdAt: r.CREATED_AT,
    lastMessageAt: r.LAST_MESSAGE_AT,
    messageCount: r.MESSAGE_COUNT,
  }));
}

export async function deleteSession(sessionId: string): Promise<void> {
  await executeDml(
    `DELETE FROM AI_CHAT_SESSION WHERE SESSION_ID = :sessionId`,
    { sessionId },
  );
}

export async function deleteSessions(sessionIds: string[]): Promise<void> {
  for (const id of sessionIds) {
    await executeDml(`DELETE FROM AI_CHAT_SESSION WHERE SESSION_ID = :id`, { id });
  }
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  await executeDml(
    `UPDATE AI_CHAT_SESSION SET TITLE = :title WHERE SESSION_ID = :sessionId`,
    { title, sessionId },
  );
}

export async function loadMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const rows = await executeQuery<{
    MESSAGE_ID: string; SESSION_ID: string; ROLE: string;
    CONTENT: string | null; SQL_TEXT: string | null; RESULT_JSON: string | null;
    TOKENS_IN: number | null; TOKENS_OUT: number | null;
    EXEC_MS: number | null; SQL_GEN_MS: number | null;
    SQL_EXEC_MS: number | null; ANALYSIS_MS: number | null;
    CREATED_AT: string;
  }>(
    `SELECT MESSAGE_ID, SESSION_ID, ROLE, CONTENT, SQL_TEXT, RESULT_JSON,
            TOKENS_IN, TOKENS_OUT, EXEC_MS, SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS,
            TO_CHAR(CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT
       FROM AI_CHAT_MESSAGE
      WHERE SESSION_ID = :sessionId
      ORDER BY CREATED_AT`,
    { sessionId },
  );
  return rows.map((r) => ({
    messageId: r.MESSAGE_ID,
    sessionId: r.SESSION_ID,
    role: r.ROLE,
    content: r.CONTENT,
    sqlText: r.SQL_TEXT,
    resultJson: r.RESULT_JSON,
    tokensIn: r.TOKENS_IN,
    tokensOut: r.TOKENS_OUT,
    execMs: r.EXEC_MS,
    sqlGenMs: r.SQL_GEN_MS,
    sqlExecMs: r.SQL_EXEC_MS,
    analysisMs: r.ANALYSIS_MS,
    createdAt: r.CREATED_AT,
  }));
}

export async function appendMessage(msg: NewMessage): Promise<string> {
  const messageId = randomUUID();
  await executeDml(
    `INSERT INTO AI_CHAT_MESSAGE
       (MESSAGE_ID, SESSION_ID, ROLE, CONTENT, SQL_TEXT, RESULT_JSON,
        TOKENS_IN, TOKENS_OUT, EXEC_MS, SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS)
     VALUES
       (:messageId, :sessionId, :role, :content, :sqlText, :resultJson,
        :tokensIn, :tokensOut, :execMs, :sqlGenMs, :sqlExecMs, :analysisMs)`,
    {
      messageId,
      sessionId: msg.sessionId,
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
  await executeDml(
    `UPDATE AI_CHAT_SESSION
        SET MESSAGE_COUNT = MESSAGE_COUNT + 1,
            LAST_MESSAGE_AT = SYSTIMESTAMP
      WHERE SESSION_ID = :sessionId`,
    { sessionId: msg.sessionId },
  );
  return messageId;
}

export async function updateSessionMeta(sessionId: string, opts: {
  title?: string; providerId?: string; modelId?: string; personaId?: string;
}): Promise<void> {
  const sets: string[] = [];
  const binds: Record<string, unknown> = { sessionId };
  if (opts.title !== undefined) { sets.push('TITLE = :title'); binds.title = opts.title; }
  if (opts.providerId !== undefined) { sets.push('PROVIDER_ID = :providerId'); binds.providerId = opts.providerId; }
  if (opts.modelId !== undefined) { sets.push('MODEL_ID = :modelId'); binds.modelId = opts.modelId; }
  if (opts.personaId !== undefined) { sets.push('PERSONA_ID = :personaId'); binds.personaId = opts.personaId; }
  if (sets.length === 0) return;
  await executeDml(
    `UPDATE AI_CHAT_SESSION SET ${sets.join(', ')} WHERE SESSION_ID = :sessionId`,
    binds,
  );
}
```

- [ ] **Step 2: ai-config.ts에서 JSON 관련 import 정리**

`chat-store.ts`가 더 이상 `ai-config.ts`의 JSON 함수를 사용하지 않으므로, 기존 `loadSessionIndex`, `loadChatSession`, `saveChatSession`, `deleteChatSession`, `deleteChatSessions` 함수는 남겨두되 chat-store에서 import 제거.

- [ ] **Step 3: TypeScript 타입 체크**

```bash
npx tsc --noEmit --pretty
```

Expected: 에러 없음. `NewMessage`에 `sqlGenMs`, `sqlExecMs`, `analysisMs`가 추가되었으므로 기존 호출부는 optional이라 호환.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/ai/chat-store.ts
git commit -m "refactor: chat-store JSON→DB 전환 (AI_CHAT_SESSION/MESSAGE)"
```

---

### Task 3: stream API 성능 측정 3단계 분리

**Files:**
- Modify: `src/app/api/ai-chat/stream/route.ts`

- [ ] **Step 1: SQL 생성 단계에 타이밍 추가**

`send('stage', { stage: 'sql_generation' })` 직전에 `const sqlGenStart = Date.now()` 추가.
SQL 스트림 완료 후 `const sqlGenMs = Date.now() - sqlGenStart` 계산.

- [ ] **Step 2: SQL 실행 단계에 타이밍 분리**

기존 `const t0 = Date.now()` → `const sqlExecStart = Date.now()`.
`const execMs = Date.now() - t0` → `const sqlExecMs = Date.now() - sqlExecStart`.

- [ ] **Step 3: 분석 단계에 타이밍 추가**

`send('stage', { stage: 'analysis' })` 직전에 `const analysisStart = Date.now()` 추가.
분석 스트림 완료 후 `const analysisMs = Date.now() - analysisStart` 계산.

- [ ] **Step 4: appendMessage 호출에 성능 필드 추가**

SQL 메시지 저장:
```typescript
await appendMessage({
  sessionId, role: 'sql', sqlText: guard.rewritten,
  content: `조회 ${resultRows.length}건 (${sqlExecMs}ms)`,
  execMs: sqlExecMs, sqlExecMs,
});
```

Assistant 메시지 저장:
```typescript
await appendMessage({
  sessionId, role: 'assistant', content: analysisText,
  tokensIn: chunk.tokensIn, tokensOut: chunk.tokensOut,
  sqlGenMs, analysisMs,
});
```

- [ ] **Step 5: SSE done 이벤트에 perf 데이터 포함**

```typescript
const totalMs = Date.now() - requestStart; // POST 함수 진입 시점에 const requestStart = Date.now()
send('done', {
  ok: true,
  perf: { totalMs, sqlGenMs, sqlExecMs, analysisMs },
});
```

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/ai-chat/stream/route.ts
git commit -m "feat: stream API 성능 측정 3단계 분리 (sqlGen/sqlExec/analysis)"
```

---

### Task 4: 피드백 API 구현

**Files:**
- Create: `src/app/api/ai-chat/feedback/route.ts`

- [ ] **Step 1: 피드백 CRUD API 작성**

```typescript
/**
 * @file src/app/api/ai-chat/feedback/route.ts
 * @description AI 챗 피드백 CRUD API.
 * POST: 피드백 저장, GET: 목록+통계 조회, DELETE: 선택/전체 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeDml } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST: 피드백 저장
export async function POST(request: NextRequest) {
  const body = await request.json();
  const feedbackId = randomUUID();
  await executeDml(
    `INSERT INTO AI_CHAT_FEEDBACK
       (FEEDBACK_ID, MESSAGE_ID, SESSION_ID, RATING,
        USER_QUERY, LLM_RESPONSE, SQL_QUERY, RESULT_JSON,
        PROVIDER_ID, MODEL_ID, TOTAL_MS, SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS)
     VALUES
       (:feedbackId, :messageId, :sessionId, :rating,
        :userQuery, :llmResponse, :sqlQuery, :resultJson,
        :providerId, :modelId, :totalMs, :sqlGenMs, :sqlExecMs, :analysisMs)`,
    {
      feedbackId,
      messageId: body.messageId,
      sessionId: body.sessionId,
      rating: body.rating,
      userQuery: body.userQuery ?? null,
      llmResponse: body.llmResponse ?? null,
      sqlQuery: body.sqlQuery ?? null,
      resultJson: body.resultJson ?? null,
      providerId: body.providerId ?? null,
      modelId: body.modelId ?? null,
      totalMs: body.totalMs ?? null,
      sqlGenMs: body.sqlGenMs ?? null,
      sqlExecMs: body.sqlExecMs ?? null,
      analysisMs: body.analysisMs ?? null,
    },
  );
  return NextResponse.json({ feedbackId });
}

// GET: 통계 또는 목록 조회
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mode = sp.get('mode') ?? 'list';
  const rating = sp.get('rating') ?? 'all';
  const providerId = sp.get('providerId') ?? '';
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo = sp.get('dateTo') ?? '';
  const page = Math.max(1, Number(sp.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(10, Number(sp.get('pageSize') ?? '20')));

  // 공통 WHERE 절
  let where = '1=1';
  const binds: Record<string, string | number> = {};
  if (rating && rating !== 'all') {
    where += ' AND f.RATING = :rating';
    binds.rating = rating;
  }
  if (providerId) {
    where += ' AND f.PROVIDER_ID = :providerId';
    binds.providerId = providerId;
  }
  if (dateFrom) {
    where += ` AND f.CREATED_AT >= TO_TIMESTAMP(:dateFrom || ' 00:00:00', 'YYYY-MM-DD HH24:MI:SS')`;
    binds.dateFrom = dateFrom;
  }
  if (dateTo) {
    where += ` AND f.CREATED_AT <= TO_TIMESTAMP(:dateTo || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
    binds.dateTo = dateTo;
  }

  if (mode === 'stats') {
    // 통계 집계
    const [summary] = await executeQuery<{
      TOTAL: number; POS: number; NEG: number; NEU: number;
      AVG_TOTAL: number; AVG_GEN: number; AVG_EXEC: number; AVG_ANALYSIS: number;
    }>(
      `SELECT COUNT(*) AS TOTAL,
              SUM(CASE WHEN f.RATING='POSITIVE' THEN 1 ELSE 0 END) AS POS,
              SUM(CASE WHEN f.RATING='NEGATIVE' THEN 1 ELSE 0 END) AS NEG,
              SUM(CASE WHEN f.RATING='NEUTRAL' THEN 1 ELSE 0 END) AS NEU,
              ROUND(AVG(f.TOTAL_MS)) AS AVG_TOTAL,
              ROUND(AVG(f.SQL_GEN_MS)) AS AVG_GEN,
              ROUND(AVG(f.SQL_EXEC_MS)) AS AVG_EXEC,
              ROUND(AVG(f.ANALYSIS_MS)) AS AVG_ANALYSIS
         FROM AI_CHAT_FEEDBACK f
        WHERE ${where}`,
      binds,
    );

    // 일별 사용량
    const daily = await executeQuery<{ DT: string; CNT: number; POS: number }>(
      `SELECT TO_CHAR(f.CREATED_AT, 'YYYY-MM-DD') AS DT,
              COUNT(*) AS CNT,
              SUM(CASE WHEN f.RATING='POSITIVE' THEN 1 ELSE 0 END) AS POS
         FROM AI_CHAT_FEEDBACK f
        WHERE ${where}
        GROUP BY TO_CHAR(f.CREATED_AT, 'YYYY-MM-DD')
        ORDER BY DT`,
      binds,
    );

    // TOP 질문
    const topQueries = await executeQuery<{ QUERY_TEXT: string; CNT: number }>(
      `SELECT SUBSTR(f.USER_QUERY, 1, 100) AS QUERY_TEXT, COUNT(*) AS CNT
         FROM AI_CHAT_FEEDBACK f
        WHERE ${where} AND f.USER_QUERY IS NOT NULL
        GROUP BY SUBSTR(f.USER_QUERY, 1, 100)
        ORDER BY CNT DESC
        FETCH FIRST 10 ROWS ONLY`,
      binds,
    );

    // 프로바이더별 통계
    const providerStats = await executeQuery<{
      PROVIDER_ID: string; CNT: number; POS: number; AVG_MS: number;
    }>(
      `SELECT f.PROVIDER_ID, COUNT(*) AS CNT,
              SUM(CASE WHEN f.RATING='POSITIVE' THEN 1 ELSE 0 END) AS POS,
              ROUND(AVG(f.TOTAL_MS)) AS AVG_MS
         FROM AI_CHAT_FEEDBACK f
        WHERE ${where} AND f.PROVIDER_ID IS NOT NULL
        GROUP BY f.PROVIDER_ID
        ORDER BY CNT DESC`,
      binds,
    );

    const total = summary?.TOTAL ?? 0;
    const positive = summary?.POS ?? 0;

    return NextResponse.json({
      totalFeedbacks: total,
      positive,
      negative: summary?.NEG ?? 0,
      neutral: summary?.NEU ?? 0,
      positiveRate: total > 0 ? Math.round((positive / total) * 1000) / 10 : 0,
      avgTotalMs: summary?.AVG_TOTAL ?? 0,
      avgSqlGenMs: summary?.AVG_GEN ?? 0,
      avgSqlExecMs: summary?.AVG_EXEC ?? 0,
      avgAnalysisMs: summary?.AVG_ANALYSIS ?? 0,
      dailyUsage: daily.map((d) => ({ date: d.DT, count: d.CNT, positive: d.POS })),
      topQueries: topQueries.map((q) => ({ query: q.QUERY_TEXT, count: q.CNT })),
      providerStats: providerStats.map((p) => ({
        providerId: p.PROVIDER_ID, count: p.CNT,
        positiveRate: p.CNT > 0 ? Math.round((p.POS / p.CNT) * 1000) / 10 : 0,
        avgTotalMs: p.AVG_MS,
      })),
    });
  }

  // 목록 모드
  const [countRow] = await executeQuery<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM AI_CHAT_FEEDBACK f WHERE ${where}`, binds,
  );
  const totalCount = countRow?.CNT ?? 0;

  const rows = await executeQuery<{
    FEEDBACK_ID: string; MESSAGE_ID: string; SESSION_ID: string;
    RATING: string; USER_QUERY: string | null; LLM_RESPONSE: string | null;
    SQL_QUERY: string | null; RESULT_JSON: string | null;
    PROVIDER_ID: string | null; MODEL_ID: string | null;
    TOTAL_MS: number | null; SQL_GEN_MS: number | null;
    SQL_EXEC_MS: number | null; ANALYSIS_MS: number | null;
    CREATED_AT: string;
  }>(
    `SELECT f.FEEDBACK_ID, f.MESSAGE_ID, f.SESSION_ID, f.RATING,
            f.USER_QUERY, f.LLM_RESPONSE, f.SQL_QUERY, f.RESULT_JSON,
            f.PROVIDER_ID, f.MODEL_ID,
            f.TOTAL_MS, f.SQL_GEN_MS, f.SQL_EXEC_MS, f.ANALYSIS_MS,
            TO_CHAR(f.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT
       FROM AI_CHAT_FEEDBACK f
      WHERE ${where}
      ORDER BY f.CREATED_AT DESC
      OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    { ...binds, offset: (page - 1) * pageSize, pageSize },
  );

  return NextResponse.json({
    rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  });
}

// DELETE: 선택 또는 전체 삭제
export async function DELETE(request: NextRequest) {
  const body = await request.json();

  if (body.deleteAll) {
    await executeDml(`DELETE FROM AI_CHAT_FEEDBACK`, {});
    return NextResponse.json({ deleted: 'all' });
  }

  const ids: string[] = body.feedbackIds ?? [];
  for (const id of ids) {
    await executeDml(`DELETE FROM AI_CHAT_FEEDBACK WHERE FEEDBACK_ID = :id`, { id });
  }
  return NextResponse.json({ deleted: ids.length });
}
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit --pretty
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/ai-chat/feedback/route.ts
git commit -m "feat: AI 챗 피드백 CRUD API (/api/ai-chat/feedback)"
```

---

### Task 5: MessageBubble 피드백 영속화

**Files:**
- Modify: `src/app/ai-chat/_components/MessageBubble.tsx`

- [ ] **Step 1: Props에 피드백 전송용 데이터 추가**

MessageBubble Props에 `sessionId`, `providerId`, `modelId`, 이전 user 메시지 참조를 위한 `userQuery`, 성능 데이터 `perf`를 추가.

```typescript
interface Props {
  message: ChatMessageRow;
  resultRows?: Record<string, unknown>[];
  sessionId?: string;
  providerId?: string;
  modelId?: string;
  userQuery?: string;
  perf?: { totalMs?: number; sqlGenMs?: number; sqlExecMs?: number; analysisMs?: number };
}
```

- [ ] **Step 2: 피드백 저장/삭제 핸들러 구현**

좋아요/싫어요 클릭 시 `POST /api/ai-chat/feedback` 호출. 토글 해제 시 저장된 feedbackId로 DELETE.

```typescript
const [feedbackId, setFeedbackId] = useState<string | null>(null);

const handleFeedback = async (rating: 'up' | 'down') => {
  if (feedback === rating && feedbackId) {
    // 토글 해제 → 삭제
    await fetch('/api/ai-chat/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackIds: [feedbackId] }),
    });
    setFeedback(null);
    setFeedbackId(null);
    return;
  }
  // 기존 피드백이 있으면 먼저 삭제
  if (feedbackId) {
    await fetch('/api/ai-chat/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackIds: [feedbackId] }),
    });
  }
  const res = await fetch('/api/ai-chat/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId: message.messageId,
      sessionId,
      rating: rating === 'up' ? 'POSITIVE' : 'NEGATIVE',
      userQuery,
      llmResponse: message.content,
      sqlQuery: message.sqlText,
      providerId,
      modelId,
      totalMs: perf?.totalMs,
      sqlGenMs: perf?.sqlGenMs,
      sqlExecMs: perf?.sqlExecMs,
      analysisMs: perf?.analysisMs,
    }),
  });
  const data = await res.json();
  setFeedback(rating);
  setFeedbackId(data.feedbackId);
};
```

- [ ] **Step 3: 버튼 onClick을 handleFeedback으로 교체**

기존 `onClick={() => setFeedback(...)}` → `onClick={() => handleFeedback('up'|'down')}`

- [ ] **Step 4: MessageList에서 새 props 전달**

`MessageList.tsx`에서 MessageBubble 렌더 시 `sessionId`, `providerId`, `modelId`, `userQuery`(직전 user 메시지의 content), `perf` 전달.

- [ ] **Step 5: 커밋**

```bash
git add src/app/ai-chat/_components/MessageBubble.tsx src/app/ai-chat/_components/MessageList.tsx
git commit -m "feat: MessageBubble 피드백 DB 저장 연동"
```

---

### Task 6: SessionSidebar 분석 링크 추가

**Files:**
- Modify: `src/app/ai-chat/_components/SessionSidebar.tsx`

- [ ] **Step 1: 사이드바 하단에 분석 페이지 링크 추가**

사이드바 하단(새 대화 버튼 영역 근처)에 차트 아이콘 + "분석" 링크:

```tsx
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

// 사이드바 하단에 추가
<Link
  href="/ai-chat/analytics"
  className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
>
  <BarChart3 className="size-4" />
  <span>대화 분석</span>
</Link>
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/ai-chat/_components/SessionSidebar.tsx
git commit -m "feat: SessionSidebar에 분석 페이지 링크 추가"
```

---

### Task 7: 분석 대시보드 페이지 구현

**Files:**
- Create: `src/app/ai-chat/analytics/page.tsx`

- [ ] **Step 1: 분석 페이지 작성**

통계 카드 6개 + 필터 바 + 일별 추이 차트(Recharts) + TOP 질문 + 프로바이더 비교 + 피드백 목록(페이지네이션) + 상세 모달.

페이지 구조:
- 상단: DisplayHeader + 필터 바 (기간 프리셋, 날짜범위, 평점, 프로바이더)
- 통계 카드 (총 대화, 긍정, 부정, 중립, 긍정률, 평균 응답시간)
- 일별 사용량 차트 (ComposedChart: Bar=건수, Line=긍정률)
- 2컬럼: 자주 묻는 질문 TOP10 / 프로바이더별 품질 비교
- 피드백 목록 테이블 (체크박스 선택, 페이지네이션, 행 클릭→상세 모달)
- 하단: 선택삭제/전체삭제 버튼

이 파일은 300줄 제한을 초과할 수 있으므로 하위 컴포넌트로 분리:
- `src/app/ai-chat/analytics/_components/StatsCards.tsx` — 통계 카드 6개
- `src/app/ai-chat/analytics/_components/DailyChart.tsx` — 일별 추이 차트
- `src/app/ai-chat/analytics/_components/FeedbackTable.tsx` — 피드백 목록+페이지네이션
- `src/app/ai-chat/analytics/_components/FeedbackDetailModal.tsx` — 상세 보기 모달

- [ ] **Step 2: StatsCards.tsx 작성**

6개 카드: 총 대화, 긍정, 부정, 중립, 긍정률(프로그레스 바), 평균 응답시간.
색상: 파랑/초록/빨강/회색/시안/보라.

- [ ] **Step 3: DailyChart.tsx 작성**

Recharts `ComposedChart`: X축=날짜, Bar=건수(파랑), Line=긍정률%(초록).
빈 데이터 시 "데이터 없음" 표시.

- [ ] **Step 4: FeedbackTable.tsx 작성**

체크박스 선택, 평점 배지(👍/👎), 질문 요약(80자 truncate), 프로바이더, 응답시간, 일시.
페이지네이션(20건). 행 클릭 시 `onSelect(feedback)` 콜백.

- [ ] **Step 5: FeedbackDetailModal.tsx 작성**

모달: 메타 정보(평점, 프로바이더, 모델, 일시, 성능 4단계) + 사용자 질문 + AI 응답(마크다운) + SQL(구문강조) + 결과 데이터(테이블).

- [ ] **Step 6: page.tsx 메인 페이지 작성**

SWR로 stats/list 조회. 필터 상태 관리. 삭제 핸들러.
TOP 질문과 프로바이더 비교는 stats 응답에서 직접 렌더.

- [ ] **Step 7: TypeScript 타입 체크**

```bash
npx tsc --noEmit --pretty
```

- [ ] **Step 8: 커밋**

```bash
git add src/app/ai-chat/analytics/
git commit -m "feat: AI 챗 분석 대시보드 페이지 (/ai-chat/analytics)"
```

---

### Task 8: 통합 테스트 및 마무리

- [ ] **Step 1: 채팅 기능 정상 동작 확인**

`/ai-chat`에서 새 대화 생성 → 질문 → SQL 생성/실행 → 응답 확인.
DB에 `AI_CHAT_SESSION`, `AI_CHAT_MESSAGE` 저장 확인.

- [ ] **Step 2: 피드백 저장 확인**

좋아요/싫어요 클릭 → `AI_CHAT_FEEDBACK` 테이블에 행 생성 확인.
토글 해제 시 삭제 확인.

- [ ] **Step 3: 분석 페이지 확인**

`/ai-chat/analytics` 접속 → 통계 카드, 차트, 목록 정상 렌더 확인.
필터 변경 시 데이터 갱신 확인.
상세 모달 동작 확인.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: AI 챗 분석 시스템 완성 (DB전환 + 피드백 + 대시보드)"
```
