# AI 지도학습 페이지 설계 — `/settings/ai-tables`

**날짜**: 2026-04-16
**상태**: Draft (사용자 검토 대기)
**관련 슬랙/이슈**: — (개발자 내부 과제)
**작성**: Claude (YouHyuksoo와 브레인스토밍)

---

## 1. 개요

### Problem
`/ai-chat`이 Mistral/Gemini/Claude 등 LLM에게 MES 스키마를 프롬프트로 주입해 SQL을 생성한다. 현재 문제:

1. **컨텍스트 주입 토큰 낭비** — catalog.json + schema-context.ts 전체를 JSON 덤프로 주입. 질문당 7000~10000 토큰 소비.
2. **코드 컬럼 해석 불안정** — `LOCATION_CODE`의 `M01`이 "양품"임을 LLM이 주석에서 자유텍스트로 추출해야 함. 환각 위험.
3. **관리 지점 분산** — `catalog.json`, `tables/*.md`, `schema-context.ts` 3곳에 테이블 정보가 중복 저장. 수정 시 동기화 부담.
4. **피드백 루프 부재** — `/ai-chat`에서 사용자가 좋아요를 눌러도 좋은 SQL이 학습 자산으로 축적되지 않음.
5. **질문 모호성 처리 부재** — "생산계획 보여줘" 같은 추상적 질문에 LLM이 zero-shot으로 대응 → 품질 변동 큼.

### Goal
**단일 전처리 페이지**에서 테이블·컬럼·예제·도메인을 큐레이션하여 AI에 구조화된 도메인 지식을 주입한다.

구체적으로:
- **컬럼 의미의 SSOT를 Oracle 주석으로 유지** — 페이지에서 직접 주석 편집(DDL) 가능
- **컬럼 도메인(의미 그룹) 개념 도입** — 감사 컬럼, 라인 코드, 위치 코드 등을 묶어 일괄 관리
- **3가지 생성 모드 지원** — exact(정확 일치) / template(슬롯 치환) / skeleton(대화 완성) + zero-shot 폴백
- **피드백 승격 루프** — `/ai-chat` 좋아요 → 예제 후보 풀 → 개발자 검토 후 공식 예제 등록
- **AI 초안 + 라이브 프리뷰** — 예제 생성 속도 향상 + 실행 결과 즉시 검증
- **프롬프트 주입 토큰 67% 감축** (예상 측정값)

### Non-goals
- 운영자/관리자용 UI는 본 범위 아님. **개발자 전용**이라 권한 모델/감사 UI는 제외.
- SQL 실행·결과 시각화는 기존 `/ai-chat`이 담당. 본 페이지의 라이브 프리뷰는 **예제 검증용 샘플 10행**에 한함.
- 기존 `/ai-chat` UI 대폭 개편은 본 범위 아님. 단, 피드백 버튼의 payload 확장과 Skeleton 대화 UI는 2단계 릴리스에서 추가 가능.

---

## 2. 의사결정 로그

| # | 항목 | 결정 |
|---|---|---|
| Q1 | 주 사용자 | 개발자 (권한 모델 불필요) |
| Q2 | 테이블 목록 출처 | DB 동적 조회 + 사이트 카테고리 |
| Q3 | 예제 구조 | `{question, sql, why}` 3요소 (D형) |
| Q4 | `enabled` 의미 | AI 컨텍스트 필터 전용 (페이지 목록엔 항상 표시) |
| Q5 | 정제 워크플로우 | 수동 편집 + AI 초안 버튼 + 라이브 프리뷰 (B+D 혼합) |
| Q6 | 주석 편집 방식 | 페이지 DDL 직접 실행 + 2단계 확인 + `scripts/sql/comment-history/` 자동 기록 |
| Q7 | 예제 공급원 | AI 초안(B) + 피드백 승격(C) 혼합 |
| Q8 | 저장소 구조 | `tables.json` 단일 파일 + 사이트 카테고리 |
| Q9 | Oracle 주석 활용 | SSOT로 채택. `ISYS_DUAL_LANGUAGE`로 한/영/스 라벨 보강 |
| Q10 | F_GET_BASECODE 매칭 | `컬럼명.replace(/_/g, ' ')` → `CODE_TYPE` |
| Q11 | 컬럼 사용여부·예제 포함 | 둘 다 설계에 포함 (columnOverrides + examples) |
| Q12 | 컬럼 도메인 | 의미 단위 그룹으로 도입, 이름 기반 사전을 흡수 |
| Q13 | 3가지 생성 모드 | exact/template/skeleton 모두 지원 |
| Q14 | AI 주입 방향 | 저장은 풍부하게, 주입 직전 컴팩트 포맷 렌더 |
| Q15 | UI 접근법 | C — IDE 스타일 3단 콘솔 |
| Q16 | AI 초안 스트리밍 | SSE (기존 `/ai-chat` 패턴 재사용) |
| Q17 | 상태 관리 | Zustand |

---

## 3. 현재 자산 현황

### 기존 데이터 저장소
| 위치 | 역할 | 개수·규모 |
|---|---|---|
| `data/ai-context/catalog.json` | 테이블 메타 (name/site/summary/tags) | 45개 테이블 |
| `data/ai-context/tables/*.md` | 테이블별 상세 문서 | 44개 파일 |
| `src/lib/ai/schema-context.ts` | 컬럼 명세 (자동 생성) | 1231컬럼 |
| Oracle `USER_TAB_COMMENTS` / `USER_COL_COMMENTS` | DB 주석 (실질 SSOT) | 다수 |
| `ISYS_DUAL_LANGUAGE` | 한/영/스 라벨 | 활용 중 |

### 기존 스크립트
- `scripts/batch_add_comments7.py` — `ISYS_BASECODE` 값을 컬럼 주석에 일괄 주입 (보존)
- `scripts/extract-schema-context.mjs` — schema-context.ts 재생성 (Phase 4에 폐기)
- `scripts/generate-table-doc-from-db.mjs` — MD 자동 생성 (Phase 4에 폐기)
- oracle-db 스킬의 `add_code_comments.py` — 컬럼명 공백 치환 매칭으로 코드값 주석 추가 (외부 자산, 보존)

### 기존 런타임 코드
- `src/lib/ai/context/context-loader.ts` — catalog.json 로드 + `catalogToPrompt()`
- `src/lib/ai/context/context-selector.ts` — Stage 0 LLM 선별 + heuristic 폴백
- `src/app/api/ai-chat/stream/route.ts` — SSE 기반 `/ai-chat` 백엔드
- `src/app/ai-chat/_components/MessageBubble.tsx` — 좋아요/싫어요/복사 피드백 (최근 커밋 `aa100fd`)

---

## 4. 데이터 모델

### 4.1 파일 맵 (최종)

```
data/ai-context/
├── tables.json             # 사이트 → 테이블 → { enabled, tags, columnOverrides, examples, feedbackQueue, ... }
├── column-domains.json     # 컬럼 도메인 정의 (의미 단위 그룹)
├── schema-cache.json       # DB 스키마 스냅샷 (동기화 산출물)
└── basecode-cache.json     # ISYS_BASECODE의 CODE_TYPE 목록 (자동완성용)

scripts/sql/comment-history/
└── YYYY-MM-DD_HHmmss_<TABLE>.sql    # DDL 실행 이력 (git 커밋)
```

### 4.2 `tables.json` 스키마

```typescript
type SiteKey = 'default' | '멕시코전장내부' | '멕시코VD외부' | '베트남VD외부';

interface AiTablesFile {
  version: 1;
  updatedAt: string;                             // ISO8601
  sites: Record<SiteKey, SiteTables>;
}

interface SiteTables {
  tables: Record<string, TableMeta>;             // key = 테이블명 (대문자)
}

interface TableMeta {
  enabled: boolean;                              // AI 컨텍스트 필터 (Q4)
  tags: string[];
  summary?: string;                              // ≤80자 (Stage 0 주입용)
  relatedTables?: string[];

  keywords?: string[];                           // 자연어 매칭 보조 ["생산실적", "라인 가동률"]
  defaultFilters?: DefaultFilter[];              // 항상 적용되는 WHERE 힌트
  joinPatterns?: JoinPattern[];                  // 자주 쓰는 JOIN
  businessNotes?: string;                        // 주의사항

  columnOverrides?: Record<string, ColumnOverride>;
  examples: Example[];
  feedbackQueue: FeedbackCandidate[];

  lastEditedAt?: string;
  lastEditedBy?: string;                         // OS 사용자명 (로컬)
}

interface DefaultFilter {
  sql: string;                                   // "STATUS='A'"
  purpose: string;
  alwaysApply: boolean;
}

interface JoinPattern {
  withTable: string;
  onClause: string;                              // "a.LINE_CODE = b.LINE_CODE"
  purpose: string;
}

interface ColumnOverride {
  priority?: 'key' | 'common' | 'rare';          // rare는 프롬프트 미주입
  excludeFromPrompt?: boolean;                   // 명시적 제외
  hint?: string;                                 // ≤40자
  decode?: ColumnDecode;
}

type ColumnDecode =
  | { kind: 'raw' }
  | { kind: 'basecode'; codeType: string }       // 공백 포함 문자열 (예: 'LOCATION CODE')
  | { kind: 'master'; table: string; keyCol: string; valCol: string }
  | { kind: 'enum'; values: Record<string, string> }
  | { kind: 'flag'; trueValue: string; falseValue?: string }
  | { kind: 'date'; format?: string };

type ExampleKind = 'exact' | 'template' | 'skeleton';

interface Example {
  id: string;                                    // nanoid(10)
  kind: ExampleKind;
  question: string;
  why: string;                                   // UI 전용 (저장)
  whyInPrompt?: boolean;                         // 기본 false (토큰 절약)
  createdAt: string;
  source: 'manual' | 'ai-draft' | 'promoted';
  promotedFrom?: { chatSessionId: string; messageId: string; likedAt: string; };

  // kind='exact'
  sql?: string;

  // kind='template'
  sqlTemplate?: string;
  slots?: ExampleSlot[];

  // kind='skeleton'
  dialog?: DialogStep[];
}

interface ExampleSlot {
  name: string;
  bind: string;                                  // SQL 내 :date, :line
  type: 'date' | 'daterange' | 'string' | 'number' | 'enum';
  required: boolean;
  default?: string;
  aliases?: string[];                            // 자연어 매핑 ["기간", "일자"]
  enumValues?: string[];
  hint?: string;
  placeholder?: string;
}

interface DialogStep {
  id: string;
  prompt: string;                                // AI가 사용자에게 물을 질문
  slotName: string;                              // ExampleSlot.name 참조
  required: boolean;
  suggestedAnswers?: string[];
  skipIf?: string;                               // 앞선 슬롯 값에 따라 스킵
}

interface FeedbackCandidate {
  id: string;                                    // = MessageBubble messageId
  sessionId: string;
  question: string;
  sql: string;
  likedAt: string;
  resultSampleJson?: string;                     // 상위 3행
  tablesReferenced: string[];                    // SQL 파싱 결과
}
```

### 4.3 `column-domains.json` 스키마

```typescript
interface ColumnDomainsFile {
  version: 1;
  updatedAt: string;
  domains: ColumnDomain[];
}

interface ColumnDomain {
  id: string;                         // 'audit-who', 'line-code'
  name: string;                       // '입력·수정자'
  description?: string;
  members: string[];                  // ["ENTER_BY", "MODIFY_BY", ...] (대문자)

  // 도메인 공통 설정 (모든 member 컬럼에 상속)
  excludeFromPrompt?: boolean;
  priority?: 'key' | 'common' | 'rare';
  hint?: string;
  decode?: ColumnDecode;
}
```

### 4.4 컬럼 설정 상속 우선순위 (높은 순)

1. `tables.json[site].tables[TABLE].columnOverrides[COL]` — 테이블별 예외
2. `column-domains.json` 중 `COL`을 members에 포함한 도메인의 공통 설정
3. Oracle DB 주석 (USER_COL_COMMENTS) — 기본값
4. schema-cache.json의 타입·NULL·PK 정보 (메타)

구현: `src/lib/ai-tables/domain-resolver.ts`의 `resolveColumn(table, col)` 함수가 이 4계층을 순서대로 머지.

### 4.5 `schema-cache.json` 스키마

```typescript
interface SchemaCacheFile {
  version: 1;
  refreshedAt: string;
  sites: Record<SiteKey, {
    tables: Record<string, CachedTableSchema>;
  }>;
}

interface CachedTableSchema {
  tableComment: string | null;
  pkColumns: string[];
  columns: CachedColumn[];
  refreshedAt: string;
}

interface CachedColumn {
  name: string;
  type: string;                       // 'VARCHAR2(50)' 가공 완료
  nullable: boolean;
  comment: string | null;             // USER_COL_COMMENTS
  labels: { ko?: string; en?: string; es?: string; };  // ISYS_DUAL_LANGUAGE 조인
}
```

갱신 주기: **"DB 동기화" 버튼 클릭 시**만. 쓰기(DDL 실행) 시엔 해당 테이블 엔트리만 부분 갱신.

### 4.6 `basecode-cache.json` 스키마

```typescript
interface BasecodeCacheFile {
  version: 1;
  refreshedAt: string;
  codeTypes: Array<{
    codeType: string;                 // 공백 포함 원문 (예: 'LOCATION CODE')
    sampleValues?: string[];          // 상위 5개 코드 값 (자동 제안 힌트용)
  }>;
}
```

### 4.7 DDL 이력 파일 포맷

파일명: `scripts/sql/comment-history/YYYY-MM-DD_HHmmss_<TABLE>.sql`

```sql
-- AI Tables Page — Comment History
-- table: LOG_AOI
-- site: default
-- user: hsyou
-- timestamp: 2026-04-16T14:23:11.000Z
-- change type: column
-- column: RESULT

-- BEFORE
-- data.RESULT

-- AFTER
-- data.RESULT (FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK)

COMMENT ON COLUMN LOG_AOI.RESULT IS 'data.RESULT (FAIL=FAIL, N=NG, NG=NG, OK=OK, PASS=PASS, Y=OK)';
```

- 파일 1개 = DDL 1개 실행 단위
- 여러 컬럼 동시 저장 시 여러 DDL이 한 파일에 누적
- 각 `-- BEFORE` 블록은 **수동 rollback recipe** 역할

---

## 5. 페이지 레이아웃 (C 접근법: IDE 스타일 3단 콘솔)

### 5.1 경로 및 네비
- URL: `/settings/ai-tables`
- 좌측 상단 모드 스위처: **🗃️ 테이블 / 📚 컬럼 도메인**
- 각 모드별 네비 콘텐츠 분기

### 5.2 테이블 모드 3단 레이아웃

폭 비율 (≥1440px): **18 : 27 : 55**

```
┌────────────────┬──────────────────┬─────────────────────────────┐
│ 좌측 네비       │ 테이블 목록       │ 상세 편집                    │
│ 🗃️ 테이블 모드 │ 🔍 검색          │ LOG_AOI  [default]          │
│ 📚 도메인 모드 │ 필터 ☐enabled    │ 탭 [Overview|Columns|       │
│                │      ☐예제없음    │     Dictionary|Filters/Joins│
│ ▼ default (45) │ ↻ DB 동기화       │     Examples|Prompt|History]│
│   ▼ LOG_ (20)  │ ───────────────── │                             │
│     LOG_AOI ●  │ ☑ LOG_AOI  💬12  │ [현재 탭 콘텐츠]             │
│     LOG_ICT    │ ☐ LOG_ICT  💬3   │                             │
│   ▼ IP_ (10)   │ ☑ LOG_EOL  🔔2   │                             │
│   ▼ IM_ (8)    │ ...              │                             │
│ ▶ 멕시코전장내부│                  │                             │
└────────────────┴──────────────────┴─────────────────────────────┘
```

**좌측 네비** — 사이트(`default`, `멕시코전장내부`...) + 테이블 접두어 그룹핑(`LOG_`, `IP_`, `IM_`, `ICOM_`, `ISYS_`, `IB_`). 접힘/펼침 상태는 localStorage.

**중간 목록** — 검색 (이름·summary substring), 필터 (`enabled만`, `예제 없음`), 각 행 = 체크박스(enabled) + 테이블명 + 💬 예제 수 + 🔔 승격 대기 수. 정렬: 이름 / 예제 수 / 최근 편집.

**우측 상세 탭** (7개):
1. **Overview** — 테이블 주석, 태그, 키워드, 비즈니스 노트 편집
2. **Columns** — 컬럼 테이블 + 일괄 편집 + ✨ F_GET_BASECODE 자동 감지
3. **Dictionary** — 이 테이블에 적용된 도메인 확인 + 도메인 이동 버튼
4. **Filters/Joins** — defaultFilters + joinPatterns 편집
5. **Examples** — 3 서브탭(Exact/Template/Skeleton) + 🔔 승격 대기 + 라이브 프리뷰
6. **Prompt Preview** — compact 포맷 + 예상 토큰 수 실시간 갱신
7. **History** — DDL 이력 (comment-history/*.sql 필터)

### 5.3 도메인 모드 레이아웃

좌측: 도메인 목록 (아이콘으로 상태 표시 — 🔇 exclude / 🔑 key priority / 📊 decode 있음)
우측: 선택된 도메인의 members 편집 + 공통 설정 + **영향 범위 통계** ("32개 테이블, 184 컬럼")
상단 "🔍 자동 제안" 버튼 → 배치 실행 → Accept/Edit/Reject.

### 5.4 반응형
- `1024~1440px`: 좌측 네비 축소 (아이콘만, 호버 시 툴팁)
- `< 1024px`: **단일 모드로 축소** — 상단 드롭다운으로 사이트·테이블 선택. 개발자 전용이므로 모바일은 "접근 권장하지 않음" 안내.

### 5.5 다크모드
글로벌 CLAUDE.md 규칙 준수: `dark:` 클래스 사용 시 반드시 기본값 지정 (`bg-white dark:bg-zinc-900`). 탭 활성 상태, 컬럼 테이블 호버, 모달 모두 대응.

---

## 6. API 설계

경로 루트: `/api/ai-tables/*` (기존 `/api/ai-chat/*` 과 병렬)
응답·요청: JSON. 에러 `{ error: string, code?: string }` + HTTP status.
권한: 인증 미들웨어 없음 (개발자 전용).

### 6.1 API 그룹 맵

```
/api/ai-tables
├── GET  /                                   # bootstrap (전체 상태 병합)
├── POST /sync                               # DB → schema-cache 재빌드 (diff 반환)
├── POST /basecode/refresh                   # ISYS_BASECODE → basecode-cache
├── /domains
│   ├── GET  /                               # 도메인 목록 + appliedTo 통계
│   ├── POST /                               # 새 도메인 생성
│   ├── POST /auto-suggest                   # 패턴 매칭 자동 제안
│   └── /[id]
│       ├── PATCH                            # 도메인 편집
│       └── DELETE                           # 삭제
├── /[site]/[table]
│   ├── GET                                  # 상세 로드
│   ├── PATCH                                # 메타 업데이트 (enabled, tags, keywords, businessNotes, defaultFilters, joinPatterns)
│   ├── /comment
│   │   ├── POST /preview                    # DDL 미리보기
│   │   └── POST /                           # DDL 실행 + 이력
│   ├── /columns
│   │   ├── POST /bulk                       # 다중 컬럼 일괄 편집
│   │   └── /[col]
│   │       ├── PATCH                        # 오버라이드 (priority/exclude/hint/decode)
│   │       ├── POST /comment/preview
│   │       ├── POST /comment
│   │       └── POST /label                  # ISYS_DUAL_LANGUAGE MERGE
│   ├── /examples
│   │   ├── GET  /                           # 목록
│   │   ├── POST /                           # 추가 (kind별 검증)
│   │   ├── POST /ai-draft                   # SSE 스트리밍 — 초안 생성
│   │   └── /[id]
│   │       ├── PATCH
│   │       ├── DELETE
│   │       └── POST /run                    # 라이브 프리뷰 실행 (ROWNUM≤10)
│   ├── /feedback-queue
│   │   ├── GET /                            # 승격 대기 목록
│   │   └── /[fbId]
│   │       ├── DELETE                       # 기각
│   │       └── POST /promote                # 예제로 승격 (kind 선택)
│   └── GET /preview                         # compact block + 토큰 수
└── GET /comment-history?table=X&limit=50    # DDL 이력
```

### 6.2 주요 엔드포인트 스펙

**`GET /api/ai-tables`**
```typescript
interface AiTablesBootstrap {
  sites: SiteKey[];
  activeSite: SiteKey;
  tables: Record<SiteKey, TableListRow[]>;
  domains: ColumnDomain[];
  basecodeTypes: string[];
  stats: { tables: number; enabled: number; examples: number; pendingFeedback: number; };
}

interface TableListRow {
  name: string;
  enabled: boolean;
  tags: string[];
  summary?: string;
  columnCount: number;
  exampleCount: number;
  pendingFeedbackCount: number;
  lastEditedAt?: string;
}
```

**`POST /api/ai-tables/sync`** — 응답
```typescript
{
  added: string[];
  removed: string[];
  modified: Array<{
    table: string;
    columns: { added: string[]; removed: string[]; };
  }>;
}
```

**`POST /api/ai-tables/[site]/[table]/comment/preview`**
- 요청: `{ newComment: string }`
- 응답: `{ before: string; after: string; ddl: string; }`

**`POST /api/ai-tables/[site]/[table]/comment`**
- 요청: `{ ddl: string; before: string; confirmedAt: string; }`
- 응답: `{ ok: true; historyFile: string; }`
- 서버 측 검증: `ddl`이 `/^COMMENT\s+ON\s+(TABLE|COLUMN)\s+/i` 매칭해야만 실행.

**`POST /api/ai-tables/[site]/[table]/columns/bulk`**
- 요청:
  ```typescript
  {
    columns: string[];
    action: 'set_priority' | 'set_exclude' | 'assign_domain';
    value: 'key'|'common'|'rare' | boolean | string;  // action별
  }
  ```
- 응답: `{ ok: true; updated: number; }`

**`POST /api/ai-tables/[site]/[table]/columns/[col]/label`**
- 요청: `{ ko?: string; en?: string; es?: string; }`
- 동작: ISYS_DUAL_LANGUAGE MERGE (KEY_CODE = `<table>.<column>`)
- 응답: `{ ok: true }`

**`POST /api/ai-tables/[site]/[table]/examples/ai-draft`** (SSE)
- 요청: `{ count: number; kinds: ExampleKind[]; }`
- 응답 (SSE 이벤트):
  - `event: draft, data: { example: Example }` (각 초안 완성 시)
  - `event: error, data: { message: string }`
  - `event: done, data: { totalTokens: number }`
- 클라이언트는 `EventSource` 또는 `fetch` + ReadableStream으로 소비.

**`POST /api/ai-tables/[site]/[table]/examples/[id]/run`**
- 요청: `{ bindings?: Record<string, string|number> }` (template/skeleton일 때)
- 응답:
  ```typescript
  {
    ok: true;
    renderedSql: string;
    columns: Array<{ name: string; decoded?: string }>;
    rows: Record<string, unknown>[];  // ≤10
    elapsedMs: number;
    estimatedCost: number;            // EXPLAIN PLAN cost
    warnings?: string[];
  }
  ```

**`POST /api/ai-tables/domains/auto-suggest`**
- 응답:
  ```typescript
  {
    suggestions: Array<{
      domainId: string;
      name: string;
      reason: string;                 // "접미 '_BY' 17개 매칭"
      proposedMembers: string[];
      proposedSettings: Partial<ColumnDomain>;
    }>;
  }
  ```

### 6.3 `/ai-chat` 피드백 훅 확장

`src/app/api/ai-chat/stream/route.ts` 또는 피드백 API에서 좋아요 이벤트 처리 시:
1. SQL 문자열을 `src/lib/ai-tables/sql-table-parser.ts`의 `extractTableNames()`에 전달
2. 참조된 각 테이블의 `tables.json[site].tables[TABLE].feedbackQueue`에 후보 추가
3. 중복 방지: 같은 `messageId`는 한 번만 추가

---

## 7. 핵심 인터랙션 플로우

섹션 ④에서 다룬 시나리오의 요약:

**A. 신규 테이블 발견** — ↻ 동기화 → diff 배너 → LOG_NEW 선택 → ✨ 자동 감지 → decode 적용 → 저장

**B. 주석 편집** — Columns 탭에서 더블클릭 → POST /preview → DdlPreviewModal (before/after + DDL) → 확인 → POST /comment → executeDml + 이력 파일 + schema-cache 부분 갱신

**C. AI 초안** — ✨ 버튼 → POST /ai-draft (SSE) → 초안 카드 순차 fade-in → 각 초안 편집 → 개별 저장

**D. 피드백 승격** — /ai-chat 좋아요 → tablesReferenced 추출 → feedbackQueue 누적 → 개발자가 페이지에서 검토 → kind 선택 + 편집 → POST /promote → examples[] 추가

**E. 컬럼 도메인 자동 제안** — 📚 도메인 탭 → 🔍 자동 제안 → 후보 목록 → 전부 Accept → 8개 도메인 생성, 142컬럼 분류

**F. /ai-chat 질문 캐스케이드** — Stage 0 context-selector → Stage 1 example-matcher:
- ≥0.9 exact → SQL 그대로 (~50 토큰)
- ≥0.7 template → 소형 LLM 슬롯 추출 (~200 토큰)
- ≥0.7 skeleton → dialog 멀티턴 (~500/턴)
- <0.7 → Stage 2 zero-shot (기존 방식, ~2500 토큰)

**매칭 알고리즘 (1차 구현)**: 키워드 + alias 매칭 점수 (임베딩은 2차 확장).

---

## 8. 기존 자산 이관 전략

### 8.1 Before / After 자산 매핑

| 자산 | 이관 후 운명 |
|---|---|
| `data/ai-context/catalog.json` | Phase 4에서 제거 (tables.json이 대체) |
| `data/ai-context/tables/*.md` (44개) | Phase 4에서 제거 (내용은 Phase 1에서 tables.json.examples로 이관) |
| `src/lib/ai/schema-context.ts` | 수정 — `SCHEMA` const를 `getSchema()` 함수로 래핑, schema-cache.json lazy 로드 |
| `scripts/extract-schema-context.mjs` | Phase 4에서 폐기 (동기화 API가 대체) |
| `scripts/generate-table-doc-from-db.mjs` | Phase 4에서 폐기 |
| `scripts/batch_add_comments7.py` | **보존** (수백 컬럼 일괄 배치에 효율적) |
| `src/lib/ai/context/context-loader.ts` | 리팩터링 (loadMergedContext 추가) |
| `src/lib/ai/context/context-selector.ts` | 수정 (enabled 필터 3곳) |

### 8.2 Phase 플랜

**Phase 0 (0.5일)** — 준비
- 신규 빈 파일 3개 생성 (`tables.json`, `column-domains.json`, `basecode-cache.json` — version: 1)
- `src/lib/ai-tables/` 모듈 골격만 생성 (타입 + 빈 함수)
- 기존 `/ai-chat` 동작 무영향 확인

**Phase 1 (1일)** — 마이그레이션 1회 실행
- `scripts/migrate-to-tables-json.mjs` 작성
- catalog.json + tables/*.md + DB 조회로 tables.json + schema-cache.json + basecode-cache.json 생성
- 도메인 자동 제안 1회 실행하여 column-domains.json 시드
- **기존 자산은 건드리지 않음** (catalog.json, MD 파일 모두 유지)

**Phase 2 (1.5일)** — 런타임 전환
- `src/lib/ai/context/context-loader.ts` 내부 구현을 `loadMergedContext()`로 교체 (외부 API 호환)
- `src/lib/ai/context/context-selector.ts`에 `enabled !== false` 필터 3곳 추가
- `src/lib/ai/schema-context.ts`의 `SCHEMA`를 `getSchema()` 함수로 래핑
- 회귀 테스트: 동일 질문이 Phase 1 전후에 같은 SQL 생성

**Phase 3 (5~7일)** — 페이지 + API 풀 구현
- `/settings/ai-tables` 페이지
- `/api/ai-tables/*` 전체 엔드포인트
- `/ai-chat` 피드백 훅에 `tablesReferenced` 추출 추가
- 이 시점 **기존 catalog.json, tables/*.md, schema-context.ts 파일 그대로 존재** (읽기 전용으로만 남음)

**Phase 4 (0.5일, Phase 3 안정화 1~2주 후)** — 정리
- catalog.json / tables/ / extract-schema-context.mjs / generate-table-doc-from-db.mjs 삭제
- context-loader.ts의 레거시 래퍼 제거
- schema-context.ts → ai-tables/schema-loader.ts로 이동

### 8.3 롤백 시나리오

| 사고 | 복구 |
|---|---|
| 마이그레이션 스크립트 오류 | 신규 파일만 git restore |
| Phase 2 배포 후 SQL 품질 저하 | Phase 1 커밋으로 revert |
| DB 주석 실수 저장 | comment-history/*.sql의 `-- BEFORE` 블록 뒤집어 실행 |
| 도메인 잘못 매핑 | column-domains.json 파일 단위 revert |
| tables.json 수동 손상 | git log로 이전 버전 복원 |

---

## 9. 파일·컴포넌트 구조

### 9.1 신규 파일 트리

```
src/app/settings/ai-tables/
├── page.tsx                              # 페이지 shell (≤300줄)
├── _components/
│   ├── nav/
│   │   ├── ModeSwitcher.tsx
│   │   ├── SiteTableNav.tsx
│   │   └── DomainNav.tsx
│   ├── list/
│   │   ├── TableList.tsx
│   │   ├── TableListRow.tsx
│   │   └── DbSyncButton.tsx
│   ├── detail/
│   │   ├── TableDetail.tsx
│   │   └── DetailTabs.tsx
│   ├── tabs/
│   │   ├── OverviewTab.tsx
│   │   ├── ColumnsTab.tsx
│   │   ├── DictionaryTab.tsx
│   │   ├── FiltersJoinsTab.tsx
│   │   ├── ExamplesTab.tsx
│   │   ├── PromptPreviewTab.tsx
│   │   └── HistoryTab.tsx
│   ├── editors/
│   │   ├── ColumnRow.tsx
│   │   ├── ColumnOverrideForm.tsx
│   │   ├── DecodeEditor.tsx
│   │   ├── ExampleExactEditor.tsx
│   │   ├── ExampleTemplateEditor.tsx
│   │   ├── ExampleSkeletonEditor.tsx
│   │   ├── SlotEditor.tsx
│   │   ├── DialogStepEditor.tsx
│   │   └── DomainEditor.tsx
│   ├── modals/
│   │   ├── DdlPreviewModal.tsx
│   │   ├── DomainAutoSuggestModal.tsx
│   │   ├── BulkColumnActionModal.tsx
│   │   └── PromoteFeedbackModal.tsx
│   ├── shared/
│   │   ├── DomainBadge.tsx
│   │   ├── PriorityPill.tsx
│   │   ├── EnabledToggle.tsx
│   │   ├── LivePreview.tsx
│   │   ├── TokenCounter.tsx
│   │   └── DiffView.tsx
│   └── feedback/
│       ├── FeedbackQueueSection.tsx
│       └── FeedbackCandidateCard.tsx
└── _hooks/
    ├── useAiTablesStore.ts              # Zustand store
    ├── useCurrentTable.ts
    ├── useColumnEditor.ts
    ├── useDdlFlow.ts
    ├── useAiDraftStream.ts
    ├── useLivePreview.ts
    └── useFeedbackQueue.ts

src/app/api/ai-tables/                   # (섹션 6.1 경로 맵 그대로)

src/lib/ai-tables/
├── types.ts
├── paths.ts
├── mutex.ts                             # 간단한 in-memory lock
├── store.ts
├── schema-loader.ts
├── basecode-loader.ts
├── ddl-executor.ts
├── dual-language.ts
├── domain-suggester.ts
├── domain-resolver.ts
├── prompt-renderer.ts
├── example-matcher.ts
├── slot-extractor.ts
├── feedback-queue.ts
├── sql-table-parser.ts
├── validators.ts
├── ai-draft.ts
└── tokenizer.ts

src/lib/ai/context/
├── context-loader.ts                    # 수정
├── context-selector.ts                  # 수정
└── context-loader-legacy.ts             # 임시 호환 래퍼 (Phase 4 삭제)

scripts/
├── migrate-to-tables-json.mjs           # 신규 1회
└── sql/comment-history/                 # 신규 폴더

docs/superpowers/specs/
└── 2026-04-16-ai-tables-training-design.md   # 본 문서
```

### 9.2 파일 길이 가드
CLAUDE.md 규칙: 페이지 ≤300줄, 컴포넌트 ≤200줄, 초과 시 분해.

### 9.3 의존성 그래프 (서버 모듈)
```
API routes
  └─ store (루트 진입점)
     ├─ schema-loader
     ├─ basecode-loader
     ├─ ddl-executor ─ dual-language
     ├─ domain-suggester
     ├─ domain-resolver
     ├─ prompt-renderer ← example-matcher ← slot-extractor
     ├─ feedback-queue ← sql-table-parser
     ├─ validators
     └─ ai-draft ← tokenizer
```
순환 참조 금지. `types.ts` / `paths.ts`는 공용.

---

## 10. 테스트 전략

| 모듈 | 중요도 | 유형 |
|---|---|---|
| `ddl-executor.ts` | 높음 | 단위 — DROP/INSERT 등 비허용 DDL 거부 |
| `domain-resolver.ts` | 높음 | 단위 — 4계층 병합 스냅샷 |
| `prompt-renderer.ts` | 높음 | 스냅샷 — 테이블 시나리오별 컴팩트 포맷 |
| `sql-table-parser.ts` | 높음 | 단위 — JOIN/CTE/서브쿼리 케이스 |
| `domain-suggester.ts` | 중간 | 단위 — 패턴 매칭 샘플 |
| `validators.ts` | 중간 | 단위 — Example.kind별 필드 검증 |
| 페이지 컴포넌트 | 낮음 | 수동 QA (개발자 전용) |

프레임워크: Jest (이미 설치) + React Testing Library.

---

## 11. 의존성

### 신규 설치
```bash
npm i zustand
```
- **`zustand`** — 전역 상태 관리 (~3KB gzip)

### 기존 활용
- `swr@^2.4.1` — 서버 상태 캐싱 및 재검증
- `oracledb` — DB 접근 (기존 `lib/db.ts` 래퍼 재사용)
- `nanoid` — Example ID 생성 (이미 사용 중인지 확인 필요, 없으면 설치)

### 불필요 판정
- `tiktoken` 미사용 — `Math.ceil(text.length / 3)` 경험식으로 대체 (±15% 오차, 본 목적 충분)
- `proper-lockfile` 미사용 — 단일 개발자 환경이라 in-memory mutex(`src/lib/ai-tables/mutex.ts`)로 충분

---

## 12. 성능 목표

| 지표 | 현재 | 목표 |
|---|---|---|
| `/ai-chat` 질문당 프롬프트 토큰 | 7000~10000 | 2000~3000 (67% 감축) |
| 정형 질문(exact 매칭) 토큰 | 2500 | ~50 (98% 감축) |
| 파라미터 질문(template) 토큰 | 2500 | ~200 (92% 감축) |
| 페이지 bootstrap 로드 | — | ≤500ms (캐시 hit) |
| DB 동기화 (45 테이블) | — | ≤10초 |
| 라이브 프리뷰 실행 | — | ≤3초 (ROWNUM≤10 + EXPLAIN PLAN) |
| AI 초안 3개 생성 (SSE 완료) | — | 10~30초 (LLM 응답 속도 의존) |

---

## 13. 오픈 이슈 (구현 착수 시 확인)

| # | 이슈 | 해결 시점 |
|---|---|---|
| O1 | `ISYS_DUAL_LANGUAGE` 실제 스키마 확인 (CATEGORY/KEY_CODE/KOR/ENG/SPA 가정 중) | Phase 0 착수 직후 DB 조회로 확정 |
| O2 | `nanoid` 패키지 설치 여부 확인 | Phase 0 |
| O3 | 임베딩 기반 매칭 API 선택 (Gemini text-embedding-004 vs OpenAI) | Phase 3b (v2) |
| O4 | Skeleton 대화 멀티턴을 `/ai-chat` UI에 노출할지 | Phase 3b |
| O5 | F_GET_BASECODE 함수의 3번째 인자(언어) 호출 규약 확인 | Phase 0 |
| O6 | 특정 컬럼명(`NULL` 등)이 SQL 파서에서 문제 일으키지 않는지 | sql-table-parser.ts 테스트 단계 |

---

## 14. 릴리스 범위

### v1 (필수, Phase 3 완료 시점)
- [x] 3단 콘솔 페이지 (테이블/도메인 모드)
- [x] Oracle 주석 편집 (DDL 2단계 확인 + 이력)
- [x] 컬럼 오버라이드 (priority/exclude/hint/decode)
- [x] 컬럼 도메인 CRUD + 자동 제안
- [x] 예제 3종(exact/template/skeleton) 수동 편집
- [x] AI 초안 생성 (SSE)
- [x] 피드백 승격 큐
- [x] 라이브 프리뷰
- [x] Prompt Preview 탭 (토큰 수 표시)
- [x] compact 포맷 렌더러 → `/ai-chat` 토큰 절감
- [x] Stage 1 매칭 캐스케이드 (exact/template/skeleton)

### v2 (선택, Phase 3b)
- [ ] 임베딩 기반 유사도 매칭
- [ ] Skeleton dialog 멀티턴 `/ai-chat` UI
- [ ] 컬럼 도메인 편집 히스토리
- [ ] 팀 공유 시 감사 로그
- [ ] 다중 사이트 동시 편집 지원

---

## 15. 승인

- [ ] 사용자 승인 (디자인 문서 리뷰)
- [ ] writing-plans 스킬로 실행 계획 생성
