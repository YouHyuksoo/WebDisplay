# 후공정생산현황 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 멕시코전장 후공정 종합 모니터링 페이지(`/mxvc/post-process`) — 생산달성율, 검사공정 직행율, 불량율, 재검사율, 수리대기/완료, 매거진 대기재공을 한 화면에 표시.

**Architecture:** 단일 API(`/api/mxvc/post-process`)가 6종 데이터를 `Promise.all`로 병렬 집계해 반환. 클라이언트는 `PostProcessDashboard`가 필터바를 포함하고 하위 컴포넌트 3개(KPI카드, 차트, 테이블)에 props로 전달.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS 4, recharts, Oracle oracledb (executeQuery - 멕시코전장외부 프로필)

---

## 파일 맵

| 경로 | 역할 |
|---|---|
| `src/types/mxvc/post-process.ts` | 응답/설정 타입 정의 |
| `src/lib/screens.ts` | `mxvc-post-process` 화면 등록 |
| `config/cards.json` | 메뉴 카드 layer=8 추가 |
| `src/lib/queries/post-process.ts` | SQL 쿼리 헬퍼 (시간필터, 결함/재검사율, FPY 시간별) |
| `src/app/api/mxvc/post-process/route.ts` | GET 핸들러 — 6개 쿼리 병렬 실행 |
| `src/components/mxvc/PostProcessKpiCards.tsx` | KPI 카드 6개 (달성율/계획/실적/불량율/재검사율/수리) |
| `src/components/mxvc/PostProcessFpyChart.tsx` | 검사공정 직행율 통합 LineChart |
| `src/components/mxvc/PostProcessMagazineTable.tsx` | 매거진 대기재공 테이블 |
| `src/components/mxvc/PostProcessDashboard.tsx` | 필터바 + 레이아웃 오케스트레이터 |
| `src/app/(mxvc)/mxvc/post-process/page.tsx` | 페이지 진입점 |

---

## Task 1: 타입 정의

**Files:**
- Create: `src/types/mxvc/post-process.ts`

- [ ] **Step 1: 파일 생성**

```typescript
/**
 * @file src/types/mxvc/post-process.ts
 * @description 멕시코전장 후공정생산현황 타입 정의
 * 초보자 가이드: API 응답 구조와 컴포넌트 props 타입을 정의한다.
 */

/** KPI 요약 지표 */
export interface PostProcessKpi {
  planQty: number;          // 생산 계획 수량 (lot_qty 합계)
  targetQty: number;        // 목표 수량 (target_plan 합계)
  actualQty: number;        // 생산 실적 (actual_qty 합계)
  achievementRate: number;  // 달성율 % (actualQty / targetQty × 100)
  defectRate: number;       // 불량율 % (불량바코드 / 전체바코드 × 100)
  retestRate: number;       // 재검사율 % (2회이상 바코드 / 전체바코드 × 100)
  repairWaiting: number;    // 수리대기 건수 (QC_INSPECT_HANDLING = 'W')
  repairDone: number;       // 수리완료 건수 (QC_INSPECT_HANDLING = 'U')
}

/** 시간대별 직행율 행 */
export interface PostProcessFpyRow {
  hour: string;    // '08', '09', ...
  total: number;   // 해당 시간대 전체 바코드 수
  pass: number;    // 합격 바코드 수
  yield: number;   // 직행율 % (pass/total × 100)
}

/** API 응답 */
export interface PostProcessResponse {
  kpi: PostProcessKpi;
  /** 검사공정 5개 테이블별 시간대 직행율 */
  fpyChart: Record<string, PostProcessFpyRow[]>;
  /** 매거진 대기재공 목록 */
  magazine: PostProcessMagazineRow[];
  lastUpdated: string;
}

/** 매거진 대기재공 행 */
export interface PostProcessMagazineRow {
  lineCode: string;
  workstageCode: string;
  magazineNo: string;
  inQty: number;
}

/** 필터/설정 상태 */
export interface PostProcessSettings {
  dateFrom: string;  // 'YYYY-MM-DDTHH:MM'
  dateTo: string;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/mxvc/post-process.ts
git commit -m "feat: 후공정생산현황 타입 정의 추가"
```

---

## Task 2: 화면 & 메뉴 카드 등록

**Files:**
- Modify: `src/lib/screens.ts`
- Modify: `config/cards.json`

- [ ] **Step 1: screens.ts에 화면 추가**

`src/lib/screens.ts`의 마지막 항목(`'mxvc-production-kpi'`) 뒤에 추가:

```typescript
  'mxvc-post-process': {
    id: 'mxvc-post-process',
    title: 'Post-Process Production Status (MXVC)',
    titleKo: '후공정생산현황(멕시코전장)',
    titleEs: 'Estado de Producción Post-Proceso (MXVC)',
    window: '',
    group: 'mxvc',
  },
```

- [ ] **Step 2: cards.json에 메뉴 카드 추가**

`config/cards.json`의 `"cards"` 배열 끝(마지막 `}` 앞)에 추가:

```json
,{
  "id": "menu-mxvc-post-process",
  "title": "후공정생산현황",
  "url": "/mxvc/post-process",
  "color": "#10b981",
  "icon": "svg:chart-bar",
  "layer": 8
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/screens.ts config/cards.json
git commit -m "feat: 후공정생산현황 화면 및 메뉴 카드 등록"
```

---

## Task 3: SQL 쿼리 헬퍼

**Files:**
- Create: `src/lib/queries/post-process.ts`

- [ ] **Step 1: 파일 생성**

```typescript
/**
 * @file src/lib/queries/post-process.ts
 * @description 후공정생산현황 API용 SQL 쿼리 헬퍼
 * 초보자 가이드:
 * 1. buildTimeWhere — LOG_TIMESTAMP 기반 기간 필터 생성
 * 2. sqlQcStats — IP_PRODUCT_WORK_QC 수리 건수 쿼리
 * 3. sqlTableStats — LOG 테이블 1개의 바코드 단위 불량/재검 통계
 * 4. sqlTableFpyHourly — LOG 테이블 1개의 시간대별 직행율
 * 5. sqlMagazine — IP_PRODUCT_MAGAZINE 재공 조회
 * 6. sqlProductionKpiAgg — IRPT_PRODUCT_LINE_TARGET_MONITORING 집계
 */

/** 검사공정 5개 테이블 */
export const POST_PROCESS_TABLES = [
  'LOG_ICT', 'LOG_EOL', 'LOG_COATING1', 'LOG_COATING2', 'LOG_DOWNLOAD',
] as const;
export type PostProcessTableKey = typeof POST_PROCESS_TABLES[number];

/** 테이블 표시명 */
export const POST_PROCESS_TABLE_LABELS: Record<PostProcessTableKey, string> = {
  LOG_ICT: 'ICT',
  LOG_EOL: 'EOL',
  LOG_COATING1: 'COATING 1',
  LOG_COATING2: 'COATING 2',
  LOG_DOWNLOAD: 'DOWNLOAD',
};

/** 각 테이블의 판정 컬럼 / 바코드 컬럼 */
const TABLE_COLS: Record<PostProcessTableKey, { result: string; barcode: string }> = {
  LOG_ICT:      { result: 'RESULT',       barcode: 'BARCODE' },
  LOG_EOL:      { result: 'ARRAY_RESULT', barcode: 'BARCODE' },
  LOG_COATING1: { result: 'RESULT',       barcode: 'BARCODE' },
  LOG_COATING2: { result: 'RESULT',       barcode: 'BARCODE' },
  LOG_DOWNLOAD: { result: 'RESULT',       barcode: 'BARCODE' },
};

/** PASS 판정값 목록 */
const PASS_VALUES = ["'OK'", "'PASS'", "'GOOD'", "'Good'", "'Y'", "'SKIP'", "'OverKill'"];
const PASS_IN = PASS_VALUES.join(',');

/**
 * LOG_TIMESTAMP 기반 기간 WHERE 절 생성.
 * dateFrom/dateTo 없으면 당일 08:00 ~ 현재(작업일 기준).
 */
export function buildTimeWhere(dateFrom: string, dateTo: string): {
  where: string;
  binds: Record<string, string>;
} {
  if (dateFrom && dateTo) {
    return {
      where: `LOG_TIMESTAMP >= TO_TIMESTAMP(:fromDate || ':00', 'YYYY-MM-DD HH24:MI:SS')
        AND LOG_TIMESTAMP <= TO_TIMESTAMP(:toDate || ':59', 'YYYY-MM-DD HH24:MI:SS')`,
      binds: {
        fromDate: dateFrom.replace('T', ' '),
        toDate: dateTo.replace('T', ' '),
      },
    };
  }
  const workDay = `CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE,'HH24'))>=8
    THEN TRUNC(SYSDATE)+8/24
    ELSE TRUNC(SYSDATE)-1+8/24 END`;
  return {
    where: `LOG_TIMESTAMP >= (${workDay}) AND LOG_TIMESTAMP <= SYSDATE`,
    binds: {},
  };
}

/**
 * LOG 테이블 1개 — 바코드 단위 불량/재검사 통계 쿼리.
 * 모든 테이블에 대해 동일하게 바코드 그룹핑 사용.
 * - TOTAL_BC  : 전체 고유 바코드 수
 * - FAIL_BC   : 1회라도 FAIL인 바코드 수
 * - RETEST_BC : 2회 이상 검사된 바코드 수
 */
export function sqlTableStats(tableKey: PostProcessTableKey, timeWhere: string): string {
  const { result, barcode } = TABLE_COLS[tableKey];
  return `
    SELECT
      COUNT(*) AS TOTAL_BC,
      SUM(CASE WHEN HAS_FAIL = 1 THEN 1 ELSE 0 END) AS FAIL_BC,
      SUM(CASE WHEN TEST_CNT > 1 THEN 1 ELSE 0 END)  AS RETEST_BC
    FROM (
      SELECT
        ${barcode}                                                                   AS BC,
        COUNT(*)                                                                     AS TEST_CNT,
        MAX(CASE WHEN ${result} NOT IN (${PASS_IN}) THEN 1 ELSE 0 END)              AS HAS_FAIL
      FROM ${tableKey}
      WHERE ${timeWhere}
        AND ${result} IS NOT NULL
        AND ${barcode} IS NOT NULL
      GROUP BY ${barcode}
    )
  `;
}

/**
 * LOG 테이블 1개 — 시간대별 직행율 쿼리.
 * 바코드 그룹 기준: 같은 바코드의 최초 스캔 시각으로 시간대 결정.
 */
export function sqlTableFpyHourly(tableKey: PostProcessTableKey, timeWhere: string): string {
  const { result, barcode } = TABLE_COLS[tableKey];
  return `
    SELECT
      TO_CHAR(MIN_TS, 'HH24')  AS HOUR,
      COUNT(*)                  AS TOTAL,
      SUM(PASS_FLAG)            AS PASS_CNT
    FROM (
      SELECT
        ${barcode}                                                                                AS BC,
        MIN(LOG_TIMESTAMP)                                                                        AS MIN_TS,
        CASE WHEN MAX(CASE WHEN ${result} NOT IN (${PASS_IN}) THEN 1 ELSE 0 END) = 0 THEN 1 ELSE 0 END AS PASS_FLAG
      FROM ${tableKey}
      WHERE ${timeWhere}
        AND ${result} IS NOT NULL
        AND ${barcode} IS NOT NULL
      GROUP BY ${barcode}
    )
    GROUP BY TO_CHAR(MIN_TS, 'HH24')
    ORDER BY HOUR
  `;
}

/**
 * IP_PRODUCT_WORK_QC — 수리대기/완료 건수.
 * QC_INSPECT_HANDLING: 'W' = 대기, 'U' = 완료
 */
export function sqlQcStats(dateFrom: string, dateTo: string): {
  sql: string;
  binds: Record<string, string | number>;
} {
  const hasRange = !!(dateFrom && dateTo);
  const where = hasRange
    ? `QC_DATE >= TO_DATE(:qcFrom, 'YYYY-MM-DD') AND QC_DATE <= TO_DATE(:qcTo, 'YYYY-MM-DD')`
    : `QC_DATE >= TRUNC(SYSDATE)`;
  const binds: Record<string, string | number> = hasRange
    ? { qcFrom: dateFrom.slice(0, 10), qcTo: dateTo.slice(0, 10) }
    : {};
  return {
    sql: `
      SELECT
        SUM(CASE WHEN QC_INSPECT_HANDLING = 'W' THEN 1 ELSE 0 END) AS WAITING,
        SUM(CASE WHEN QC_INSPECT_HANDLING = 'U' THEN 1 ELSE 0 END) AS DONE
      FROM IP_PRODUCT_WORK_QC
      WHERE ${where}
    `,
    binds,
  };
}

/**
 * IP_PRODUCT_MAGAZINE — 라인/공정별 현재 재공.
 */
export const sqlMagazine = `
  SELECT
    LINE_CODE        AS LINE_CODE,
    WORKSTAGE_CODE   AS WORKSTAGE_CODE,
    MAGAZINE_NO      AS MAGAZINE_NO,
    NVL(MAGAZINE_IN_QTY, 0) AS IN_QTY
  FROM IP_PRODUCT_MAGAZINE
  ORDER BY LINE_CODE, WORKSTAGE_CODE
`;

/**
 * IRPT_PRODUCT_LINE_TARGET_MONITORING — 생산 계획/목표/실적 집계.
 * @param lineClause - 라인 필터 WHERE 조각 (없으면 빈 문자열)
 */
export function sqlProductionKpiAgg(lineClause: string): string {
  return `
    SELECT
      SUM(NVL(lot_qty, 0))     AS PLAN_QTY,
      SUM(NVL(target_plan, 0)) AS TARGET_QTY,
      SUM(NVL(actual_qty, 0))  AS ACTUAL_QTY,
      CASE WHEN SUM(NVL(target_plan, 0)) > 0
           THEN ROUND(SUM(NVL(actual_qty, 0)) / SUM(NVL(target_plan, 0)) * 100, 1)
           ELSE 0 END          AS ACHIEVEMENT_RATE
    FROM IRPT_PRODUCT_LINE_TARGET_MONITORING
    WHERE organization_id = :orgId
    ${lineClause}
  `;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/queries/post-process.ts
git commit -m "feat: 후공정생산현황 SQL 헬퍼 추가"
```

---

## Task 4: API Route

**Files:**
- Create: `src/app/api/mxvc/post-process/route.ts`

- [ ] **Step 1: 파일 생성**

```typescript
/**
 * @file src/app/api/mxvc/post-process/route.ts
 * @description 멕시코전장 후공정생산현황 통합 API
 * 초보자 가이드:
 * 1. GET /api/mxvc/post-process?dateFrom=&dateTo=&lines=
 * 2. 6개 쿼리를 Promise.all로 병렬 실행
 * 3. executeQuery는 활성 프로필(멕시코전장외부)에서 실행
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { buildLineFilter } from '@/lib/queries/production-kpi';
import {
  POST_PROCESS_TABLES,
  type PostProcessTableKey,
  buildTimeWhere,
  sqlTableStats,
  sqlTableFpyHourly,
  sqlQcStats,
  sqlMagazine,
  sqlProductionKpiAgg,
} from '@/lib/queries/post-process';
import type {
  PostProcessResponse,
  PostProcessKpi,
  PostProcessFpyRow,
  PostProcessMagazineRow,
} from '@/types/mxvc/post-process';

export const dynamic = 'force-dynamic';

/** 단일 테이블 불량/재검 통계 */
async function fetchTableStats(key: PostProcessTableKey, timeWhere: string, binds: Record<string, string>) {
  try {
    const rows = await executeQuery<{ TOTAL_BC: number; FAIL_BC: number; RETEST_BC: number }>(
      sqlTableStats(key, timeWhere), binds,
    );
    const r = rows[0] ?? { TOTAL_BC: 0, FAIL_BC: 0, RETEST_BC: 0 };
    return { total: r.TOTAL_BC, fail: r.FAIL_BC, retest: r.RETEST_BC };
  } catch {
    return { total: 0, fail: 0, retest: 0 };
  }
}

/** 단일 테이블 시간대별 직행율 */
async function fetchTableFpy(key: PostProcessTableKey, timeWhere: string, binds: Record<string, string>): Promise<PostProcessFpyRow[]> {
  try {
    const rows = await executeQuery<{ HOUR: string; TOTAL: number; PASS_CNT: number }>(
      sqlTableFpyHourly(key, timeWhere), binds,
    );
    return rows.map((r) => ({
      hour: r.HOUR,
      total: r.TOTAL,
      pass: r.PASS_CNT,
      yield: r.TOTAL > 0 ? Math.round((r.PASS_CNT / r.TOTAL) * 10000) / 100 : 100,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const dateFrom = p.get('dateFrom') ?? '';
    const dateTo   = p.get('dateTo')   ?? '';
    const linesParam = p.get('lines') ?? '%';
    const orgId = Number(p.get('orgId') ?? '1');

    const lineCodes = linesParam === '%' ? [] : linesParam.split(',').map((s) => s.trim()).filter(Boolean);
    const { clause: lineClause, binds: lineBinds } = buildLineFilter(lineCodes);

    const { where: timeWhere, binds: timeBind } = buildTimeWhere(dateFrom, dateTo);

    // QC 쿼리
    const { sql: qcSql, binds: qcBinds } = sqlQcStats(dateFrom, dateTo);

    // 6개 쿼리 병렬 실행
    const [
      prodRows,
      qcRows,
      magazineRows,
      ...tableResults
    ] = await Promise.all([
      // 1. 생산계획/실적
      executeQuery<{ PLAN_QTY: number; TARGET_QTY: number; ACTUAL_QTY: number; ACHIEVEMENT_RATE: number }>(
        sqlProductionKpiAgg(lineClause), { orgId, ...lineBinds },
      ).catch(() => [{ PLAN_QTY: 0, TARGET_QTY: 0, ACTUAL_QTY: 0, ACHIEVEMENT_RATE: 0 }]),

      // 2. 수리 건수
      executeQuery<{ WAITING: number; DONE: number }>(qcSql, qcBinds)
        .catch(() => [{ WAITING: 0, DONE: 0 }]),

      // 3. 매거진 재공
      executeQuery<{ LINE_CODE: string; WORKSTAGE_CODE: string; MAGAZINE_NO: string; IN_QTY: number }>(
        sqlMagazine, {},
      ).catch(() => []),

      // 4~8. 5개 검사테이블 stats + fpy 병렬 (stats만: fpy는 별도 Promise.all)
      ...POST_PROCESS_TABLES.map((k) => fetchTableStats(k, timeWhere, timeBind)),
    ]);

    // FPY 시간대별 데이터 병렬
    const fpyResults = await Promise.all(
      POST_PROCESS_TABLES.map((k) => fetchTableFpy(k, timeWhere, timeBind)),
    );

    // 통계 합산
    const stats = tableResults as { total: number; fail: number; retest: number }[];
    const totalBc   = stats.reduce((s, r) => s + r.total, 0);
    const failBc    = stats.reduce((s, r) => s + r.fail,  0);
    const retestBc  = stats.reduce((s, r) => s + r.retest, 0);

    const prod = prodRows[0] ?? { PLAN_QTY: 0, TARGET_QTY: 0, ACTUAL_QTY: 0, ACHIEVEMENT_RATE: 0 };
    const qc   = qcRows[0]  ?? { WAITING: 0, DONE: 0 };

    const kpi: PostProcessKpi = {
      planQty:         prod.PLAN_QTY,
      targetQty:       prod.TARGET_QTY,
      actualQty:       prod.ACTUAL_QTY,
      achievementRate: prod.ACHIEVEMENT_RATE,
      defectRate:      totalBc > 0 ? Math.round((failBc   / totalBc) * 10000) / 100 : 0,
      retestRate:      totalBc > 0 ? Math.round((retestBc / totalBc) * 10000) / 100 : 0,
      repairWaiting:   qc.WAITING,
      repairDone:      qc.DONE,
    };

    const fpyChart: Record<string, PostProcessFpyRow[]> = {};
    POST_PROCESS_TABLES.forEach((k, i) => { fpyChart[k] = fpyResults[i]; });

    const magazine: PostProcessMagazineRow[] = (magazineRows as { LINE_CODE: string; WORKSTAGE_CODE: string; MAGAZINE_NO: string; IN_QTY: number }[]).map((r) => ({
      lineCode:      r.LINE_CODE,
      workstageCode: r.WORKSTAGE_CODE,
      magazineNo:    r.MAGAZINE_NO,
      inQty:         r.IN_QTY,
    }));

    const res: PostProcessResponse = { kpi, fpyChart, magazine, lastUpdated: new Date().toISOString() };
    return NextResponse.json(res);

  } catch (error) {
    console.error('[POST-PROCESS API]', error);
    return NextResponse.json({ error: '데이터 조회 실패', detail: String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 2: API 테스트**

개발 서버 실행 후:
```bash
curl "http://localhost:3000/api/mxvc/post-process" | python3 -m json.tool
```

기대 응답 구조:
```json
{
  "kpi": { "planQty": 0, "targetQty": ..., "actualQty": ..., "achievementRate": ..., "defectRate": ..., "retestRate": ..., "repairWaiting": ..., "repairDone": ... },
  "fpyChart": { "LOG_ICT": [...], "LOG_EOL": [...], ... },
  "magazine": [...],
  "lastUpdated": "..."
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/mxvc/post-process/route.ts
git commit -m "feat: 후공정생산현황 통합 API 추가"
```

---

## Task 5: KPI 카드 컴포넌트

**Files:**
- Create: `src/components/mxvc/PostProcessKpiCards.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
/**
 * @file src/components/mxvc/PostProcessKpiCards.tsx
 * @description 후공정생산현황 KPI 요약 카드 6개
 * 초보자 가이드:
 * - 달성율/계획/실적: IRPT_PRODUCT_LINE_TARGET_MONITORING 집계
 * - 불량율/재검사율: 5개 LOG 테이블 바코드 단위 집계
 * - 수리대기/완료: IP_PRODUCT_WORK_QC.QC_INSPECT_HANDLING
 */
import type { PostProcessKpi } from '@/types/mxvc/post-process';

interface Props {
  kpi: PostProcessKpi;
}

function rateCls(rate: number, inverse = false): string {
  if (inverse) {
    if (rate <= 1)  return 'text-emerald-500 dark:text-emerald-400';
    if (rate <= 3)  return 'text-yellow-500 dark:text-yellow-400';
    return 'text-red-500 dark:text-red-400';
  }
  if (rate >= 95) return 'text-emerald-500 dark:text-emerald-400';
  if (rate >= 90) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

function KpiCard({ label, value, sub, valueClass = '' }: CardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      <span className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</span>}
    </div>
  );
}

export default function PostProcessKpiCards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4 shrink-0">
      <KpiCard
        label="생산 달성율"
        value={`${kpi.achievementRate.toFixed(1)}%`}
        sub={`목표 ${kpi.targetQty.toLocaleString()} 기준`}
        valueClass={rateCls(kpi.achievementRate)}
      />
      <KpiCard
        label="생산 계획"
        value={kpi.planQty.toLocaleString()}
        sub="수량 (lot_qty)"
        valueClass="text-gray-800 dark:text-gray-100"
      />
      <KpiCard
        label="생산 실적"
        value={kpi.actualQty.toLocaleString()}
        sub={`목표 대비 ${kpi.achievementRate.toFixed(1)}%`}
        valueClass="text-blue-600 dark:text-blue-400"
      />
      <KpiCard
        label="불량율"
        value={`${kpi.defectRate.toFixed(2)}%`}
        sub="ICT/EOL/COATING1·2/DOWNLOAD"
        valueClass={rateCls(kpi.defectRate, true)}
      />
      <KpiCard
        label="재검사율"
        value={`${kpi.retestRate.toFixed(2)}%`}
        sub="동일 바코드 2회 이상"
        valueClass={rateCls(kpi.retestRate, true)}
      />
      <KpiCard
        label="수리 현황"
        value={`대기 ${kpi.repairWaiting}건`}
        sub={`완료 ${kpi.repairDone}건`}
        valueClass={kpi.repairWaiting > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'}
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/PostProcessKpiCards.tsx
git commit -m "feat: 후공정 KPI 카드 컴포넌트 추가"
```

---

## Task 6: 직행율 통합 차트 컴포넌트

**Files:**
- Create: `src/components/mxvc/PostProcessFpyChart.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
/**
 * @file src/components/mxvc/PostProcessFpyChart.tsx
 * @description 검사공정 5개 테이블 직행율 통합 LineChart
 * 초보자 가이드:
 * - API에서 받은 테이블별 시간대 데이터를 { hour, LOG_ICT, LOG_EOL, ... } 형태로 피벗
 * - recharts LineChart로 5개 라인을 하나의 차트에 표시
 */
'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PostProcessFpyRow } from '@/types/mxvc/post-process';
import { POST_PROCESS_TABLES, POST_PROCESS_TABLE_LABELS } from '@/lib/queries/post-process';

const LINE_COLORS: Record<string, string> = {
  LOG_ICT:      '#3b82f6',
  LOG_EOL:      '#10b981',
  LOG_COATING1: '#f59e0b',
  LOG_COATING2: '#ef4444',
  LOG_DOWNLOAD: '#a855f7',
};

interface Props {
  fpyChart: Record<string, PostProcessFpyRow[]>;
  height?: number;
}

/** 테이블별 시간대 배열을 { hour, LOG_ICT: 95.0, LOG_EOL: 88.0, ... } 배열로 피벗 */
function pivotData(fpyChart: Record<string, PostProcessFpyRow[]>): Record<string, number | string>[] {
  const hourSet = new Set<string>();
  Object.values(fpyChart).forEach((rows) => rows.forEach((r) => hourSet.add(r.hour)));
  const hours = Array.from(hourSet).sort();

  return hours.map((h) => {
    const row: Record<string, number | string> = { hour: `${h}시` };
    POST_PROCESS_TABLES.forEach((k) => {
      const found = (fpyChart[k] ?? []).find((r) => r.hour === h);
      row[k] = found?.yield ?? null as unknown as number;
    });
    return row;
  });
}

export default function PostProcessFpyChart({ fpyChart, height = 260 }: Props) {
  const data = pivotData(fpyChart);
  const isEmpty = data.length === 0;

  return (
    <div className="px-6 pb-4 shrink-0">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
        검사공정 직행율 (ICT / EOL / COATING 1·2 / DOWNLOAD)
      </h3>
      {isEmpty ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              formatter={(v: number) => v != null ? `${v.toFixed(1)}%` : '-'}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 6 }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={95} stroke="#4ade80" strokeDasharray="4 2" strokeWidth={1} />
            <ReferenceLine y={90} stroke="#facc15" strokeDasharray="4 2" strokeWidth={1} />
            {POST_PROCESS_TABLES.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={POST_PROCESS_TABLE_LABELS[k]}
                stroke={LINE_COLORS[k]}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/PostProcessFpyChart.tsx
git commit -m "feat: 검사공정 직행율 통합 차트 컴포넌트 추가"
```

---

## Task 7: 매거진 대기재공 테이블

**Files:**
- Create: `src/components/mxvc/PostProcessMagazineTable.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
/**
 * @file src/components/mxvc/PostProcessMagazineTable.tsx
 * @description 매거진 대기재공 현황 테이블
 * 초보자 가이드: IP_PRODUCT_MAGAZINE 현재 재공을 라인/공정별로 표시한다.
 * 데이터가 없으면 "현재 재공 없음" 메시지를 표시한다.
 */
import type { PostProcessMagazineRow } from '@/types/mxvc/post-process';

interface Props {
  magazine: PostProcessMagazineRow[];
}

const thCls = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';
const tdCls = 'px-3 py-2 text-sm text-gray-700 dark:text-gray-300';

export default function PostProcessMagazineTable({ magazine }: Props) {
  return (
    <div className="px-6 pb-6 flex-1 min-h-0 overflow-auto">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
        매거진 대기재공
      </h3>
      {magazine.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          현재 재공 없음
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className={thCls}>라인</th>
              <th className={thCls}>공정</th>
              <th className={thCls}>매거진 번호</th>
              <th className={`${thCls} text-right`}>재공 수량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {magazine.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className={tdCls}>{row.lineCode}</td>
                <td className={tdCls}>{row.workstageCode}</td>
                <td className={tdCls}>{row.magazineNo}</td>
                <td className={`${tdCls} text-right font-mono font-semibold`}>
                  {row.inQty.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                합계
              </td>
              <td className="px-3 py-2 text-right text-sm font-bold font-mono text-gray-800 dark:text-gray-100">
                {magazine.reduce((s, r) => s + r.inQty, 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/PostProcessMagazineTable.tsx
git commit -m "feat: 매거진 대기재공 테이블 컴포넌트 추가"
```

---

## Task 8: 대시보드 오케스트레이터

**Files:**
- Create: `src/components/mxvc/PostProcessDashboard.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
/**
 * @file src/components/mxvc/PostProcessDashboard.tsx
 * @description 후공정생산현황 대시보드 — 필터바 + 레이아웃 오케스트레이터
 * 초보자 가이드:
 * 1. 상단: DisplayHeader + 필터바 (기간, 오늘 버튼, 새로고침)
 * 2. 중단: KPI 카드 6개 + 직행율 통합 차트
 * 3. 하단: 매거진 대기재공 테이블
 * 4. DisplayFooter로 마지막 갱신 시각 표시
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { useServerTime } from '@/hooks/useServerTime';
import PostProcessKpiCards from './PostProcessKpiCards';
import PostProcessFpyChart from './PostProcessFpyChart';
import PostProcessMagazineTable from './PostProcessMagazineTable';
import type { PostProcessResponse, PostProcessSettings } from '@/types/mxvc/post-process';

const SCREEN_ID = 'mxvc-post-process';
const inputCls = 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs';

const EMPTY_KPI = {
  planQty: 0, targetQty: 0, actualQty: 0, achievementRate: 0,
  defectRate: 0, retestRate: 0, repairWaiting: 0, repairDone: 0,
};

export default function PostProcessDashboard() {
  const timing = useDisplayTiming();
  const serverToday = useServerTime();

  const [settings, setSettings] = useState<PostProcessSettings>({ dateFrom: '', dateTo: '' });
  const [data, setData] = useState<PostProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 서버 날짜 확인 후 기본 기간 설정 */
  useEffect(() => {
    if (!serverToday || settings.dateFrom) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setSettings({ dateFrom: `${serverToday}T08:00`, dateTo: `${serverToday}T${hh}:${mm}` });
  }, [serverToday, settings.dateFrom]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ dateFrom: settings.dateFrom, dateTo: settings.dateTo });
      const res = await fetch(`/api/mxvc/post-process?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [settings.dateFrom, settings.dateTo]);

  /* 자동 갱신 */
  useEffect(() => {
    if (!settings.dateFrom) return;
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds, settings.dateFrom]);

  const setToday = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const today = serverToday ?? now.toISOString().slice(0, 10);
    setSettings({ dateFrom: `${today}T08:00`, dateTo: `${today}T${hh}:${mm}` });
  };

  const kpi = data?.kpi ?? EMPTY_KPI;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="후공정생산현황" screenId={SCREEN_ID} />

      {/* 필터바 */}
      <div className="shrink-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap min-h-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">기간</span>
            <input
              type="datetime-local"
              value={settings.dateFrom}
              onChange={(e) => setSettings((s) => ({ ...s, dateFrom: e.target.value }))}
              className={`${inputCls} w-44`}
            />
            <span className="text-xs text-gray-500">~</span>
            <input
              type="datetime-local"
              value={settings.dateTo}
              onChange={(e) => setSettings((s) => ({ ...s, dateTo: e.target.value }))}
              className={`${inputCls} w-44`}
            />
            <button
              onClick={setToday}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              오늘
            </button>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? '조회 중...' : '새로고침'}
          </button>
          {error && (
            <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
          )}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        <PostProcessKpiCards kpi={kpi} />
        <PostProcessFpyChart fpyChart={data?.fpyChart ?? {}} />
        <PostProcessMagazineTable magazine={data?.magazine ?? []} />
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/PostProcessDashboard.tsx
git commit -m "feat: 후공정생산현황 대시보드 오케스트레이터 추가"
```

---

## Task 9: 페이지 진입점

**Files:**
- Create: `src/app/(mxvc)/mxvc/post-process/page.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
/**
 * @file src/app/(mxvc)/mxvc/post-process/page.tsx
 * @description 멕시코전장 후공정생산현황 페이지
 * 초보자 가이드: PostProcessDashboard를 렌더링하는 얇은 진입점.
 */
import PostProcessDashboard from '@/components/mxvc/PostProcessDashboard';

export default function PostProcessPage() {
  return <PostProcessDashboard />;
}
```

- [ ] **Step 2: 브라우저 동작 확인**

`npm run dev` 실행 후 `http://localhost:3000/mxvc/post-process` 접속.

체크리스트:
- [ ] 페이지가 렌더링됨 (흰/다크 배경)
- [ ] 기간 필터가 오늘 08:00 ~ 현재로 자동 설정
- [ ] KPI 카드 6개 표시됨 (숫자 0이어도 OK)
- [ ] 직행율 차트 영역 표시됨 (데이터 있으면 라인 표시)
- [ ] 매거진 테이블 또는 "현재 재공 없음" 표시
- [ ] 다크모드 전환 시 깨짐 없음
- [ ] 3D 터널 메뉴에서 "후공정생산현황" 카드가 layer 8(멕시코전장모니터링)에 표시됨

- [ ] **Step 3: 최종 커밋**

```bash
git add src/app/\(mxvc\)/mxvc/post-process/page.tsx
git commit -m "feat: 후공정생산현황 페이지 추가 — 멕시코전장 모니터링 완성"
```
