/**
 * @file src/lib/ai-tables/types.ts
 * @description AI 지도학습 페이지 전체 타입 정의.
 *
 * 초보자 가이드:
 * 1. **주요 개념**: tables.json / column-domains.json / schema-cache.json / basecode-cache.json 4개 파일의 스키마를 TypeScript 타입으로 정의.
 * 2. **상속 규칙**: ColumnOverride (테이블별) > ColumnDomain (의미 그룹) > Oracle 주석 (SSOT).
 * 3. **Example.kind**: `exact` (그대로) | `template` (슬롯 치환) | `skeleton` (대화 완성).
 *
 * 원본 설계: docs/superpowers/specs/2026-04-16-ai-tables-training-design.md §4
 */

/** 지원 사이트 — config/database.json의 profiles 이름과 일치해야 함. */
export type SiteKey = 'default' | '멕시코전장내부' | '멕시코VD외부' | '베트남VD외부';

// ────────────────────────────────────────────────────────────────────────────
// tables.json
// ────────────────────────────────────────────────────────────────────────────

export interface AiTablesFile {
  version: 1;
  updatedAt: string;                                  // ISO8601
  sites: Record<SiteKey, SiteTables>;
}

export interface SiteTables {
  tables: Record<string, TableMeta>;                  // key = 테이블명 (대문자)
}

export interface TableMeta {
  enabled: boolean;                                   // AI 컨텍스트 필터 (Spec Q4)
  tags: string[];
  summary?: string;                                   // ≤80자 권장 (Stage 0 주입용)
  relatedTables?: string[];

  /** 자연어 매칭 보조 키워드. */
  keywords?: string[];
  /** 항상 적용되는 WHERE 힌트. LLM에게 주입 시 "반드시 포함" 지시. */
  defaultFilters?: DefaultFilter[];
  /** 자주 쓰는 JOIN 패턴. */
  joinPatterns?: JoinPattern[];
  /** 테이블 사용 주의사항 (야간 배치 등). */
  businessNotes?: string;

  /** 컬럼 단위 오버라이드 (최우선 상속). */
  columnOverrides?: Record<string, ColumnOverride>;

  examples: Example[];
  feedbackQueue: FeedbackCandidate[];

  lastEditedAt?: string;
  lastEditedBy?: string;                              // OS 사용자명 (로컬)
}

export interface DefaultFilter {
  sql: string;                                        // "STATUS='A'"
  purpose: string;
  alwaysApply: boolean;
}

export interface JoinPattern {
  withTable: string;
  onClause: string;                                   // "a.LINE_CODE = b.LINE_CODE"
  purpose: string;
}

export interface ColumnOverride {
  priority?: 'key' | 'common' | 'rare';               // rare는 프롬프트 미주입
  excludeFromPrompt?: boolean;
  hint?: string;                                      // ≤40자
  decode?: ColumnDecode;
}

/**
 * 컬럼 디코딩 전략.
 *
 * F_GET_BASECODE 호출 시 CODE_TYPE은 **공백 포함 문자열** (예: 'LOCATION CODE').
 * 규칙: 컬럼명에서 `_`를 공백으로 치환한 값이 CODE_TYPE 후보.
 * 호출 시그니처: F_GET_BASECODE(P_CODE_TYPE, P_CODE_NAME, P_LANG, P_ORG)
 */
export type ColumnDecode =
  | { kind: 'raw' }
  | { kind: 'basecode'; codeType: string }
  | { kind: 'master'; table: string; keyCol: string; valCol: string }
  | { kind: 'enum'; values: Record<string, string> }
  | { kind: 'flag'; trueValue: string; falseValue?: string }
  | { kind: 'date'; format?: string };

// ────────────────────────────────────────────────────────────────────────────
// Example (3종)
// ────────────────────────────────────────────────────────────────────────────

export type ExampleKind = 'exact' | 'template' | 'skeleton';

export interface Example {
  id: string;                                         // nanoid(10)
  kind: ExampleKind;
  question: string;
  /** UI 전용. 기본적으로 프롬프트에는 미주입 (토큰 절약). */
  why: string;
  whyInPrompt?: boolean;
  createdAt: string;
  source: 'manual' | 'ai-draft' | 'promoted';
  promotedFrom?: {
    chatSessionId: string;
    messageId: string;
    likedAt: string;
  };

  // kind='exact'
  sql?: string;

  // kind='template' / 'skeleton'
  sqlTemplate?: string;
  slots?: ExampleSlot[];

  // kind='skeleton'
  dialog?: DialogStep[];
}

export interface ExampleSlot {
  name: string;                                       // 'from_date'
  bind: string;                                       // ':from_date'
  type: 'date' | 'daterange' | 'string' | 'number' | 'enum';
  required: boolean;
  default?: string;                                   // "TRUNC(SYSDATE)"
  aliases?: string[];                                 // 자연어 매핑 ["기간", "일자"]
  enumValues?: string[];
  hint?: string;
  placeholder?: string;
}

export interface DialogStep {
  id: string;
  prompt: string;                                     // AI가 사용자에게 물을 질문
  slotName: string;                                   // ExampleSlot.name 참조
  required: boolean;
  suggestedAnswers?: string[];
  skipIf?: string;                                    // 앞선 슬롯 조건식
}

// ────────────────────────────────────────────────────────────────────────────
// 피드백 승격 큐
// ────────────────────────────────────────────────────────────────────────────

export interface FeedbackCandidate {
  id: string;                                         // = MessageBubble messageId
  sessionId: string;
  question: string;
  sql: string;
  likedAt: string;
  resultSampleJson?: string;                          // 상위 3행
  tablesReferenced: string[];                         // SQL 파싱 결과
}

// ────────────────────────────────────────────────────────────────────────────
// column-domains.json
// ────────────────────────────────────────────────────────────────────────────

export interface ColumnDomainsFile {
  version: 1;
  updatedAt: string;
  domains: ColumnDomain[];
}

export interface ColumnDomain {
  id: string;                                         // 'audit-who', 'line-code'
  name: string;                                       // '입력·수정자'
  description?: string;
  members: string[];                                  // ["ENTER_BY", ...] (대문자)
  // 도메인 공통 설정 — 모든 member 컬럼에 상속
  excludeFromPrompt?: boolean;
  priority?: 'key' | 'common' | 'rare';
  hint?: string;
  decode?: ColumnDecode;
}

// ────────────────────────────────────────────────────────────────────────────
// schema-cache.json
// ────────────────────────────────────────────────────────────────────────────

export interface SchemaCacheFile {
  version: 1;
  refreshedAt: string;
  sites: Record<SiteKey, { tables: Record<string, CachedTableSchema>; }>;
}

export interface CachedTableSchema {
  tableComment: string | null;
  pkColumns: string[];
  columns: CachedColumn[];
  refreshedAt: string;
}

export interface CachedColumn {
  name: string;
  type: string;                                       // 'VARCHAR2(50)' 가공 완료
  nullable: boolean;
  comment: string | null;                             // USER_COL_COMMENTS 그대로
  /**
   * ISYS_DUAL_LANGUAGE 조인 라벨. v1에서는 비어 있을 수 있음.
   * **주의**: 실제 ISYS_DUAL_LANGUAGE 구조는 ENGLISH_TEXT 기반 UI 라벨 사전이라
   * 컬럼 자체와 직접 매핑되지 않음. v2에서 영문 용어 매핑 규약 정립 후 채움.
   */
  labels: { ko?: string; en?: string; es?: string; };
}

// ────────────────────────────────────────────────────────────────────────────
// basecode-cache.json
// ────────────────────────────────────────────────────────────────────────────

export interface BasecodeCacheFile {
  version: 1;
  refreshedAt: string;
  codeTypes: Array<{
    codeType: string;                                 // 공백 포함 원문 (예: 'LOCATION CODE')
    sampleValues?: string[];                          // 상위 5개 코드 값
  }>;
}
