/**
 * @file src/lib/ai-tables/table-prefilter.ts
 * @description Stage 0 로컬 prefilter — 질의 키워드를 테이블 메타에 매칭해 상위 N 후보 선별.
 *
 * 초보자 가이드:
 * - 636개 테이블 전체를 LLM 에 노출하는 건 낭비 → 키워드 매칭으로 30~50개로 축소 후 LLM.
 * - 외부 라이브러리 없음. 단순 substring 매칭 + 위치별 가중치.
 * - 점수가 0인 질의는 호출부에서 전체 fallback 결정.
 *
 * 매칭 규칙:
 *   - 테이블명 포함: +5 (최강)
 *   - PK/상위 컬럼명 포함: +2
 *   - summary/태그 포함: +2
 *   - category 매칭: +1
 */

import type {
  SchemaCacheFile,
  CachedTableSchema,
  SiteKey,
} from './types';

export interface PrefilterInput {
  query: string;
  site: SiteKey;
  schema: SchemaCacheFile;
  wikiTables?: Record<string, { fm: Record<string, unknown>; body: string }>;
  topN?: number;
  /**
   * 사용함(enabled=true) 테이블 이름 집합. 주어지면 이 안에서만 후보 풀을 구성.
   * 주어지지 않거나 빈 Set 이면 schema 의 모든 테이블 대상.
   */
  enabledOnly?: Set<string>;
}

export interface PrefilterResult {
  tables: string[]; // 상위 N 테이블명 (스코어 내림차순)
  totalMatched: number; // 스코어 > 0 총 개수
  totalCandidates: number; // schema 전체 테이블 수
}

/**
 * 한글 ↔ 영문 키워드 매핑. 한글 토큰이 질의에 나타나면 대응 영문 토큰도 함께 검색.
 * MES 도메인 용어 중심. 점진 확장 가능.
 */
const KO_EN_ALIASES: Record<string, string[]> = {
  품목: ['item'],
  라인: ['line'],
  모델: ['model'],
  설비: ['equipment', 'machine', 'eqp', 'fact'],
  기계: ['equipment', 'machine', 'eqp'],
  바코드: ['barcode', 'pdb'],
  불량: ['bad', 'defect', 'ng'],
  양품: ['good', 'ok', 'pass'],
  수율: ['yield', 'fpy'],
  사용자: ['user'],
  작업자: ['user', 'worker'],
  날짜: ['date'],
  시프트: ['shift'],
  공정: ['workstage', 'stage', 'routing'],
  자재: ['material', 'mat'],
  부품: ['part', 'item'],
  생산: ['product', 'production'],
  출고: ['issue'],
  입고: ['arrival', 'receive'],
  재고: ['inventory', 'stock'],
  공장: ['plant', 'factory'],
  계획: ['plan', 'target'],
  목표: ['target', 'plan'],
  실적: ['actual', 'io', 'product'],
  검사: ['inspect', 'check', 'log', 'qc'],
  품질: ['qc', 'quality', 'defect'],
  납땜: ['solder'],
  마스터: ['master', 'mst'],
  이력: ['history', 'log', 'hist'],
  온도: ['temperature', 'temp'],
  매거진: ['magazine'],
  포장: ['pack'],
  스펙: ['spec'],
  코드: ['code', 'basecode'],
  위치: ['location'],
  창고: ['warehouse', 'storage'],
};

/**
 * 질의에서 의미있는 키워드를 추출.
 * - 한글 2자+, 영문 2자+, 숫자 2자+ 만 채택
 * - 불용어 제거
 * - 한글 토큰은 KO_EN_ALIASES 로 영문 확장
 */
function tokenize(query: string): string[] {
  const STOP = new Set([
    '조회',
    '해줘',
    '보여줘',
    '알려줘',
    '찾아줘',
    '의',
    '을',
    '를',
    '이',
    '가',
    '는',
    '은',
    '에서',
    '으로',
    '에',
    '에게',
    '에서',
    '까지',
    '부터',
    'the',
    'a',
    'an',
    'of',
    'to',
    'in',
    'on',
    'for',
    'and',
    'or',
    'please',
    'show',
    'me',
  ]);
  const tokens = new Set<string>();
  // 한글·영문·숫자·언더스코어 덩어리를 분리
  const matches = query.match(/[\p{L}\p{N}_]+/gu) ?? [];
  for (const raw of matches) {
    const lower = raw.toLowerCase();
    if (lower.length < 2) continue;
    if (STOP.has(lower)) continue;
    tokens.add(lower);
    // 언더스코어 포함 식별자(LOG_ICT)는 분리 토큰도 추가 (log, ict)
    if (lower.includes('_')) {
      for (const part of lower.split('_')) {
        if (part.length >= 2 && !STOP.has(part)) tokens.add(part);
      }
    }
    // 한글 → 영문 확장
    const mapped = KO_EN_ALIASES[lower];
    if (mapped) {
      for (const en of mapped) tokens.add(en);
    }
  }
  return [...tokens];
}

export function prefilterTables(input: PrefilterInput): PrefilterResult {
  const {
    query,
    site,
    schema,
    wikiTables = {},
    topN = 30,
  } = input;

  const tokens = tokenize(query);
  const siteSchema = schema.sites[site]?.tables ?? {};
  const enabledOnly = input.enabledOnly;
  const totalCandidates =
    enabledOnly && enabledOnly.size > 0
      ? enabledOnly.size
      : Object.keys(siteSchema).length;

  if (tokens.length === 0) {
    return { tables: [], totalMatched: 0, totalCandidates };
  }

  const scored: Array<{ name: string; score: number }> = [];

  for (const [name, schemaMeta] of Object.entries(siteSchema) as Array<
    [string, CachedTableSchema]
  >) {
    // 사용함 집합이 주어지면 여기 포함된 것만 스코어링
    if (enabledOnly && enabledOnly.size > 0 && !enabledOnly.has(name)) {
      continue;
    }
    const wikiMd = wikiTables[name];

    const nameLower = name.toLowerCase();
    const summary = (
      (typeof wikiMd?.fm.summary === 'string' ? wikiMd.fm.summary : undefined) ??
      schemaMeta.tableComment ??
      ''
    ).toLowerCase();
    const tags = (
      Array.isArray(wikiMd?.fm.tags) ? (wikiMd.fm.tags as string[]) : []
    ).map((t) => t.toLowerCase());
    const category = ((wikiMd?.fm.category as string | undefined) ?? '').toLowerCase();

    // 주요 컬럼명 (PK + 상위 10개) — prefilter 용
    const pkLower = schemaMeta.pkColumns.map((p) => p.toLowerCase());
    const topCols = schemaMeta.columns
      .slice(0, 10)
      .map((c) => c.name.toLowerCase());

    let score = 0;
    for (const kw of tokens) {
      if (nameLower.includes(kw)) score += 5;
      if (pkLower.some((p) => p.includes(kw))) score += 3;
      if (topCols.some((c) => c.includes(kw))) score += 2;
      if (summary.includes(kw)) score += 2;
      if (tags.some((t) => t.includes(kw) || kw.includes(t))) score += 2;
      if (category.includes(kw)) score += 1;
    }

    if (score > 0) scored.push({ name, score });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = scored.slice(0, topN).map((s) => s.name);
  return {
    tables: top,
    totalMatched: scored.length,
    totalCandidates,
  };
}
