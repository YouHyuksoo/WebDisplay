# 멕시코전장 인터락호출이력 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ICOM_WEB_SERVICE_LOG 테이블을 실시간 폴링하여 좌측 로그 테이블 + 우측 2x2 분석 차트 대시보드를 표시하는 `/mxvc/interlock` 페이지를 만든다.

**Architecture:** Next.js App Router 페이지 + API Route. 10초 폴링으로 당일 데이터를 조회하며, 로그 조회 1개 + 차트 집계 3개 쿼리를 Promise.all로 병렬 실행. 좌측 35% 로그 테이블, 우측 65% recharts 2x2 차트 그리드.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Oracle (oracledb via executeQuery), recharts 3.7.0

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `src/types/mxvc/interlock.ts` | 타입 정의 (InterlockLog, InterlockChartData, InterlockResponse) |
| `src/app/api/mxvc/interlock/route.ts` | API Route — 로그 + 차트 데이터 조회 |
| `src/hooks/mxvc/useInterlock.ts` | 폴링 훅 — fetch + loading/error 상태 |
| `src/components/mxvc/InterlockLogTable.tsx` | 좌측 로그 테이블 컴포넌트 |
| `src/components/mxvc/InterlockCharts.tsx` | 우측 2x2 차트 그리드 컴포넌트 |
| `src/app/(mxvc)/mxvc/interlock/page.tsx` | 페이지 — 레이아웃 + 훅 연결 |
| `config/cards.json` | 카드 등록 (layer 8) |

---

### Task 1: 타입 정의

**Files:**
- Create: `src/types/mxvc/interlock.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
/**
 * @file src/types/mxvc/interlock.ts
 * @description 멕시코전장 인터락호출이력 타입 정의
 * 초보자 가이드:
 * 1. InterlockLog: 개별 로그 행 (ICOM_WEB_SERVICE_LOG 1행)
 * 2. InterlockChartData: 4개 차트용 집계 데이터
 * 3. InterlockResponse: API 응답 전체
 */

/** 개별 로그 행 */
export interface InterlockLog {
  addr: string;
  req: string;
  callDate: string;
  lineCode: string;
  workstageCode: string;
  result: "OK" | "NG";
  returnMsg: string;
}

/** 시간별 호출 건수 */
export interface HourlyCount {
  hour: string;
  count: number;
}

/** 공정별 NG 집계 */
export interface WorkstageNg {
  workstageCode: string;
  total: number;
  ng: number;
}

/** ADDR별 호출 집계 */
export interface AddrCount {
  addr: string;
  total: number;
  ok: number;
  ng: number;
}

/** 차트 데이터 묶음 */
export interface InterlockChartData {
  hourly: HourlyCount[];
  okNgRatio: { ok: number; ng: number };
  byWorkstage: WorkstageNg[];
  byAddr: AddrCount[];
}

/** API 응답 */
export interface InterlockResponse {
  logs: InterlockLog[];
  charts: InterlockChartData;
  lastUpdated: string;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/mxvc/interlock.ts
git commit -m "feat(mxvc): 인터락호출이력 타입 정의 추가"
```

---

### Task 2: API Route

**Files:**
- Create: `src/app/api/mxvc/interlock/route.ts`

- [ ] **Step 1: API 라우트 생성**

```typescript
/**
 * @file src/app/api/mxvc/interlock/route.ts
 * @description 인터락호출이력 API — ICOM_WEB_SERVICE_LOG 당일 조회
 * 초보자 가이드:
 * 1. 로그 조회 + 차트 집계 3개를 Promise.all로 병렬 실행
 * 2. 당일 기준: TRUNC(SYSDATE) ~ TRUNC(SYSDATE) + 1 (멕시코 서버 시간)
 * 3. RETURN 컬럼 파싱: 'OK'로 시작 → OK, 그 외 → NG
 * 4. 개별 쿼리 실패 시 빈 데이터로 대체 (safeQuery 패턴)
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  InterlockLog,
  HourlyCount,
  WorkstageNg,
  AddrCount,
  InterlockChartData,
} from "@/types/mxvc/interlock";

export const dynamic = "force-dynamic";

const DAY_FILTER = `CALL_DATE >= TRUNC(SYSDATE) AND CALL_DATE < TRUNC(SYSDATE) + 1`;

interface LogRow {
  ADDR: string;
  REQ: string;
  CALL_DATE: string;
  LINE_CODE: string;
  WORKSTAGE_CODE: string;
  RESULT: string;
  RETURN_MSG: string;
}

interface HourlyRow { HOUR: string; CNT: number }
interface OkNgRow { RESULT_TYPE: string; CNT: number }
interface WsRow { WORKSTAGE_CODE: string; TOTAL: number; NG: number }
interface AddrRow { ADDR: string; TOTAL: number; OK: number; NG: number }

/** 개별 쿼리 실패 시 빈 배열 반환 */
async function safeQuery<T>(sql: string, binds = {}): Promise<T[]> {
  try {
    return await executeQuery<T>(sql, binds);
  } catch (e) {
    console.error("Interlock query error:", e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit")) || 200;

    const [logRows, hourlyRows, okNgRows, wsRows, addrRows] = await Promise.all([
      safeQuery<LogRow>(
        `SELECT ADDR,
                SUBSTR(REQ, 1, 200) AS REQ,
                TO_CHAR(CALL_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CALL_DATE,
                NVL(LINE_CODE, '-') AS LINE_CODE,
                NVL(WORKSTAGE_CODE, '-') AS WORKSTAGE_CODE,
                CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END AS RESULT,
                SUBSTR("RETURN", 1, 200) AS RETURN_MSG
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         ORDER BY CALL_DATE DESC
         FETCH FIRST :lim ROWS ONLY`,
        { lim: limit },
      ),
      safeQuery<HourlyRow>(
        `SELECT TO_CHAR(CALL_DATE, 'HH24') AS HOUR, COUNT(*) AS CNT
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         GROUP BY TO_CHAR(CALL_DATE, 'HH24')
         ORDER BY HOUR`,
      ),
      safeQuery<OkNgRow>(
        `SELECT CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END AS RESULT_TYPE,
                COUNT(*) AS CNT
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         GROUP BY CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END`,
      ),
      safeQuery<WsRow>(
        `SELECT WORKSTAGE_CODE,
                COUNT(*) AS TOTAL,
                SUM(CASE WHEN "RETURN" NOT LIKE 'OK%' THEN 1 ELSE 0 END) AS NG
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER} AND WORKSTAGE_CODE IS NOT NULL
         GROUP BY WORKSTAGE_CODE
         ORDER BY NG DESC
         FETCH FIRST 10 ROWS ONLY`,
      ),
      safeQuery<AddrRow>(
        `SELECT ADDR,
                COUNT(*) AS TOTAL,
                SUM(CASE WHEN "RETURN" LIKE 'OK%' THEN 1 ELSE 0 END) AS OK,
                SUM(CASE WHEN "RETURN" NOT LIKE 'OK%' THEN 1 ELSE 0 END) AS NG
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         GROUP BY ADDR
         ORDER BY TOTAL DESC`,
      ),
    ]);

    const logs: InterlockLog[] = logRows.map((r) => ({
      addr: r.ADDR ?? "-",
      req: r.REQ ?? "-",
      callDate: r.CALL_DATE,
      lineCode: r.LINE_CODE,
      workstageCode: r.WORKSTAGE_CODE,
      result: r.RESULT as "OK" | "NG",
      returnMsg: r.RETURN_MSG ?? "-",
    }));

    const okRow = okNgRows.find((r) => r.RESULT_TYPE === "OK");
    const ngRow = okNgRows.find((r) => r.RESULT_TYPE === "NG");

    const charts: InterlockChartData = {
      hourly: hourlyRows.map((r) => ({ hour: r.HOUR, count: r.CNT })),
      okNgRatio: { ok: okRow?.CNT ?? 0, ng: ngRow?.CNT ?? 0 },
      byWorkstage: wsRows.map((r) => ({
        workstageCode: r.WORKSTAGE_CODE,
        total: r.TOTAL,
        ng: r.NG,
      })),
      byAddr: addrRows.map((r) => ({
        addr: r.ADDR,
        total: r.TOTAL,
        ok: r.OK,
        ng: r.NG,
      })),
    };

    return NextResponse.json({ logs, charts, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Interlock API error:", error);
    return NextResponse.json(
      { error: "인터락 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: API 동작 확인**

Run: `curl -s http://localhost:3000/api/mxvc/interlock | python -m json.tool | head -30`
Expected: logs 배열과 charts 객체가 포함된 JSON 응답

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/mxvc/interlock/route.ts
git commit -m "feat(mxvc): 인터락호출이력 API route 추가"
```

---

### Task 3: 폴링 훅

**Files:**
- Create: `src/hooks/mxvc/useInterlock.ts`

- [ ] **Step 1: 훅 생성**

```typescript
/**
 * @file src/hooks/mxvc/useInterlock.ts
 * @description 인터락호출이력 폴링 훅
 * 초보자 가이드:
 * 1. /api/mxvc/interlock에서 데이터 fetch
 * 2. fetchData를 useCallback으로 안정화
 * 3. 에러 시 이전 data 유지 (setData 호출 안 함)
 */
"use client";

import { useState, useCallback } from "react";
import type { InterlockResponse } from "@/types/mxvc/interlock";

export function useInterlock() {
  const [data, setData] = useState<InterlockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mxvc/interlock");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InterlockResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/mxvc/useInterlock.ts
git commit -m "feat(mxvc): 인터락호출이력 폴링 훅 추가"
```

---

### Task 4: 로그 테이블 컴포넌트

**Files:**
- Create: `src/components/mxvc/InterlockLogTable.tsx`

- [ ] **Step 1: 로그 테이블 생성**

```typescript
/**
 * @file src/components/mxvc/InterlockLogTable.tsx
 * @description 인터락호출이력 좌측 로그 테이블
 * 초보자 가이드:
 * 1. InterlockLog[] 배열을 테이블 행으로 렌더링
 * 2. NG 행은 빨간 배경/텍스트로 강조
 * 3. 고정 높이 + overflow-y 스크롤
 * 4. 컬럼: 시각 | ADDR | LINE | WORKSTAGE | REQ 요약 | 결과
 */
"use client";

import type { InterlockLog } from "@/types/mxvc/interlock";

interface InterlockLogTableProps {
  logs: InterlockLog[];
}

export default function InterlockLogTable({ logs }: InterlockLogTableProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
            실시간 로그
          </h3>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {logs.length}건
          </span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
            <tr className="text-left text-gray-600 dark:text-gray-300">
              <th className="px-2 py-1.5 font-semibold">시각</th>
              <th className="px-2 py-1.5 font-semibold">ADDR</th>
              <th className="px-2 py-1.5 font-semibold">LINE</th>
              <th className="px-2 py-1.5 font-semibold">공정</th>
              <th className="px-2 py-1.5 font-semibold">REQ</th>
              <th className="px-2 py-1.5 font-semibold text-center">결과</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => {
              const isNg = log.result === "NG";
              return (
                <tr
                  key={`${log.callDate}-${i}`}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    isNg
                      ? "bg-red-900/20 text-red-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <td className="px-2 py-1.5 whitespace-nowrap font-mono">
                    {log.callDate.slice(11)}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap font-medium">
                    {log.addr}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{log.lineCode}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{log.workstageCode}</td>
                  <td className="px-2 py-1.5 truncate max-w-[160px]" title={log.req}>
                    {log.req}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isNg
                          ? "bg-red-600 text-white"
                          : "bg-green-700 text-white"
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
            데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/InterlockLogTable.tsx
git commit -m "feat(mxvc): 인터락 로그 테이블 컴포넌트 추가"
```

---

### Task 5: 차트 그리드 컴포넌트

**Files:**
- Create: `src/components/mxvc/InterlockCharts.tsx`

- [ ] **Step 1: 2x2 차트 그리드 생성**

```typescript
/**
 * @file src/components/mxvc/InterlockCharts.tsx
 * @description 인터락호출이력 우측 2x2 차트 그리드
 * 초보자 가이드:
 * 1. 좌상: 시간별 호출 건수 (Bar 세로)
 * 2. 우상: OK/NG 비율 (Donut)
 * 3. 좌하: 공정별 NG TOP 10 (가로 Bar)
 * 4. 우하: ADDR별 호출 건수 (가로 Bar)
 * 5. recharts 3.x 사용, 다크 테마 색상
 */
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { InterlockChartData } from "@/types/mxvc/interlock";

interface InterlockChartsProps {
  charts: InterlockChartData;
}

const COLORS = {
  ok: "#22c55e",
  ng: "#ef4444",
  bar: "#60a5fa",
  barNg: "#f87171",
};

/** 차트 카드 래퍼 */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">{title}</h4>
      </div>
      <div className="flex-1 p-2 min-h-0">{children}</div>
    </div>
  );
}

export default function InterlockCharts({ charts }: InterlockChartsProps) {
  const pieData = [
    { name: "OK", value: charts.okNgRatio.ok },
    { name: "NG", value: charts.okNgRatio.ng },
  ];

  return (
    <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 p-3">
      {/* 좌상: 시간별 호출 건수 */}
      <ChartCard title="시간별 호출 건수">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.hourly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="count" fill={COLORS.bar} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 우상: OK/NG 비율 */}
      <ChartCard title="OK / NG 비율">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              <Cell fill={COLORS.ok} />
              <Cell fill={COLORS.ng} />
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 좌하: 공정별 NG TOP 10 */}
      <ChartCard title="공정별 NG TOP 10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.byWorkstage} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis dataKey="workstageCode" type="category" width={90} tick={{ fill: "#9ca3af", fontSize: 9 }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="ng" fill={COLORS.barNg} radius={[0, 2, 2, 0]} name="NG" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 우하: ADDR별 호출 건수 */}
      <ChartCard title="ADDR별 호출 건수">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.byAddr} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis dataKey="addr" type="category" width={80} tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="ok" stackId="a" fill={COLORS.ok} name="OK" />
            <Bar dataKey="ng" stackId="a" fill={COLORS.ng} name="NG" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/InterlockCharts.tsx
git commit -m "feat(mxvc): 인터락 2x2 차트 그리드 컴포넌트 추가"
```

---

### Task 6: 페이지 조립

**Files:**
- Create: `src/app/(mxvc)/mxvc/interlock/page.tsx`

- [ ] **Step 1: 페이지 생성**

```typescript
/**
 * @file src/app/(mxvc)/mxvc/interlock/page.tsx
 * @description 멕시코전장 인터락호출이력 대시보드 페이지
 * 초보자 가이드:
 * 1. 좌측 35%: InterlockLogTable (실시간 로그)
 * 2. 우측 65%: InterlockCharts (2x2 분석 차트)
 * 3. 10초 폴링 (useDisplayTiming)
 * 4. DisplayHeader/Footer 공통 레이아웃
 */
"use client";

import { useEffect } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useInterlock } from "@/hooks/mxvc/useInterlock";
import InterlockLogTable from "@/components/mxvc/InterlockLogTable";
import InterlockCharts from "@/components/mxvc/InterlockCharts";

const SCREEN_ID = "mxvc-interlock";

export default function InterlockPage() {
  const timing = useDisplayTiming();
  const { data, loading, error, fetchData } = useInterlock();

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="인터락호출이력" screenId={SCREEN_ID} />

      {/* 에러 배너 */}
      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-900/30 border-b border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 본문: 좌 35% + 우 65% */}
      <div className="flex flex-1 min-h-0">
        {/* 좌측 로그 테이블 */}
        <div className="w-[35%] min-w-[320px] border-r border-gray-200 dark:border-gray-700">
          {loading && !data && (
            <div className="flex items-center justify-center h-full text-gray-500 gap-2">
              <span className="w-5 h-5 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
              불러오는 중...
            </div>
          )}
          {data && <InterlockLogTable logs={data.logs} />}
        </div>

        {/* 우측 차트 그리드 */}
        <div className="flex-1 min-w-0">
          {data && <InterlockCharts charts={data.charts} />}
          {!data && !loading && (
            <div className="flex items-center justify-center h-full text-gray-500">
              데이터 없음
            </div>
          )}
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
```

- [ ] **Step 2: 브라우저에서 확인**

Run: 브라우저에서 `http://localhost:3000/mxvc/interlock` 접속
Expected: 좌측 로그 테이블 + 우측 4개 차트가 표시됨

- [ ] **Step 3: 커밋**

```bash
git add src/app/(mxvc)/mxvc/interlock/page.tsx
git commit -m "feat(mxvc): 인터락호출이력 페이지 조립"
```

---

### Task 7: 카드 등록

**Files:**
- Modify: `config/cards.json`

- [ ] **Step 1: cards.json에 인터락 카드 추가**

`cards` 배열의 마지막 항목(mex-fpy) 뒤에 추가:

```json
{
  "id": "mex-interlock",
  "title": "인터락호출이력",
  "url": "/mxvc/interlock",
  "color": "#f59e0b",
  "icon": "svg:interlock",
  "layer": 8
}
```

- [ ] **Step 2: 메인 메뉴에서 카드 확인**

Run: 브라우저에서 메인 메뉴 → 멕시코전장모니터링 카테고리에 "인터락호출이력" 카드가 표시되는지 확인

- [ ] **Step 3: 커밋**

```bash
git add config/cards.json
git commit -m "feat(mxvc): 인터락호출이력 카드 등록"
```
