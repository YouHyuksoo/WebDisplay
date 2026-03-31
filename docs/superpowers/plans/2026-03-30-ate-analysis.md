# ATE 분석 대시보드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** U1 전용 모니터링에 ATE 검사실적 분석 대시보드(6개 차트, 3x2 그리드)를 추가한다.

**Architecture:** 기간별 3개 API(daily/weekly/monthly)가 `IQ_MACHINE_ATE_U1_DATA_RAW` 테이블을 조회하고, 페이지에서 기간별 다른 폴링 주기로 6개 recharts 차트 컴포넌트를 렌더링한다. 기존 U1 FPY 패턴(페이지 구조, DB 헬퍼, i18n)을 따른다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS 4, recharts 3.7, Oracle (oracledb)

**Spec:** `docs/superpowers/specs/2026-03-30-ate-analysis-design.md`

---

## File Structure

```
신규 생성:
  src/types/u1/ate-analysis.ts              — API 응답 타입 정의
  src/app/api/u1/ate-analysis/daily/route.ts  — 당일+전일 API (차트 #1,#2,#3,#6)
  src/app/api/u1/ate-analysis/weekly/route.ts — 주간 API (차트 #4)
  src/app/api/u1/ate-analysis/monthly/route.ts— 월간 API (차트 #5)
  src/components/u1/ate/AteDailyPassRate.tsx   — #1 당일 라인별 합격률 (도넛)
  src/components/u1/ate/AteYesterdayCompare.tsx— #2 전일 vs 당일 (그룹 바)
  src/components/u1/ate/AteHourlyTrend.tsx     — #3 시간대별 추이 (면적 라인)
  src/components/u1/ate/AteWeeklyTrend.tsx     — #4 주간 일별 추이 (라인)
  src/components/u1/ate/AteMonthlyHeatmap.tsx  — #5 월간 ZONE별 히트맵
  src/components/u1/ate/AteMachineNg.tsx       — #6 머신별 NG 분포 (수평 바)
  src/app/(u1)/u1/ate-analysis/page.tsx        — 대시보드 페이지 (3x2 그리드)

수정:
  src/lib/menu/config.ts                       — 메뉴 항목 추가 (layer: 7)
  src/i18n/messages/ko.json                    — 한국어 메시지
  src/i18n/messages/en.json                    — 영어 메시지
  src/i18n/messages/vi.json                    — 베트남어 메시지
  src/i18n/messages/es.json                    — 스페인어 메시지
```

---

### Task 1: 타입 정의

**Files:**
- Create: `src/types/u1/ate-analysis.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
/**
 * @file src/types/u1/ate-analysis.ts
 * @description ATE 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_ATE_U1_DATA_RAW 테이블 기반 분석 차트용 타입
 * 2. 3개 API(daily/weekly/monthly) 응답 타입 분리
 * 3. 각 차트 컴포넌트가 필요한 데이터 구조 정의
 */

/** 라인별 합격률 통계 (당일/전일) */
export interface AteLineStat {
  lineCode: string;
  lineName: string;
  today: AtePassRate;
  yesterday: AtePassRate;
}

/** 합격률 데이터 단위 */
export interface AtePassRate {
  total: number;
  pass: number;
  ng: number;
  rate: number; // 0~100
}

/** 시간대별 검사 추이 */
export interface AteHourlyPoint {
  hour: string;       // "08", "09", ...
  total: number;
  pass: number;
  rate: number;
  shift: "D" | "N";
}

/** 머신별 NG 분포 */
export interface AteMachineNgItem {
  machineCode: string;
  ngCount: number;
  total: number;
}

/** Daily API 응답 — 차트 #1, #2, #3, #6 */
export interface AteDailyResponse {
  lineStats: AteLineStat[];
  hourlyTrend: AteHourlyPoint[];
  machineNg: AteMachineNgItem[];
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}

/** 주간 일별 추이 포인트 */
export interface AteWeeklyPoint {
  date: string;       // "2026-03-24"
  lineCode: string;
  total: number;
  pass: number;
  rate: number;
}

/** Weekly API 응답 — 차트 #4 */
export interface AteWeeklyResponse {
  dailyTrend: AteWeeklyPoint[];
  dateRange: { from: string; to: string };
}

/** 월간 히트맵 셀 데이터 */
export interface AteHeatmapCell {
  date: string;       // "2026-03-01"
  zoneCode: string;
  total: number;
  pass: number;
  rate: number;
}

/** Monthly API 응답 — 차트 #5 */
export interface AteMonthlyResponse {
  heatmapData: AteHeatmapCell[];
  zones: string[];
  dateRange: { from: string; to: string };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/u1/ate-analysis.ts
git commit -m "feat(u1-ate): add ATE analysis type definitions"
```

---

### Task 2: Daily API (당일+전일)

**Files:**
- Create: `src/app/api/u1/ate-analysis/daily/route.ts`

- [ ] **Step 1: Daily API 구현**

이 API는 4개 차트(#1 당일합격률, #2 전일비교, #3 시간대별, #6 머신별NG)가 사용한다.
기존 `src/app/api/u1/fpy/route.ts`의 `buildDateRange2Days` 패턴을 참고한다.

```typescript
/**
 * @file src/app/api/u1/ate-analysis/daily/route.ts
 * @description ATE 분석 Daily API - 전일+당일 라인별/시간대별/머신별 집계
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_ATE_U1_DATA_RAW에서 전일+당일(근무일 10:00 경계) 데이터 조회
 * 2. 3개 쿼리 병렬 실행: 라인별 합격률, 시간대별 추이, 머신별 NG
 * 3. INSPECT_DATE는 varchar 'YYYY/MM/DD HH24:MI:SS' 형식
 * 4. INSPECT_RESULT에서 'PASS','GOOD','OK','Y'가 합격
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  AteLineStat,
  AteHourlyPoint,
  AteMachineNgItem,
  AteDailyResponse,
} from "@/types/u1/ate-analysis";

export const dynamic = "force-dynamic";

const TABLE = "IQ_MACHINE_ATE_U1_DATA_RAW";
const PASS_VALUES = "('PASS','GOOD','OK','Y')";

/** 2일치 WHERE: 전일 10:00 ~ 당일+1일 10:00 (varchar INSPECT_DATE) */
function dateRange2Days(col: string): string {
  return `${col} >= TO_CHAR(TRUNC(SYSDATE-10/24)-1, 'YYYY/MM/DD') || ' 10:00:00'
      AND ${col} < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'`;
}

/** 당일만 WHERE: 당일 10:00 ~ 당일+1일 10:00 */
function dateRangeToday(col: string): string {
  return `${col} >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
      AND ${col} < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'`;
}

/** Y=전일, T=당일 CASE */
function dayCase(col: string): string {
  return `CASE WHEN ${col} < TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00' THEN 'Y' ELSE 'T' END`;
}

interface LineStatRow {
  LINE_CODE: string;
  DAY_TYPE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface HourlyRow {
  HOUR_SLOT: string;
  SHIFT_CODE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface MachineNgRow {
  MACHINE_CODE: string;
  NG_CNT: number;
  TOTAL_CNT: number;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

interface DateRangeRow {
  YD: string;
  TD: string;
}

export async function GET() {
  try {
    const col = "INSPECT_DATE";

    // --- 3개 쿼리 + 날짜범위 + 라인명 병렬 실행 ---

    const lineStatSql = `
      SELECT LINE_CODE, ${dayCase(col)} AS DAY_TYPE,
             COUNT(*) AS TOTAL_CNT,
             SUM(CASE WHEN INSPECT_RESULT IN ${PASS_VALUES} THEN 1 ELSE 0 END) AS PASS_CNT
      FROM ${TABLE}
      WHERE ${dateRange2Days(col)}
        AND LINE_CODE IS NOT NULL
      GROUP BY LINE_CODE, ${dayCase(col)}
    `;

    const hourlySql = `
      SELECT SUBSTR(${col}, 12, 2) AS HOUR_SLOT,
             NVL(SHIFT_CODE, 'D') AS SHIFT_CODE,
             COUNT(*) AS TOTAL_CNT,
             SUM(CASE WHEN INSPECT_RESULT IN ${PASS_VALUES} THEN 1 ELSE 0 END) AS PASS_CNT
      FROM ${TABLE}
      WHERE ${dateRangeToday(col)}
        AND LINE_CODE IS NOT NULL
      GROUP BY SUBSTR(${col}, 12, 2), NVL(SHIFT_CODE, 'D')
      ORDER BY HOUR_SLOT
    `;

    const machineNgSql = `
      SELECT MACHINE_CODE,
             SUM(CASE WHEN INSPECT_RESULT NOT IN ${PASS_VALUES} THEN 1 ELSE 0 END) AS NG_CNT,
             COUNT(*) AS TOTAL_CNT
      FROM ${TABLE}
      WHERE ${dateRangeToday(col)}
        AND MACHINE_CODE IS NOT NULL
      GROUP BY MACHINE_CODE
      HAVING SUM(CASE WHEN INSPECT_RESULT NOT IN ${PASS_VALUES} THEN 1 ELSE 0 END) > 0
      ORDER BY NG_CNT DESC
      FETCH FIRST 10 ROWS ONLY
    `;

    const dateRangeSql = `
      SELECT TO_CHAR(TRUNC(SYSDATE-10/24)-1, 'YYYY-MM-DD') AS YD,
             TO_CHAR(TRUNC(SYSDATE-10/24),   'YYYY-MM-DD') AS TD
      FROM DUAL
    `;

    const [lineStatRows, hourlyRows, machineNgRows, dateRows] = await Promise.all([
      executeQuery<LineStatRow>(lineStatSql, {}),
      executeQuery<HourlyRow>(hourlySql, {}),
      executeQuery<MachineNgRow>(machineNgSql, {}),
      executeQuery<DateRangeRow>(dateRangeSql, {}),
    ]);

    // --- 라인명 조회 ---
    const lineCodes = [...new Set(lineStatRows.map((r) => r.LINE_CODE))];
    let lineNameMap = new Map<string, string>();
    if (lineCodes.length > 0) {
      const ph = lineCodes.map((_, i) => `:lc${i}`).join(",");
      const params: Record<string, string> = {};
      lineCodes.forEach((c, i) => { params[`lc${i}`] = c; });
      const nameRows = await executeQuery<LineNameRow>(
        `SELECT LINE_CODE, LINE_NAME FROM IP_PRODUCT_LINE WHERE LINE_CODE IN (${ph})`,
        params,
      );
      lineNameMap = new Map(nameRows.map((r) => [r.LINE_CODE, r.LINE_NAME]));
    }

    // --- lineStats 조립 ---
    const lineMap = new Map<string, { today: { total: number; pass: number }; yesterday: { total: number; pass: number } }>();
    for (const row of lineStatRows) {
      if (!lineMap.has(row.LINE_CODE)) {
        lineMap.set(row.LINE_CODE, {
          today: { total: 0, pass: 0 },
          yesterday: { total: 0, pass: 0 },
        });
      }
      const entry = lineMap.get(row.LINE_CODE)!;
      const target = row.DAY_TYPE === "Y" ? entry.yesterday : entry.today;
      target.total = row.TOTAL_CNT;
      target.pass = row.PASS_CNT;
    }

    const lineStats: AteLineStat[] = [...lineMap.entries()]
      .map(([code, d]) => ({
        lineCode: code,
        lineName: lineNameMap.get(code) ?? code,
        today: {
          total: d.today.total,
          pass: d.today.pass,
          ng: d.today.total - d.today.pass,
          rate: d.today.total > 0 ? Math.round((d.today.pass / d.today.total) * 10000) / 100 : 0,
        },
        yesterday: {
          total: d.yesterday.total,
          pass: d.yesterday.pass,
          ng: d.yesterday.total - d.yesterday.pass,
          rate: d.yesterday.total > 0 ? Math.round((d.yesterday.pass / d.yesterday.total) * 10000) / 100 : 0,
        },
      }))
      .sort((a, b) => a.lineName.localeCompare(b.lineName));

    // --- hourlyTrend 조립 ---
    const hourlyTrend: AteHourlyPoint[] = hourlyRows.map((r) => ({
      hour: r.HOUR_SLOT,
      total: r.TOTAL_CNT,
      pass: r.PASS_CNT,
      rate: r.TOTAL_CNT > 0 ? Math.round((r.PASS_CNT / r.TOTAL_CNT) * 10000) / 100 : 0,
      shift: (r.SHIFT_CODE === "N" ? "N" : "D") as "D" | "N",
    }));

    // --- machineNg 조립 ---
    const machineNg: AteMachineNgItem[] = machineNgRows.map((r) => ({
      machineCode: r.MACHINE_CODE,
      ngCount: r.NG_CNT,
      total: r.TOTAL_CNT,
    }));

    const dr = dateRows[0];
    const response: AteDailyResponse = {
      lineStats,
      hourlyTrend,
      machineNg,
      dateRange: { yesterday: dr?.YD ?? "", today: dr?.TD ?? "" },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("ATE Analysis Daily API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/u1/ate-analysis/daily/route.ts
git commit -m "feat(u1-ate): add daily API for ATE analysis"
```

---

### Task 3: Weekly API (주간)

**Files:**
- Create: `src/app/api/u1/ate-analysis/weekly/route.ts`

- [ ] **Step 1: Weekly API 구현**

```typescript
/**
 * @file src/app/api/u1/ate-analysis/weekly/route.ts
 * @description ATE 분석 Weekly API - 최근 7일 일별 x 라인별 합격률
 *
 * 초보자 가이드:
 * 1. 차트 #4 (주간 일별 추이 라인 차트) 전용
 * 2. TRUNC(SYSDATE-10/24)로 근무일 기준 7일 범위 조회
 * 3. INSPECT_DATE varchar에서 날짜 부분만 추출하여 일별 GROUP BY
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { AteWeeklyPoint, AteWeeklyResponse } from "@/types/u1/ate-analysis";

export const dynamic = "force-dynamic";

const TABLE = "IQ_MACHINE_ATE_U1_DATA_RAW";
const PASS_VALUES = "('PASS','GOOD','OK','Y')";

interface WeeklyRow {
  DAY_DATE: string;
  LINE_CODE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface DateRangeRow {
  FROM_DATE: string;
  TO_DATE: string;
}

export async function GET() {
  try {
    const col = "INSPECT_DATE";

    const sql = `
      SELECT TO_CHAR(TO_DATE(SUBSTR(${col}, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD') AS DAY_DATE,
             LINE_CODE,
             COUNT(*) AS TOTAL_CNT,
             SUM(CASE WHEN INSPECT_RESULT IN ${PASS_VALUES} THEN 1 ELSE 0 END) AS PASS_CNT
      FROM ${TABLE}
      WHERE ${col} >= TO_CHAR(TRUNC(SYSDATE-10/24)-7, 'YYYY/MM/DD') || ' 10:00:00'
        AND ${col} < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
        AND LINE_CODE IS NOT NULL
      GROUP BY TO_CHAR(TO_DATE(SUBSTR(${col}, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD'), LINE_CODE
      ORDER BY DAY_DATE, LINE_CODE
    `;

    const dateRangeSql = `
      SELECT TO_CHAR(TRUNC(SYSDATE-10/24)-7, 'YYYY-MM-DD') AS FROM_DATE,
             TO_CHAR(TRUNC(SYSDATE-10/24),   'YYYY-MM-DD') AS TO_DATE
      FROM DUAL
    `;

    const [rows, dateRows] = await Promise.all([
      executeQuery<WeeklyRow>(sql, {}),
      executeQuery<DateRangeRow>(dateRangeSql, {}),
    ]);

    const dailyTrend: AteWeeklyPoint[] = rows.map((r) => ({
      date: r.DAY_DATE,
      lineCode: r.LINE_CODE,
      total: r.TOTAL_CNT,
      pass: r.PASS_CNT,
      rate: r.TOTAL_CNT > 0 ? Math.round((r.PASS_CNT / r.TOTAL_CNT) * 10000) / 100 : 0,
    }));

    const dr = dateRows[0];
    const response: AteWeeklyResponse = {
      dailyTrend,
      dateRange: { from: dr?.FROM_DATE ?? "", to: dr?.TO_DATE ?? "" },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("ATE Analysis Weekly API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/u1/ate-analysis/weekly/route.ts
git commit -m "feat(u1-ate): add weekly API for ATE analysis"
```

---

### Task 4: Monthly API (월간)

**Files:**
- Create: `src/app/api/u1/ate-analysis/monthly/route.ts`

- [ ] **Step 1: Monthly API 구현**

```typescript
/**
 * @file src/app/api/u1/ate-analysis/monthly/route.ts
 * @description ATE 분석 Monthly API - 최근 30일 ZONE별 x 일별 합격률 히트맵
 *
 * 초보자 가이드:
 * 1. 차트 #5 (월간 ZONE별 히트맵) 전용
 * 2. ZONE_CODE별 x 일별 합격률을 히트맵 셀 데이터로 반환
 * 3. 30일 범위이므로 폴링 주기 10분으로 설정
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { AteHeatmapCell, AteMonthlyResponse } from "@/types/u1/ate-analysis";

export const dynamic = "force-dynamic";

const TABLE = "IQ_MACHINE_ATE_U1_DATA_RAW";
const PASS_VALUES = "('PASS','GOOD','OK','Y')";

interface MonthlyRow {
  DAY_DATE: string;
  ZONE_CODE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface DateRangeRow {
  FROM_DATE: string;
  TO_DATE: string;
}

export async function GET() {
  try {
    const col = "INSPECT_DATE";

    const sql = `
      SELECT TO_CHAR(TO_DATE(SUBSTR(${col}, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD') AS DAY_DATE,
             NVL(ZONE_CODE, 'UNKNOWN') AS ZONE_CODE,
             COUNT(*) AS TOTAL_CNT,
             SUM(CASE WHEN INSPECT_RESULT IN ${PASS_VALUES} THEN 1 ELSE 0 END) AS PASS_CNT
      FROM ${TABLE}
      WHERE ${col} >= TO_CHAR(TRUNC(SYSDATE-10/24)-30, 'YYYY/MM/DD') || ' 10:00:00'
        AND ${col} < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
        AND LINE_CODE IS NOT NULL
      GROUP BY TO_CHAR(TO_DATE(SUBSTR(${col}, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD'),
               NVL(ZONE_CODE, 'UNKNOWN')
      ORDER BY DAY_DATE, ZONE_CODE
    `;

    const dateRangeSql = `
      SELECT TO_CHAR(TRUNC(SYSDATE-10/24)-30, 'YYYY-MM-DD') AS FROM_DATE,
             TO_CHAR(TRUNC(SYSDATE-10/24),    'YYYY-MM-DD') AS TO_DATE
      FROM DUAL
    `;

    const [rows, dateRows] = await Promise.all([
      executeQuery<MonthlyRow>(sql, {}),
      executeQuery<DateRangeRow>(dateRangeSql, {}),
    ]);

    const heatmapData: AteHeatmapCell[] = rows.map((r) => ({
      date: r.DAY_DATE,
      zoneCode: r.ZONE_CODE,
      total: r.TOTAL_CNT,
      pass: r.PASS_CNT,
      rate: r.TOTAL_CNT > 0 ? Math.round((r.PASS_CNT / r.TOTAL_CNT) * 10000) / 100 : 0,
    }));

    const zones = [...new Set(heatmapData.map((d) => d.zoneCode))].sort();

    const dr = dateRows[0];
    const response: AteMonthlyResponse = {
      heatmapData,
      zones,
      dateRange: { from: dr?.FROM_DATE ?? "", to: dr?.TO_DATE ?? "" },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("ATE Analysis Monthly API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/u1/ate-analysis/monthly/route.ts
git commit -m "feat(u1-ate): add monthly API for ATE analysis"
```

---

### Task 5: 차트 #1 — 당일 라인별 합격률 (도넛)

**Files:**
- Create: `src/components/u1/ate/AteDailyPassRate.tsx`

- [ ] **Step 1: 도넛 차트 컴포넌트 구현**

```tsx
/**
 * @file src/components/u1/ate/AteDailyPassRate.tsx
 * @description ATE 당일 라인별 합격률 도넛 차트
 *
 * 초보자 가이드:
 * 1. 라인별 미니 도넛 차트로 PASS/NG 비율 표시
 * 2. 도넛 중앙에 합격률(%) 수치 표시
 * 3. 색상: 95%↑ 초록, 90~95% 노랑, 90%↓ 빨강
 */

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AteLineStat } from "@/types/u1/ate-analysis";

function getRateColor(rate: number): string {
  if (rate < 90) return "#ef4444";
  if (rate < 95) return "#eab308";
  return "#22c55e";
}

interface Props {
  lineStats: AteLineStat[];
}

export default function AteDailyPassRate({ lineStats }: Props) {
  if (lineStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 h-full items-center">
      {lineStats.map((line) => {
        const data = [
          { name: "PASS", value: line.today.pass },
          { name: "NG", value: line.today.ng },
        ];
        const color = getRateColor(line.today.rate);

        return (
          <div key={line.lineCode} className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={24}
                    outerRadius={36}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill={color} />
                    <Cell fill="#374151" />
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value}건`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-xs font-bold"
                  style={{ color }}
                >
                  {line.today.rate.toFixed(1)}%
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[80px]">
              {line.lineName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/u1/ate/AteDailyPassRate.tsx
git commit -m "feat(u1-ate): add daily pass rate donut chart (#1)"
```

---

### Task 6: 차트 #2 — 전일 vs 당일 비교 (그룹 바)

**Files:**
- Create: `src/components/u1/ate/AteYesterdayCompare.tsx`

- [ ] **Step 1: 그룹 바 차트 구현**

```tsx
/**
 * @file src/components/u1/ate/AteYesterdayCompare.tsx
 * @description ATE 전일 vs 당일 합격률 비교 그룹 바 차트
 *
 * 초보자 가이드:
 * 1. X축: LINE_CODE, Y축: 합격률(%)
 * 2. 전일=회색 바, 당일=파란색 바
 * 3. 바 위에 증감 화살표(▲▼) + 차이값 표시
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import type { AteLineStat } from "@/types/u1/ate-analysis";

interface Props {
  lineStats: AteLineStat[];
}

export default function AteYesterdayCompare({ lineStats }: Props) {
  if (lineStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  const chartData = lineStats.map((line) => ({
    name: line.lineName.length > 6 ? line.lineName.slice(0, 6) + ".." : line.lineName,
    yesterday: line.yesterday.rate,
    today: line.today.rate,
    diff: line.today.rate - line.yesterday.rate,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis domain={[80, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          itemStyle={{ color: "#e5e7eb" }}
          formatter={(value: number) => [`${value.toFixed(1)}%`]}
        />
        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "90%", fill: "#ef4444", fontSize: 10 }} />
        <Bar dataKey="yesterday" name="전일" fill="#6b7280" radius={[2, 2, 0, 0]} />
        <Bar dataKey="today" name="당일" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.today < 90 ? "#ef4444" : entry.today < 95 ? "#eab308" : "#3b82f6"} />
          ))}
          <LabelList
            dataKey="diff"
            position="top"
            formatter={(v: number) => `${v >= 0 ? "▲" : "▼"}${Math.abs(v).toFixed(1)}`}
            style={{ fill: "#9ca3af", fontSize: 9 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인 후 커밋**

```bash
git add src/components/u1/ate/AteYesterdayCompare.tsx
git commit -m "feat(u1-ate): add yesterday vs today comparison bar chart (#2)"
```

---

### Task 7: 차트 #3 — 시간대별 검사 추이 (면적 라인)

**Files:**
- Create: `src/components/u1/ate/AteHourlyTrend.tsx`

- [ ] **Step 1: 시간대별 면적 라인 차트 구현**

```tsx
/**
 * @file src/components/u1/ate/AteHourlyTrend.tsx
 * @description ATE 시간대별 검사 추이 — 면적 차트(검사수량) + 점선 라인(합격률)
 *
 * 초보자 가이드:
 * 1. X축: 시간대(HH), Y축 좌: 검사수량, Y축 우: 합격률(%)
 * 2. 면적으로 검사 볼륨, 점선으로 품질 추이 동시 표현
 * 3. SHIFT 경계(D/N)를 수직 참조선으로 표시
 */

"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { AteHourlyPoint } from "@/types/u1/ate-analysis";

interface Props {
  hourlyTrend: AteHourlyPoint[];
}

export default function AteHourlyTrend({ hourlyTrend }: Props) {
  if (hourlyTrend.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  /* SHIFT 경계 시간 찾기: D→N 전환점 */
  const shiftBoundary = hourlyTrend.find((p, i) =>
    i > 0 && hourlyTrend[i - 1].shift === "D" && p.shift === "N"
  )?.hour;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={hourlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[80, 100]}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value: number, name: string) => [
            name === "rate" ? `${value.toFixed(1)}%` : `${value}건`,
            name === "rate" ? "합격률" : "검사수",
          ]}
          labelFormatter={(label: string) => `${label}시`}
        />
        {shiftBoundary && (
          <ReferenceLine
            x={shiftBoundary}
            yAxisId="left"
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: "N교대", fill: "#f59e0b", fontSize: 10, position: "top" }}
          />
        )}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="total"
          fill="#3b82f6"
          fillOpacity={0.2}
          stroke="#3b82f6"
          name="total"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="rate"
          stroke="#22c55e"
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={{ r: 3, fill: "#22c55e" }}
          name="rate"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인 후 커밋**

```bash
git add src/components/u1/ate/AteHourlyTrend.tsx
git commit -m "feat(u1-ate): add hourly trend area chart (#3)"
```

---

### Task 8: 차트 #4 — 주간 일별 합격률 추이 (멀티라인)

**Files:**
- Create: `src/components/u1/ate/AteWeeklyTrend.tsx`

- [ ] **Step 1: 주간 멀티라인 차트 구현**

```tsx
/**
 * @file src/components/u1/ate/AteWeeklyTrend.tsx
 * @description ATE 주간 일별 합격률 추이 — LINE별 색상 구분 멀티라인 차트
 *
 * 초보자 가이드:
 * 1. 최근 7일간 일별 합격률을 라인별로 표시
 * 2. LINE마다 다른 색상, 90% 기준선(빨간 점선) 표시
 * 3. AteWeeklyPoint[]를 날짜 x 라인 pivot으로 변환
 */

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { AteWeeklyPoint } from "@/types/u1/ate-analysis";

const LINE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

interface Props {
  dailyTrend: AteWeeklyPoint[];
}

export default function AteWeeklyTrend({ dailyTrend }: Props) {
  if (dailyTrend.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  /* pivot: { date, LINE_A: rate, LINE_B: rate, ... } */
  const lines = [...new Set(dailyTrend.map((d) => d.lineCode))].sort();
  const dateMap = new Map<string, Record<string, number>>();
  for (const p of dailyTrend) {
    if (!dateMap.has(p.date)) dateMap.set(p.date, {});
    dateMap.get(p.date)![p.lineCode] = p.rate;
  }
  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rates]) => ({ date: date.slice(5), ...rates })); // "MM-DD"

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis domain={[80, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value: number) => [`${value.toFixed(1)}%`]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "90%", fill: "#ef4444", fontSize: 10 }} />
        {lines.map((lineCode, i) => (
          <Line
            key={lineCode}
            type="monotone"
            dataKey={lineCode}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인 후 커밋**

```bash
git add src/components/u1/ate/AteWeeklyTrend.tsx
git commit -m "feat(u1-ate): add weekly trend multi-line chart (#4)"
```

---

### Task 9: 차트 #5 — 월간 ZONE별 히트맵

**Files:**
- Create: `src/components/u1/ate/AteMonthlyHeatmap.tsx`

- [ ] **Step 1: 커스텀 SVG 히트맵 구현**

recharts에 네이티브 히트맵이 없으므로 SVG 셀 그리드 + Tailwind로 구현한다.

```tsx
/**
 * @file src/components/u1/ate/AteMonthlyHeatmap.tsx
 * @description ATE 월간 ZONE별 합격률 히트맵 — 커스텀 CSS 그리드
 *
 * 초보자 가이드:
 * 1. X축: 날짜(30일), Y축: ZONE_CODE
 * 2. 셀 색상: 합격률 높을수록 초록, 낮을수록 빨강
 * 3. recharts에 네이티브 히트맵이 없어 CSS Grid + div 셀로 구현
 * 4. hover 시 툴팁으로 날짜/ZONE/합격률 표시
 */

"use client";

import { useState } from "react";
import type { AteHeatmapCell } from "@/types/u1/ate-analysis";

function getCellColor(rate: number): string {
  if (rate >= 98) return "bg-green-600";
  if (rate >= 95) return "bg-green-500/70";
  if (rate >= 90) return "bg-yellow-500/70";
  if (rate >= 85) return "bg-orange-500/70";
  return "bg-red-500/70";
}

interface Props {
  heatmapData: AteHeatmapCell[];
  zones: string[];
}

export default function AteMonthlyHeatmap({ heatmapData, zones }: Props) {
  const [tooltip, setTooltip] = useState<{ cell: AteHeatmapCell; x: number; y: number } | null>(null);

  if (heatmapData.length === 0 || zones.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  /* 날짜 목록 (정렬) */
  const dates = [...new Set(heatmapData.map((d) => d.date))].sort();

  /* 빠른 조회용 맵: "date|zone" -> cell */
  const cellMap = new Map<string, AteHeatmapCell>();
  for (const cell of heatmapData) {
    cellMap.set(`${cell.date}|${cell.zoneCode}`, cell);
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* 범례 */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1 px-1">
        <span>낮음</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/70" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/70" />
          <div className="w-3 h-3 rounded-sm bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-sm bg-green-500/70" />
          <div className="w-3 h-3 rounded-sm bg-green-600" />
        </div>
        <span>높음</span>
      </div>

      {/* 히트맵 그리드 */}
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-fit">
          {/* 헤더: 날짜 */}
          <div className="flex">
            <div className="w-16 shrink-0" />
            {dates.map((d) => (
              <div key={d} className="w-5 shrink-0 text-center">
                <span className="text-[9px] text-gray-500 dark:text-gray-600 -rotate-45 inline-block">
                  {d.slice(8)}
                </span>
              </div>
            ))}
          </div>

          {/* 행: ZONE별 */}
          {zones.map((zone) => (
            <div key={zone} className="flex items-center">
              <div className="w-16 shrink-0 text-xs text-gray-400 dark:text-gray-500 truncate pr-1">
                {zone}
              </div>
              {dates.map((date) => {
                const cell = cellMap.get(`${date}|${zone}`);
                const colorClass = cell ? getCellColor(cell.rate) : "bg-gray-800";
                return (
                  <div
                    key={date}
                    className={`w-5 h-4 shrink-0 m-px rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${colorClass}`}
                    onMouseEnter={(e) => {
                      if (cell) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ cell, x: rect.left, y: rect.top - 40 });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 툴팁 */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-gray-800 dark:bg-gray-700 border border-gray-600 text-xs text-white shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.cell.date} | {tooltip.cell.zoneCode} | {tooltip.cell.rate.toFixed(1)}% ({tooltip.cell.pass}/{tooltip.cell.total})
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인 후 커밋**

```bash
git add src/components/u1/ate/AteMonthlyHeatmap.tsx
git commit -m "feat(u1-ate): add monthly zone heatmap (#5)"
```

---

### Task 10: 차트 #6 — 머신별 NG 분포 (수평 바)

**Files:**
- Create: `src/components/u1/ate/AteMachineNg.tsx`

- [ ] **Step 1: 수평 바 차트 구현**

```tsx
/**
 * @file src/components/u1/ate/AteMachineNg.tsx
 * @description ATE 머신별 NG 분포 — 수평 바 차트 (TOP 10, NG 건수 내림차순)
 *
 * 초보자 가이드:
 * 1. Y축: MACHINE_CODE, X축: NG 건수
 * 2. NG 건수에 따라 빨강 그라데이션 색상
 * 3. 당일 데이터만 사용 (Daily API의 machineNg 필드)
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AteMachineNgItem } from "@/types/u1/ate-analysis";

/** NG 건수에 따른 빨강 그라데이션 */
function getNgColor(ngCount: number, maxNg: number): string {
  if (maxNg === 0) return "#6b7280";
  const ratio = ngCount / maxNg;
  if (ratio > 0.7) return "#ef4444";
  if (ratio > 0.4) return "#f97316";
  return "#eab308";
}

interface Props {
  machineNg: AteMachineNgItem[];
}

export default function AteMachineNg({ machineNg }: Props) {
  if (machineNg.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        NG 데이터 없음
      </div>
    );
  }

  const maxNg = Math.max(...machineNg.map((m) => m.ngCount));
  const chartData = machineNg.map((m) => ({
    name: m.machineCode,
    ng: m.ngCount,
    total: m.total,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          width={80}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value: number, _name: string, props: { payload: { total: number } }) => [
            `${value}건 / ${props.payload.total}건`,
            "NG",
          ]}
        />
        <Bar dataKey="ng" name="NG 건수" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getNgColor(entry.ng, maxNg)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인 후 커밋**

```bash
git add src/components/u1/ate/AteMachineNg.tsx
git commit -m "feat(u1-ate): add machine NG distribution horizontal bar chart (#6)"
```

---

### Task 11: 대시보드 페이지 (3x2 그리드)

**Files:**
- Create: `src/app/(u1)/u1/ate-analysis/page.tsx`

- [ ] **Step 1: 대시보드 페이지 구현**

```tsx
/**
 * @file src/app/(u1)/u1/ate-analysis/page.tsx
 * @description ATE 분석 대시보드 — 6개 차트 3x2 그리드 레이아웃
 *
 * 초보자 가이드:
 * 1. 3개 API를 기간별 다른 폴링 주기로 조회 (daily:30초, weekly:5분, monthly:10분)
 * 2. 6개 차트를 3열x2행 균등 그리드에 배치
 * 3. DisplayHeader/Footer는 기존 U1 FPY 페이지 패턴 따름
 * 4. 각 차트 카드에 제목 + 기간 뱃지 표시
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import AteDailyPassRate from "@/components/u1/ate/AteDailyPassRate";
import AteYesterdayCompare from "@/components/u1/ate/AteYesterdayCompare";
import AteHourlyTrend from "@/components/u1/ate/AteHourlyTrend";
import AteWeeklyTrend from "@/components/u1/ate/AteWeeklyTrend";
import AteMonthlyHeatmap from "@/components/u1/ate/AteMonthlyHeatmap";
import AteMachineNg from "@/components/u1/ate/AteMachineNg";
import type { AteDailyResponse, AteWeeklyResponse, AteMonthlyResponse } from "@/types/u1/ate-analysis";

const SCREEN_ID = "u1-ate";
const POLL_DAILY = 30_000;   // 30초
const POLL_WEEKLY = 300_000; // 5분
const POLL_MONTHLY = 600_000; // 10분

/** 차트 카드 래퍼 */
function ChartCard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 dark:bg-gray-900 border border-gray-700 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700/50">
        <span className="text-sm font-medium text-gray-200">{title}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{badge}</span>
      </div>
      <div className="flex-1 p-2 min-h-[200px]">{children}</div>
    </div>
  );
}

/** 스켈레톤 로딩 */
function ChartSkeleton() {
  return <div className="h-full w-full bg-gray-800/50 rounded animate-pulse" />;
}

export default function AteAnalysisPage() {
  const [daily, setDaily] = useState<AteDailyResponse | null>(null);
  const [weekly, setWeekly] = useState<AteWeeklyResponse | null>(null);
  const [monthly, setMonthly] = useState<AteMonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ate-analysis/daily");
      if (!res.ok) throw new Error(`Daily API: HTTP ${res.status}`);
      setDaily(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ate-analysis/weekly");
      if (!res.ok) throw new Error(`Weekly API: HTTP ${res.status}`);
      setWeekly(await res.json());
    } catch (e) {
      console.error("Weekly fetch error:", e);
    }
  }, []);

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ate-analysis/monthly");
      if (!res.ok) throw new Error(`Monthly API: HTTP ${res.status}`);
      setMonthly(await res.json());
    } catch (e) {
      console.error("Monthly fetch error:", e);
    }
  }, []);

  /* 초기 로딩 + 폴링 설정 */
  useEffect(() => {
    Promise.all([fetchDaily(), fetchWeekly(), fetchMonthly()]).then(() => setLoading(false));

    const dailyId = setInterval(fetchDaily, POLL_DAILY);
    const weeklyId = setInterval(fetchWeekly, POLL_WEEKLY);
    const monthlyId = setInterval(fetchMonthly, POLL_MONTHLY);

    return () => {
      clearInterval(dailyId);
      clearInterval(weeklyId);
      clearInterval(monthlyId);
    };
  }, [fetchDaily, fetchWeekly, fetchMonthly]);

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 text-white flex flex-col">
      <DisplayHeader title="ATE 분석" screenId={SCREEN_ID} />

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <main className="flex-1 max-w-[1920px] mx-auto w-full px-4 py-3">
        {loading && !daily ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ChartCard key={i} title="로딩중..." badge="-">
                <ChartSkeleton />
              </ChartCard>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Row 1 */}
            <ChartCard title="당일 라인별 합격률" badge="당일">
              {daily ? <AteDailyPassRate lineStats={daily.lineStats} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="전일 vs 당일 비교" badge="전일/당일">
              {daily ? <AteYesterdayCompare lineStats={daily.lineStats} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="시간대별 검사 추이" badge="당일">
              {daily ? <AteHourlyTrend hourlyTrend={daily.hourlyTrend} /> : <ChartSkeleton />}
            </ChartCard>

            {/* Row 2 */}
            <ChartCard title="주간 일별 합격률 추이" badge="주간">
              {weekly ? <AteWeeklyTrend dailyTrend={weekly.dailyTrend} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="월간 ZONE별 히트맵" badge="월간">
              {monthly ? <AteMonthlyHeatmap heatmapData={monthly.heatmapData} zones={monthly.zones} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="머신별 NG 분포" badge="당일">
              {daily ? <AteMachineNg machineNg={daily.machineNg} /> : <ChartSkeleton />}
            </ChartCard>
          </div>
        )}
      </main>

      <DisplayFooter loading={loading} lastUpdated={daily?.lastUpdated} />
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/(u1)/u1/ate-analysis/page.tsx
git commit -m "feat(u1-ate): add ATE analysis dashboard page with 3x2 grid"
```

---

### Task 12: 메뉴 등록 + i18n

**Files:**
- Modify: `src/lib/menu/config.ts:165` (U1 MONITORING 메뉴 항목 추가)
- Modify: `src/i18n/messages/ko.json` (한국어 메시지)
- Modify: `src/i18n/messages/en.json` (영어 메시지)
- Modify: `src/i18n/messages/vi.json` (베트남어 메시지)
- Modify: `src/i18n/messages/es.json` (스페인어 메시지)

- [ ] **Step 1: 메뉴 항목 추가**

`src/lib/menu/config.ts`에서 기존 u1-fpy 항목 아래에 추가:

```typescript
  { id: 'u1-ate', title: 'ATE 분석', url: '/u1/ate-analysis', color: '#f59e0b', icon: 'svg:chart', layer: 7 },
```

- [ ] **Step 2: i18n 메시지 추가**

`ko.json`의 ctq.pages 섹션에 추가:

```json
"ateAnalysis": {
  "title": "ATE 분석",
  "dailyPassRate": "당일 라인별 합격률",
  "yesterdayCompare": "전일 vs 당일 비교",
  "hourlyTrend": "시간대별 검사 추이",
  "weeklyTrend": "주간 일별 합격률 추이",
  "monthlyHeatmap": "월간 ZONE별 히트맵",
  "machineNg": "머신별 NG 분포",
  "noData": "데이터 없음"
}
```

`en.json`:
```json
"ateAnalysis": {
  "title": "ATE Analysis",
  "dailyPassRate": "Daily Pass Rate by Line",
  "yesterdayCompare": "Yesterday vs Today",
  "hourlyTrend": "Hourly Inspection Trend",
  "weeklyTrend": "Weekly Daily Pass Rate",
  "monthlyHeatmap": "Monthly Zone Heatmap",
  "machineNg": "Machine NG Distribution",
  "noData": "No data"
}
```

`vi.json`:
```json
"ateAnalysis": {
  "title": "Phân tích ATE",
  "dailyPassRate": "Tỷ lệ đạt theo Line hôm nay",
  "yesterdayCompare": "Hôm qua vs Hôm nay",
  "hourlyTrend": "Xu hướng kiểm tra theo giờ",
  "weeklyTrend": "Xu hướng tỷ lệ đạt tuần",
  "monthlyHeatmap": "Bản đồ nhiệt Zone tháng",
  "machineNg": "Phân bố NG theo máy",
  "noData": "Không có dữ liệu"
}
```

`es.json`:
```json
"ateAnalysis": {
  "title": "Análisis ATE",
  "dailyPassRate": "Tasa de aprobación por línea",
  "yesterdayCompare": "Ayer vs Hoy",
  "hourlyTrend": "Tendencia de inspección por hora",
  "weeklyTrend": "Tendencia semanal",
  "monthlyHeatmap": "Mapa de calor mensual por zona",
  "machineNg": "Distribución NG por máquina",
  "noData": "Sin datos"
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/menu/config.ts src/i18n/messages/ko.json src/i18n/messages/en.json src/i18n/messages/vi.json src/i18n/messages/es.json
git commit -m "feat(u1-ate): register ATE analysis menu + i18n messages"
```

---

### Task 13: 통합 확인

- [ ] **Step 1: 전체 빌드**

Run: `npm run build 2>&1 | tail -20`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 2: 개발 서버에서 페이지 접근 확인**

Run: `npm run dev` 후 `http://localhost:3000/u1/ate-analysis` 접근
Expected: 6개 차트 카드가 3x2 그리드로 표시됨

- [ ] **Step 3: 메뉴에서 ATE 분석 항목 확인**

U1 MONITORING 카테고리에 "ATE 분석" 카드가 표시되는지 확인

- [ ] **Step 4: 최종 커밋 (필요시)**

빌드 수정사항이 있으면 커밋
