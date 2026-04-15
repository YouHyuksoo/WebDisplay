# AI 챗 (MES 도메인 어시스턴트) — Design Spec

- **작성일**: 2026-04-15
- **작성자**: hsyou + Claude (브레인스토밍)
- **상태**: Draft (오빠 리뷰 대기)
- **참조**: `C:\project\wbsmaster` AI 챗 패턴

---

## 1. 목적과 범위

WebDisplay 메인메뉴에서 진입 가능한 AI 대화 페이지를 추가한다. 사용자가 자연어로 질문하면 LLM이 Oracle MES 데이터에 대해 SQL을 생성·실행·분석해 표/차트/요약으로 응답하는 **MES 도메인 특화 어시스턴트**다. 일반 ChatGPT 같은 잡담 챗봇이 아니라 라인·생산·품질 데이터 질의에 특화된다.

### 핵심 목표
1. 메인메뉴 우하단에 AI 챗 진입 아이콘 추가
2. `/ai-chat` 페이지에서 멀티턴 대화 + SQL 자동 생성·실행 + 결과 시각화
3. 4개 LLM 프로바이더(Claude, Gemini, Mistral, Kimi) 등록·전환 가능한 설정 탭
4. 페르소나(응답 어조) 선택 가능
5. 도메인 용어사전·SQL 작성 규칙을 시스템 프롬프트에 사전 주입해 정확도 보장
6. Oracle 운영 DB 보호: SELECT-only + LIMIT 자동 + EXPLAIN PLAN 위험감지 + 별도 read-only 사용자

### 비목표 (이번 범위 외)
- 다중 사용자 인증/권한 분리 (현재 WebDisplay 인증 없음 — 단일 글로벌 히스토리)
- DML(쓰기) 쿼리 생성 — 차단됨
- 멕시코 LOG_* 테이블(SVEHICLEPDB 사이트) — 메인 DB만 사용
- 음성 입력/TTS 출력
- 모바일 전용 레이아웃 (데스크톱 우선)

---

## 2. 아키텍처 결정 요약

| 결정 항목 | 채택안 | 근거 |
|---|---|---|
| 챗봇 용도 | MES 도메인 어시스턴트 | 운영팀 가치 최대화. wbsmaster 패턴 재사용 가능 |
| LLM 프로바이더 | Claude · Gemini · Mistral · Kimi (4개) | wbsmaster 3개 + Claude(SQL/분석 강점) 추가 |
| 저장소 | Oracle 신규 테이블 4개 | 다중사용자·검색·집계 견고성. CLAUDE.md "DB 불필요" 원칙 예외 |
| SQL 안전 | 하이브리드 (자동 실행 + EXPLAIN PLAN 위험감지) | 평소 빠른 흐름 + 위험 시 사람 확인 |
| DB 사용자 분리 | `WD_AI_READER` 신규 read-only 계정 | 권한 차단으로 사고 가능성 0 |
| 스키마 컨텍스트 | 화이트리스트 + DDL 임베딩(자동 추출) | 정확도 ↑, 토큰 통제 |
| 도메인 컨텍스트 | 코드 상수(용어사전+SQL규칙) + DB 동적 용어 | 핵심은 코드, 운영 추가는 UI |
| 페르소나 | DB 테이블 + UI 관리 + Stage 2(분석)에만 적용 | wbsmaster 패턴 그대로 |
| 응답 방식 | SSE 스트리밍 | UX ↑. 4개 프로바이더 모두 지원 |
| 다국어 | UI는 ko/en/es/vi 지원, 채팅 본문은 LLM 응답 언어 | WebDisplay 기존 패턴 일치 |
| 사용자 식별 | 없음 (단일 글로벌 히스토리) | 인증 없음과 일치 |

---

## 3. 컴포넌트 구조

### 3.1 디렉토리 트리

```
src/
├── app/
│   ├── ai-chat/
│   │   ├── page.tsx                       (200줄 이내)
│   │   ├── layout.tsx                     (다크 테마)
│   │   └── _components/
│   │       ├── ChatLayout.tsx             (사이드바+본문 2컬럼)
│   │       ├── SessionSidebar.tsx         (좌: 세션 목록)
│   │       ├── MessageList.tsx            (스트리밍 메시지 렌더)
│   │       ├── MessageBubble.tsx          (역할별 버블)
│   │       ├── SqlPreviewCard.tsx         (위험 쿼리 ▶ 확인 카드)
│   │       ├── ResultTable.tsx            (SQL 결과 표)
│   │       ├── ResultChart.tsx            (Recharts: bar/line/pie/area)
│   │       ├── ChatInput.tsx              (입력창 + 페르소나/모델 픽커)
│   │       ├── PersonaPicker.tsx          (페르소나 드롭다운)
│   │       └── ModelPicker.tsx            (프로바이더/모델 드롭다운)
│   ├── settings/
│   │   ├── layout.tsx                     (좌측 탭 네비 — 신규 패턴)
│   │   ├── cards/page.tsx                 (기존)
│   │   ├── ai-models/                     (신규)
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       ├── ProviderCard.tsx
│   │   │       ├── ApiKeyInput.tsx        (마스킹 표시)
│   │   │       └── SystemPromptEditor.tsx (펼침 메뉴)
│   │   ├── ai-personas/                   (신규)
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       └── PersonaForm.tsx
│   │   └── ai-glossary/                   (신규)
│   │       ├── page.tsx
│   │       └── _components/
│   │           └── TermForm.tsx
│   └── api/
│       └── ai-chat/
│           ├── sessions/
│           │   ├── route.ts               (GET 목록, POST 생성)
│           │   └── [id]/
│           │       ├── route.ts           (DELETE)
│           │       └── messages/route.ts  (GET)
│           ├── stream/route.ts            (POST SSE 스트리밍)
│           ├── sql/confirm/route.ts       (POST 위험 쿼리 확인 후 실행)
│           ├── test-connection/route.ts   (POST 프로바이더 키 검증)
│           ├── personas/route.ts          (GET/POST/PUT/DELETE)
│           ├── glossary/route.ts          (GET/POST/PUT/DELETE)
│           └── providers/route.ts         (GET/PUT 4개 프로바이더 설정)
└── lib/
    └── ai/
        ├── providers/
        │   ├── anthropic.ts
        │   ├── gemini.ts
        │   ├── mistral.ts
        │   ├── kimi.ts
        │   └── types.ts                   (공통 인터페이스)
        ├── router.ts                      (provider 라우터)
        ├── context/
        │   ├── domain-glossary.ts         (코드 상수: MES 용어)
        │   ├── sql-rules.ts               (코드 상수: Oracle SQL 규칙)
        │   ├── glossary-store.ts          (DB CRUD)
        │   └── prompt-builder.ts          (3계층 시스템 프롬프트 조립)
        ├── schema-context.ts              (자동 추출된 화이트리스트 DDL)
        ├── sql-guard.ts                   (정규식 + LIMIT + EXPLAIN PLAN)
        └── chat-store.ts                  (세션·메시지 CRUD)
```

### 3.2 메인메뉴 진입점

**위치**: `src/components/menu/MenuControls.tsx:156-164` `bottom-buttons` div에 floating-btn 추가.

```tsx
<button className="floating-btn" id="ai-chat-btn"
        onClick={() => router.push('/ai-chat')}
        aria-label={t('aiChat')}>
  <Sparkles className="size-5" />
</button>
```

- 아이콘: `lucide-react`의 `Sparkles`. 미설치 시 추가.
- 다국어 키: `menu.aiChat` (ko: "AI 어시스턴트", en: "AI Assistant", es: "Asistente IA", vi: "Trợ lý AI")
- 라우트: `/ai-chat` — `(menu)`/`(display)` 그룹과 별개

### 3.3 화면 레지스트리(SCREENS)

`/ai-chat`은 SCREENS 레지스트리에 등록하지 **않는다**. 라인 필터·시프트 개념과 무관하고, 화면 ID로 진입하는 모니터링 화면이 아니므로 별도 라우트로 관리.

---

## 4. 데이터 흐름

### 4.1 채팅 메시지 처리 (SSE 스트리밍)

```
[클라이언트]              [서버 /api/ai-chat/stream]            [Oracle WD_AI_READER]
     │
     │  POST {sessionId, prompt,                                       │
     │        providerId, modelId,                                     │
     │        personaId}                                               │
     ├──────────────────────────►│                                     │
     │                            │                                    │
     │                            │  1. chat-store.loadHistory()       │
     │                            │  2. prompt-builder.build(stage=sql)│
     │                            │     - CORE_SQL_IDENTITY            │
     │                            │     - CORE_GLOSSARY                │
     │                            │     - 동적 glossary (DB)           │
     │                            │     - SQL_RULES                    │
     │                            │     - 화이트리스트 DDL             │
     │                            │     - 현재 컨텍스트(date/shift)    │
     │                            │  3. provider.chatStream(messages)  │
     │                            │                                    │
     │  ◄─── event: token ────────│ (LLM 응답 토큰 스트리밍)           │
     │  ◄─── event: token ────────│                                    │
     │  ...                       │                                    │
     │                            │  4. 응답에서 <sql>...</sql> 추출   │
     │                            │  5. sql-guard.validate()           │
     │                            │     - SELECT/WITH 검증             │
     │                            │     - LIMIT 자동 주입              │
     │                            │  6. EXPLAIN PLAN → cost 평가       │
     │                            │     ├ 안전 → 즉시 실행             │
     │                            │     └ 위험 → confirm_required SSE  │
     │                            │                                    │
     │                            │  (안전 분기)                       │
     │                            │  7. executeQuery(sql, [], pool=AI) │
     │                            ├──────────────────────────────────►│
     │                            │ ◄────── rows[] ───────────────────│
     │                            │                                    │
     │                            │  8. prompt-builder.build(           │
     │                            │       stage=analysis,               │
     │                            │       personaPrompt)                │
     │                            │  9. provider.chatStream(            │
     │                            │       messages + sql + rows)        │
     │  ◄─── event: token ────────│ (분석 응답 스트리밍)               │
     │  ◄─── event: chart ────────│ (차트 스펙 JSON)                   │
     │  ◄─── event: done ─────────│                                    │
     │                            │                                    │
     │                            │ 10. chat-store.saveAll(            │
     │                            │       user/assistant/sql/result)   │
```

### 4.2 위험 쿼리 확인 흐름

```
event: confirm_required
data: {messageId, sql, estimatedRows, estimatedCost}

→ 클라이언트 SqlPreviewCard 표시 → ▶ 클릭
→ POST /api/ai-chat/sql/confirm {messageId}
→ 서버: 같은 SQL 실행 → 결과 후속 분석 → 동일하게 SSE로 응답
```

### 4.3 시스템 프롬프트 조립 (3계층)

**Stage 1 (SQL 생성)** — 페르소나 미주입 (정답성 우선):
```
[CORE_SQL_IDENTITY]
당신은 Oracle MES 데이터 분석 어시스턴트입니다…

# 도메인 용어 (코드 상수)
- FPY: First Pass Yield = 양품수/검사수
- 라인 코드 P51 = SMPS-1, 변환은 F_GET_LINE_NAME(LINE_CODE,1)
- 시프트 A=주간, B=야간
- 작업일은 F_GET_WORK_ACTUAL_DATE(SYSDATE,'A')
- IO_DATE는 KST 저장, 베트남 로컬은 (IO_DATE - 2/24)
...

# 추가 용어 (DB AI_GLOSSARY_TERM)
- W220: 포장 공정 코드
- UPH: Units Per Hour
...

# SQL 규칙
1. SELECT/WITH 만 허용
2. ROWNUM <= 1000 자동 주입
3. F_GET_LINE_NAME 사용
...

# 사용 가능한 테이블 (자동 추출)
## IP_PRODUCT_LINE_TARGET (라인별 일자/시프트 생산계획)
| 컬럼 | 타입 | NULL | 코멘트 |
|---|---|---|---|
| PLAN_DATE | DATE | N | 계획일자 |
| LINE_CODE | VARCHAR2(20) | N | 라인 코드 |
...

# 현재 시점
- 작업일: 2026-04-15
- 현재 시프트: B (야간)
- 시간대: ICT (베트남)
```

**Stage 2 (결과 분석)** — 페르소나 prepend:
```
[페르소나 systemPrompt]
당신은 라인 매니저를 보좌하는 어시스턴트입니다. 각 응답 끝에 "조치 제안"을 1~3개 bullet으로 제공하세요.

[CORE_ANALYSIS_IDENTITY]
주어진 SQL 결과를 한국어로 요약하고 차트가 도움 되는지 판단하세요.
차트 추천 시 chartType과 chartData를 JSON으로 반환…
```

---

## 5. Oracle 스키마

### 5.1 신규 테이블 4개

`migrations/001_ai_chat_tables.sql`:

```sql
-- 세션 헤더
CREATE TABLE AI_CHAT_SESSION (
  SESSION_ID       VARCHAR2(40)  PRIMARY KEY,
  TITLE            VARCHAR2(200) NOT NULL,
  PROVIDER_ID      VARCHAR2(20),
  MODEL_ID         VARCHAR2(80),
  PERSONA_ID       VARCHAR2(40),
  CREATED_AT       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  LAST_MESSAGE_AT  TIMESTAMP,
  MESSAGE_COUNT    NUMBER DEFAULT 0
);
CREATE INDEX IX_AI_CHAT_SESSION_LAST ON AI_CHAT_SESSION(LAST_MESSAGE_AT DESC);

-- 메시지 본문
CREATE TABLE AI_CHAT_MESSAGE (
  MESSAGE_ID       VARCHAR2(40)  PRIMARY KEY,
  SESSION_ID       VARCHAR2(40)  NOT NULL REFERENCES AI_CHAT_SESSION(SESSION_ID) ON DELETE CASCADE,
  ROLE             VARCHAR2(20)  NOT NULL,    -- user/assistant/system/sql/sql_result
  CONTENT          CLOB,
  SQL_TEXT         CLOB,                       -- role=sql 시 실행된 SQL
  RESULT_JSON      CLOB,                       -- role=sql_result 시 JSON 직렬화
  TOKENS_IN        NUMBER,
  TOKENS_OUT       NUMBER,
  EXEC_MS          NUMBER,
  CREATED_AT       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);
CREATE INDEX IX_AI_CHAT_MESSAGE_SESSION ON AI_CHAT_MESSAGE(SESSION_ID, CREATED_AT);

-- 페르소나 (응답 어조)
CREATE TABLE AI_PERSONA (
  PERSONA_ID      VARCHAR2(40)  PRIMARY KEY,
  NAME            VARCHAR2(80)  NOT NULL,
  DESCRIPTION     VARCHAR2(300),
  ICON            VARCHAR2(40),
  SYSTEM_PROMPT   CLOB          NOT NULL,
  IS_DEFAULT      NUMBER(1) DEFAULT 0,
  IS_ACTIVE       NUMBER(1) DEFAULT 1,
  SORT_ORDER      NUMBER DEFAULT 0,
  CREATED_AT      TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT      TIMESTAMP
);

-- 프로바이더 설정 (4행 고정)
CREATE TABLE AI_PROVIDER_SETTING (
  PROVIDER_ID         VARCHAR2(20)  PRIMARY KEY,    -- claude/gemini/mistral/kimi
  ENABLED             NUMBER(1) DEFAULT 0,
  API_KEY_ENC         VARCHAR2(500),                 -- base64 인코딩
  DEFAULT_MODEL_ID    VARCHAR2(80),
  SQL_SYSTEM_PROMPT   CLOB,                          -- 빈값이면 코드 기본값 사용
  ANALYSIS_PROMPT     CLOB,
  UPDATED_AT          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- 동적 용어 사전
CREATE TABLE AI_GLOSSARY_TERM (
  TERM_ID         VARCHAR2(40)  PRIMARY KEY,
  CATEGORY        VARCHAR2(40)  NOT NULL,    -- abbreviation/code/rule/example
  TERM            VARCHAR2(120) NOT NULL,
  DEFINITION      CLOB          NOT NULL,
  EXAMPLE_SQL     CLOB,
  PRIORITY        NUMBER DEFAULT 0,
  IS_ACTIVE       NUMBER(1) DEFAULT 1,
  CREATED_AT      TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  UPDATED_AT      TIMESTAMP
);
CREATE INDEX IX_AI_GLOSSARY_CAT ON AI_GLOSSARY_TERM(CATEGORY, PRIORITY DESC);
```

### 5.2 시드 데이터

```sql
-- 페르소나 3종 (모두 IS_ACTIVE=1, MES 분석가가 IS_DEFAULT)
INSERT INTO AI_PERSONA VALUES ('p_default','MES 분석가','데이터를 객관적으로 요약·해석','BarChart3',
  '당신은 MES 데이터 분석가입니다. 결과를 표/차트 중심으로 객관적으로 요약하고 이상치를 강조하세요. 감정·장식 표현을 줄이고 숫자와 비율로 말하세요.',
  1,1,0,SYSTIMESTAMP,NULL);
INSERT INTO AI_PERSONA VALUES ('p_manager','라인 매니저','의사결정에 직접 쓸 수 있는 인사이트','ClipboardCheck',
  '당신은 라인 매니저를 보좌하는 어시스턴트입니다. 각 응답 끝에 "조치 제안"을 1~3개 bullet로 제공하세요. 통계 용어 대신 현장 용어를 사용하세요.',
  0,1,1,SYSTIMESTAMP,NULL);
INSERT INTO AI_PERSONA VALUES ('p_quality','품질 엔지니어','FPY/SPC/이상점 중심의 품질 관점','ShieldCheck',
  '당신은 품질 엔지니어 관점으로 응답합니다. FPY·CTQ·SPC 이상점·MSL 경고에 우선순위를 두고, 통계적 유의성과 시간 추이에 주목하세요.',
  0,1,2,SYSTIMESTAMP,NULL);

-- 글로서리 5종 (운영 중 UI에서 점진 추가)
INSERT INTO AI_GLOSSARY_TERM VALUES ('g_p51','code','P51','SMPS-1 라인. 베트남 SMPS 1호기.',NULL,100,1,SYSTIMESTAMP,NULL);
INSERT INTO AI_GLOSSARY_TERM VALUES ('g_w220','code','W220','포장 공정 코드. IP_PRODUCT_WORKSTAGE_IO.WORKSTAGE_CODE 컬럼.',NULL,100,1,SYSTIMESTAMP,NULL);
INSERT INTO AI_GLOSSARY_TERM VALUES ('g_w310','code','W310','투입 공정 코드.',NULL,100,1,SYSTIMESTAMP,NULL);
INSERT INTO AI_GLOSSARY_TERM VALUES ('g_uph','abbreviation','UPH','Units Per Hour. 시간당 생산수량 목표.',NULL,50,1,SYSTIMESTAMP,NULL);
INSERT INTO AI_GLOSSARY_TERM VALUES ('g_eol','abbreviation','EOL','End Of Line 검사 — 생산 라인 마지막 단계.',NULL,50,1,SYSTIMESTAMP,NULL);

-- 프로바이더 4행 (ENABLED=0으로 시작, 사용자가 키 등록 후 활성화)
INSERT INTO AI_PROVIDER_SETTING (PROVIDER_ID,DEFAULT_MODEL_ID) VALUES ('claude','claude-opus-4-6');
INSERT INTO AI_PROVIDER_SETTING (PROVIDER_ID,DEFAULT_MODEL_ID) VALUES ('gemini','gemini-2.0-flash');
INSERT INTO AI_PROVIDER_SETTING (PROVIDER_ID,DEFAULT_MODEL_ID) VALUES ('mistral','mistral-large-latest');
INSERT INTO AI_PROVIDER_SETTING (PROVIDER_ID,DEFAULT_MODEL_ID) VALUES ('kimi','kimi-k2-0905-preview');
COMMIT;
```

### 5.3 read-only DB 사용자

`migrations/002_ai_reader_user.sql` (DBA 실행):

```sql
CREATE USER WD_AI_READER IDENTIFIED BY "<TBD-강력한-비밀번호>";
GRANT CREATE SESSION TO WD_AI_READER;
GRANT SELECT ON SYS.PLAN_TABLE$ TO WD_AI_READER;

-- ⬇ 화이트리스트 GRANT (오빠 제공 후 채움) ⬇
-- GRANT SELECT ON <메인계정>.<TABLE_NAME> TO WD_AI_READER;
```

### 5.4 화이트리스트 (TBD)

`schema-context.ts`의 SCHEMA 상수는 빈 객체로 시작. 오빠가 화이트리스트 테이블 목록을 제공하면 `npm run extract-schema` 1회 실행으로 자동 채움.

`scripts/extract-schema-context.mjs`가 `USER_TAB_COLUMNS` + `USER_COL_COMMENTS` + `USER_TAB_COMMENTS`를 조회해 TS 상수 코드 생성.

---

## 6. 컴포넌트 인터페이스 (격리·테스트 가능 단위)

### 6.1 LLM Provider 공통 인터페이스

```typescript
// src/lib/ai/providers/types.ts
export interface ChatMessage { role: 'system'|'user'|'assistant'; content: string; }
export interface ChatStreamOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}
export interface ChatStreamChunk {
  type: 'token'|'done'|'error';
  delta?: string;
  tokensIn?: number;
  tokensOut?: number;
  error?: string;
}
export interface AiProvider {
  id: 'claude'|'gemini'|'mistral'|'kimi';
  listModels(): Promise<string[]>;
  chatStream(opts: ChatStreamOptions, apiKey: string): AsyncIterable<ChatStreamChunk>;
  testConnection(apiKey: string): Promise<{ok: boolean; error?: string}>;
}
```

각 프로바이더(`anthropic.ts`, `gemini.ts`, `mistral.ts`, `kimi.ts`)가 이 인터페이스를 구현. 라우터(`router.ts`)는 `providerId`로 인스턴스 dispatch.

### 6.2 SQL Guard

```typescript
// src/lib/ai/sql-guard.ts
export interface SqlGuardResult {
  safe: boolean;
  rewritten: string;        // LIMIT 주입 후 SQL
  reason?: string;          // 차단 사유
  estimatedCost?: number;   // EXPLAIN PLAN cost
  estimatedRows?: number;
  needsConfirmation: boolean;
}
export async function guardSql(sql: string): Promise<SqlGuardResult>;
```

테스트: 6가지 입력 — `SELECT 정상`, `INSERT 차단`, `다중 세미콜론 차단`, `LIMIT 자동 주입`, `EXPLAIN PLAN 위험감지`, `EXPLAIN PLAN 안전`.

### 6.3 Prompt Builder

```typescript
// src/lib/ai/context/prompt-builder.ts
export interface BuildPromptOpts {
  stage: 'sql_generation'|'analysis';
  personaPrompt?: string;
  selectedTables?: string[];
  currentContext: { today: string; serverShift: 'A'|'B'; userTz: string };
  customSqlPrompt?: string;       // 프로바이더 설정 오버라이드
  customAnalysisPrompt?: string;
}
export async function buildSystemPrompt(opts: BuildPromptOpts): Promise<string>;
```

### 6.4 Chat Store

```typescript
// src/lib/ai/chat-store.ts
export async function createSession(opts: {title?: string; providerId?: string; modelId?: string; personaId?: string}): Promise<string>;
export async function listSessions(limit?: number): Promise<SessionMeta[]>;
export async function deleteSession(sessionId: string): Promise<void>;
export async function loadMessages(sessionId: string): Promise<ChatMessageRow[]>;
export async function appendMessage(msg: NewMessage): Promise<string>;
```

내부적으로 `executeDml`/`executeQuery` 사용.

---

## 7. 에러 처리

| 시나리오 | 동작 |
|---|---|
| LLM API 키 없음 | 채팅 입력 비활성 + 토스트 "설정 → AI 모델에서 키 등록 필요" |
| LLM 호출 실패 (네트워크/quota) | SSE `event: error` + 메시지 버블에 ⚠️ 표시 + 재시도 버튼 |
| SQL 가드 차단 (DML 시도) | 에러 메시지 버블 + "이 어시스턴트는 조회만 가능합니다" |
| EXPLAIN PLAN 자체 실패 | 안전 측 처리: confirm_required로 사용자 확인 받음 |
| Oracle 쿼리 실패 (문법 오류 등) | 에러를 LLM에 다시 보내 1회 자동 재시도 → 그래도 실패 시 사용자에게 표시 |
| Oracle 쿼리 타임아웃 (>30초) | 강제 cancel + "쿼리가 너무 오래 걸렸습니다. 조건을 좁혀주세요" |
| 세션 동시성 (같은 세션에 동시 요청) | 두 번째 요청 거부 + "이전 응답 진행 중입니다" |
| 빈 결과 (0행) | LLM에 "0행"임을 알리고 "조회된 데이터가 없습니다" 응답 유도 |

---

## 8. 다국어

### 8.1 기존 i18n 파일 4개에 추가될 네임스페이스

`src/i18n/messages/{ko,en,es,vi}.json`:

```json
{
  "menu": {
    "aiChat": "AI 어시스턴트"   // 4개 언어
  },
  "aiChat": {
    "title": "AI 어시스턴트",
    "newSession": "새 대화",
    "placeholder": "질문을 입력하세요…",
    "send": "보내기",
    "loading": "응답 생성 중…",
    "noKey": "AI 모델 설정에서 API 키를 먼저 등록해주세요",
    "sqlConfirmTitle": "이 쿼리를 실행할까요?",
    "sqlConfirmBody": "예상 행수: {rows}, 예상 비용: {cost}",
    "execute": "실행",
    "cancel": "취소",
    "samplePrompts": ["오늘 P51 야간 FPY 알려줘", "어제 SMD 라인별 생산수량 비교", "이번 주 CTQ 이상점 라인 톱 5", "SMPS 라인 시간대별 실적 차트"]
  },
  "settingsAiModels": { /* 설정 페이지 */ },
  "settingsAiPersonas": { /* 설정 페이지 */ },
  "settingsAiGlossary": { /* 설정 페이지 */ }
}
```

### 8.2 LLM 응답 언어

LLM은 사용자 입력 언어를 따라 응답 (별도 강제 안 함). 시스템 프롬프트 마지막에 "사용자 질문 언어와 동일 언어로 답하세요" 한 줄 추가.

---

## 9. 테스트 전략

### 9.1 단위 테스트 (vitest)

- `sql-guard`: 12개 케이스 (정상/차단/주입 변형)
- `prompt-builder`: 6개 케이스 (stage별·페르소나 유무·빈 글로서리 등)
- 각 provider 어댑터: 모킹된 SDK로 chatStream 반환 형식 검증

### 9.2 통합 테스트 (수동)

- 4개 프로바이더 각각 실제 키로 `/api/ai-chat/test-connection` 통과 확인
- 시드 페르소나 3종 응답 비교
- "오늘 P51 야간 FPY 알려줘" → SQL 생성 → 실행 → 차트 표시 E2E
- 위험 쿼리 시나리오: `SELECT * FROM IP_PRODUCT_WORKSTAGE_IO` (전체 스캔) → confirm_required → ▶ 클릭 → 실행

### 9.3 부하/안전 테스트

- DML 키워드 12종 (INSERT/UPDATE/DELETE/MERGE/TRUNCATE/DROP/ALTER/GRANT/REVOKE/CREATE/COMMIT/ROLLBACK) 각각 차단되는지 확인
- 다중 세미콜론 차단 확인
- LIMIT 자동 주입 누락 케이스 0건 확인
- WD_AI_READER 권한으로 DELETE 시도 → ORA 권한 오류 확인 (마지막 방어선)

---

## 10. 운영 노트 (CLAUDE.md에 추가될 항목)

이 기능 머지 시 `CLAUDE.md`에 아래 섹션 추가:

```markdown
## AI 챗 (메뉴 진입: 우하단 ✨ 아이콘)

- 새 도메인 용어/약어는 `/settings/ai-glossary`에서 추가 → 즉시 LLM 시스템 프롬프트 반영
- API 키는 `AI_PROVIDER_SETTING.API_KEY_ENC`에 base64 저장 (운영 DB 백업에 포함되니 주의)
- 화이트리스트 테이블 추가: (1) `WD_AI_READER`에 GRANT SELECT (2) `npm run extract-schema` 재실행
- DB 사용자 분리: AI 챗은 `WD_AI_READER` 풀 사용 (db.ts `getAiReaderPool()`)
- 멕시코 LOG_* 테이블은 SVEHICLEPDB 사이트라 이 어시스턴트로 조회 불가
```

---

## 11. 의존성 추가

`package.json`에 추가:
- `@anthropic-ai/sdk`: ^0.35.0 (Claude)
- `@google/generative-ai`: ^0.24.1 (이미 wbsmaster 사용 중인 버전)
- `@mistralai/mistralai`: ^1.11.0
- (Kimi는 fetch 직접 호출 — SDK 불필요)
- `lucide-react`: 아이콘 (미설치 시)
- `eventsource-parser`: ^3.0.0 (SSE 클라이언트 파싱)

---

## 12. 미해결 항목 (TBD — 구현 전 결정 필요)

| 항목 | 결정자 | 비고 |
|---|---|---|
| 화이트리스트 테이블 목록 | 오빠 | 목록 받으면 `extract-schema` 실행 |
| `WD_AI_READER` 비밀번호 | DBA | 환경변수/keyvault 보관 |
| 페르소나 시드 3종 카피 | 오빠 (또는 첫 운영 후 수정) | 코드로 시드 → UI에서 수정 가능 |
| 4개 프로바이더 기본 모델 ID | 오빠 | 시드는 `claude-opus-4-6` / `gemini-2.0-flash` / `mistral-large-latest` / `kimi-k2-0905-preview`로 설정. 변경은 설정 페이지에서 |
| API 키 암호화 강도 | 오빠 | **디폴트는 base64**. DBA가 강력 암호화 요구 시 `DBMS_CRYPTO` 전환 (별도 작업) |

---

## 13. 작업 단위 (개략 — 정식 계획은 writing-plans 단계)

1. DB 마이그레이션 (`001`, `002`) + `WD_AI_READER` 풀 추가
2. LLM provider 4개 어댑터 + 라우터 + 통합 테스트
3. 도메인 컨텍스트(`domain-glossary.ts`, `sql-rules.ts`, `prompt-builder.ts`)
4. SQL 가드 + EXPLAIN PLAN 평가
5. 채팅 API (sessions/stream/sql/confirm)
6. UI: ChatLayout/MessageList/ChatInput/ResultTable/ResultChart
7. 설정: layout 탭 패턴 + ai-models/ai-personas/ai-glossary 3개 페이지
8. 메인메뉴 진입 버튼 + i18n 4언어
9. (오빠가 화이트리스트 제공) → `extract-schema` 실행 → 통합 테스트
10. 운영 노트 CLAUDE.md 업데이트

---

## 부록 A. wbsmaster 참조 매핑

| wbsmaster | WebDisplay (이 스펙) | 비고 |
|---|---|---|
| `prisma.aiPersona` | `AI_PERSONA` 테이블 | Prisma → 직접 SQL |
| `prisma.aiSetting` | `AI_PROVIDER_SETTING` 테이블 | provider별 1행 |
| `prisma.chatHistory` | `AI_CHAT_MESSAGE` 테이블 | 컬럼 추가 (sql/result) |
| `src/lib/llm/index.ts` | `src/lib/ai/router.ts` + `providers/*.ts` | 분리 |
| `DATABASE_SCHEMA` 상수 | `schema-context.ts` (자동 추출) | introspection 1회 시드 |
| `DEFAULT_SQL_SYSTEM_PROMPT` | `domain-glossary.ts` + `sql-rules.ts` 분리 | 더 세밀 |
| `getDynamicSchemaInfo()` 2단계 | 향후 도입 (테이블 ≥10개 시) | 초기엔 전체 주입 |
| `analyzeResults(personaPrompt + analysis)` | `prompt-builder(stage='analysis', personaPrompt)` | 동일 패턴 |
| 비스트리밍 JSON 응답 | SSE 스트리밍 | 1단계 업그레이드 |
| Postgres `executeQuery` | Oracle `executeQuery` (WD_AI_READER 풀) | 권한 분리 |

---

## 부록 B. 변경 영향 매트릭스

| 변경 영역 | 영향 받는 기존 코드 | 위험도 |
|---|---|---|
| 메인메뉴 버튼 추가 | `MenuControls.tsx`, `menu` i18n | 낮음 |
| 설정 layout 탭 도입 | `src/app/settings/layout.tsx`, 기존 cards 페이지 | 낮음 (탭 추가만) |
| Oracle 신규 테이블 | 없음 (READ-only 기존 코드) | 낮음 |
| db.ts에 reader 풀 추가 | `lib/db.ts` getter 1개 추가 | 낮음 |
| 의존성 4개 추가 | `package.json`, `package-lock.json` | 낮음 |
| 운영 시 API 키 관리 | DB 백업 정책 (운영 노트 필요) | 중간 |
