# AI 챗 분석 시스템 설계

> 날짜: 2026-04-16
> 범위: 채팅 DB 전환 + 피드백 영속화 + 분석 대시보드

## 1. 목표

- 채팅 저장소를 JSON 파일 → Oracle DB로 전환 (기존 `AI_CHAT_SESSION`, `AI_CHAT_MESSAGE` 활용)
- 좋아요/싫어요 피드백을 별도 `AI_CHAT_FEEDBACK` 테이블에 영속 저장 (채팅 삭제 후에도 보존)
- `/ai-chat/analytics` 분석 대시보드 페이지 신규 구현
- 성능 측정을 4단계로 세분화 (SQL_GEN_MS, SQL_EXEC_MS, ANALYSIS_MS, TOTAL_MS)

## 2. DB 스키마

### 2.1 기존 테이블 변경: AI_CHAT_MESSAGE

```sql
ALTER TABLE AI_CHAT_MESSAGE ADD (
  SQL_GEN_MS    NUMBER,
  SQL_EXEC_MS   NUMBER,
  ANALYSIS_MS   NUMBER
);
```

기존 `EXEC_MS` 컬럼은 TOTAL_MS 역할로 유지 (하위 호환).

### 2.2 신규 테이블: AI_CHAT_FEEDBACK

```sql
CREATE TABLE AI_CHAT_FEEDBACK (
  FEEDBACK_ID      VARCHAR2(40)  PRIMARY KEY,
  MESSAGE_ID       VARCHAR2(40)  NOT NULL,
  SESSION_ID       VARCHAR2(40)  NOT NULL,
  RATING           VARCHAR2(10)  NOT NULL,  -- POSITIVE / NEGATIVE / NEUTRAL
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
);

CREATE INDEX IX_AI_FEEDBACK_CREATED ON AI_CHAT_FEEDBACK(CREATED_AT DESC);
CREATE INDEX IX_AI_FEEDBACK_RATING ON AI_CHAT_FEEDBACK(RATING);
CREATE INDEX IX_AI_FEEDBACK_SESSION ON AI_CHAT_FEEDBACK(SESSION_ID);
```

핵심: `AI_CHAT_SESSION`/`AI_CHAT_MESSAGE` 삭제 시에도 피드백은 독립 보존.
FK 없이 SESSION_ID/MESSAGE_ID를 참조값으로만 저장.

### 2.3 마이그레이션 파일

`migrations/002_ai_chat_feedback.sql` — ALTER + CREATE + INDEX.
기존 JSON 데이터는 마이그레이션하지 않음 (3개 세션, 새로 시작).

## 3. 채팅 저장소 전환 (chat-store.ts)

### 3.1 전환 방식

`src/lib/ai/chat-store.ts`의 함수 시그니처 유지, 내부를 DB로 전환:

| 함수 | 현재 (JSON) | 변경 (DB) |
|---|---|---|
| `listSessions()` | `index.json` 읽기 | `SELECT FROM AI_CHAT_SESSION` |
| `getSession(id)` | `{id}.json` 읽기 | `SELECT FROM AI_CHAT_SESSION WHERE SESSION_ID = :id` |
| `createSession()` | `index.json` + 파일 생성 | `INSERT INTO AI_CHAT_SESSION` |
| `deleteSession(id)` | 파일 삭제 | `DELETE FROM AI_CHAT_SESSION` (CASCADE로 메시지도 삭제) |
| `getMessages(id)` | `{id}.json` 읽기 | `SELECT FROM AI_CHAT_MESSAGE WHERE SESSION_ID = :id` |
| `addMessage()` | `{id}.json` 업데이트 | `INSERT INTO AI_CHAT_MESSAGE` + `UPDATE AI_CHAT_SESSION` |

### 3.2 호출하는 쪽 변경 최소화

API 라우트(`sessions/route.ts`, `sessions/[id]/route.ts` 등)는 chat-store 함수 호출만 하므로, 시그니처가 동일하면 수정 불필요.

## 4. API 설계

### 4.1 피드백 API: `/api/ai-chat/feedback`

**POST** — 피드백 저장

```typescript
// Request body
{
  messageId: string;
  sessionId: string;
  rating: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  userQuery: string;
  llmResponse: string;
  sqlQuery?: string;
  resultJson?: string;
  providerId?: string;
  modelId?: string;
  totalMs?: number;
  sqlGenMs?: number;
  sqlExecMs?: number;
  analysisMs?: number;
}
```

**GET** — 피드백 목록 + 통계

```
?mode=stats          ← 통계만 (카드용)
?mode=list           ← 목록 (기본)
&rating=POSITIVE|NEGATIVE|NEUTRAL|all
&providerId=claude|gemini|mistral|kimi
&dateFrom=2026-04-01
&dateTo=2026-04-16
&page=1
&pageSize=20
```

stats 응답:

```json
{
  "totalFeedbacks": 142,
  "positive": 98,
  "negative": 32,
  "neutral": 12,
  "positiveRate": 68.3,
  "avgTotalMs": 3200,
  "avgSqlGenMs": 1800,
  "avgSqlExecMs": 450,
  "avgAnalysisMs": 950,
  "dailyUsage": [{ "date": "2026-04-15", "count": 23, "positive": 18 }],
  "topQueries": [{ "query": "오늘 FPY 조회해줘", "count": 5, "avgRating": "POSITIVE" }],
  "providerStats": [{ "providerId": "claude", "count": 80, "positiveRate": 82.5, "avgTotalMs": 2100 }]
}
```

**DELETE** — 선택/전체 삭제

```json
{ "feedbackIds": ["f1", "f2"] }   // 선택 삭제
{ "deleteAll": true }              // 전체 삭제
```

## 5. 분석 페이지: `/ai-chat/analytics`

### 5.1 레이아웃

```
┌─ DisplayHeader ────────────────────────────────────┐
├─ 필터 바 ──────────────────────────────────────────┤
│ [기간 프리셋] [날짜범위] [평점] [프로바이더] [조회]    │
├─ 통계 카드 (6개) ──────────────────────────────────┤
│ 총 대화 | 긍정 | 부정 | 중립 | 긍정률 | 평균응답시간  │
├─ 일별 사용량 추이 차트 ────────────────────────────┤
│ (막대: 건수, 선: 긍정률)                            │
├─ 2컬럼 ───────────────────────────────────────────┤
│ 자주 묻는 질문 TOP10  │ 프로바이더별 품질 비교        │
├─ 피드백 목록 (20건/페이지) ────────────────────────┤
│ ☑ | 평점 | 질문요약 | 프로바이더 | 응답시간 | 일시    │
├─ [선택삭제] [전체삭제] ── 페이지네이션 ─────────────┤
└─ DisplayFooter ────────────────────────────────────┘
```

### 5.2 상세 보기 모달

행 클릭 시 모달:
- 메타: 평점, 프로바이더, 모델, 일시, 성능(4단계)
- 사용자 질문 (원문)
- AI 응답 (마크다운 렌더링)
- 생성된 SQL (구문 강조)
- 결과 데이터 (테이블/차트)

### 5.3 차트 라이브러리

기존 프로젝트에서 사용 중인 Recharts 활용.

## 6. 채팅 UI 연동

### 6.1 MessageBubble 피드백 영속화

현재: `useState<'up'|'down'|null>` (로컬 전용)
변경:
- 좋아요 클릭 → `POST /api/ai-chat/feedback` (POSITIVE)
- 싫어요 클릭 → `POST /api/ai-chat/feedback` (NEGATIVE)
- 토글 해제 → `DELETE /api/ai-chat/feedback`
- 페이지 로드 시 기존 피드백 상태 복원

### 6.2 SessionSidebar 분석 링크

사이드바 하단에 차트 아이콘 + "분석" 링크 → `/ai-chat/analytics` 이동

### 6.3 stream API 성능 측정

SSE 스트림 파이프라인:

```
1. SQL_GEN_MS:  LLM 호출 시작 ~ SQL 텍스트 수신 완료
2. SQL_EXEC_MS: executeQuery 시작 ~ 결과 반환
3. ANALYSIS_MS: 결과 분석 LLM 호출 시작 ~ 완료
4. TOTAL_MS:    전체 (1+2+3+기타)
```

`AI_CHAT_MESSAGE` INSERT 시 4개 필드 모두 저장.
SSE 이벤트에 `perf` 데이터 포함 → 클라이언트에서 피드백 전송 시 활용.

## 7. 파일 구조

```
신규:
  migrations/002_ai_chat_feedback.sql
  src/app/ai-chat/analytics/page.tsx
  src/app/api/ai-chat/feedback/route.ts

수정:
  src/lib/ai/chat-store.ts                      — JSON → DB 전환
  src/app/api/ai-chat/stream/route.ts            — 성능 측정 3단계 분리
  src/app/ai-chat/_components/MessageBubble.tsx   — 피드백 API 연동
  src/app/ai-chat/_components/SessionSidebar.tsx  — 분석 링크 추가
  src/app/api/ai-chat/sessions/route.ts          — DB 전환 반영
  src/app/api/ai-chat/sessions/[id]/route.ts     — DB 전환 반영
  src/app/api/ai-chat/sessions/[id]/messages/route.ts — DB 전환 반영
```

## 8. 제약 사항

- Oracle DB 전용 (oracledb 드라이버)
- DML은 반드시 `executeDml()` 사용 (`executeQuery`는 커밋 안 됨)
- CLOB 컬럼에 대용량 데이터 저장 시 4000자 초과 가능 — oracledb 기본 지원
- 분석 페이지는 SCREENS 레지스트리 미등록 (라인 필터 불필요)
- 다크 모드 지원 필수 (`dark:` 클래스)
