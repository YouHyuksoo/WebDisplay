# Interlock 카드형 UI 리뉴얼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설비호출이력(interlock) 페이지를 테이블+차트 → 공정 기준 카드형 UI로 전면 리뉴얼

**Architecture:** 공정(WORKSTAGE_CODE) 기준으로 그룹핑된 정보 카드 그리드. 각 카드 헤더에 LINE+ADDR, 본문에 결과/REQ/RETURN 메시지, 하단에 CALL_DATE 표시. 10건씩 서버 페이징 + 페이지네이션.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Oracle DB

---

## 파일 구조

| 작업 | 파일 | 역할 |
|------|------|------|
| 수정 | `src/types/mxvc/interlock.ts` | 카드용 타입 정리 (차트 타입 제거) |
| 수정 | `src/app/api/mxvc/interlock/route.ts` | pageSize 10, 차트 쿼리 제거, 간결화 |
| 수정 | `src/hooks/mxvc/useInterlock.ts` | pageSize 기본값 10으로 변경 |
| 생성 | `src/components/mxvc/InterlockCard.tsx` | 개별 카드 컴포넌트 |
| 생성 | `src/components/mxvc/InterlockCardGrid.tsx` | 공정별 그룹핑 + 카드 그리드 |
| 수정 | `src/app/(mxvc)/mxvc/interlock/page.tsx` | 카드형 레이아웃으로 전면 교체 |
| 삭제 | `src/components/mxvc/InterlockLogTable.tsx` | 더 이상 사용 안 함 |
| 삭제 | `src/components/mxvc/InterlockCharts.tsx` | 더 이상 사용 안 함 |

---

### Task 1: 타입 정의 업데이트

**Files:**
- Modify: `src/types/mxvc/interlock.ts`

- [ ] **Step 1: 타입 파일 교체**

차트 관련 타입(HourlyCount, WorkstageNg, AddrCount, InterlockChartData) 제거, 카드 표시에 필요한 필드만 유지:

```typescript
/**
 * @file src/types/mxvc/interlock.ts
 * @description 멕시코전장 인터락호출이력 타입 정의 (카드형 UI)
 * 초보자 가이드:
 * 1. InterlockLog: 개별 로그 = 카드 1장 (ICOM_WEB_SERVICE_LOG 1행)
 * 2. PaginationInfo: 서버 페이징 메타
 * 3. InterlockResponse: API 응답 전체
 */

/** 개별 로그 행 = 카드 1장 */
export interface InterlockLog {
  addr: string;
  req: string;
  callDate: string;
  lineCode: string;
  workstageCode: string;
  result: "OK" | "NG";
  returnMsg: string;
}

/** 페이지네이션 정보 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** API 응답 */
export interface InterlockResponse {
  logs: InterlockLog[];
  pagination: PaginationInfo;
  lastUpdated: string;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: InterlockChartData import 에러 (아직 차트 컴포넌트가 참조 중이므로 정상)

---

### Task 2: API 간결화 (차트 쿼리 제거, pageSize=10)

**Files:**
- Modify: `src/app/api/mxvc/interlock/route.ts`

- [ ] **Step 1: API route 교체**

6개 병렬 쿼리 → 로그 조회 + 카운트 2개만 남기고, 기본 pageSize를 10으로:

```typescript
/**
 * @file src/app/api/mxvc/interlock/route.ts
 * @description 인터락호출이력 API — ICOM_WEB_SERVICE_LOG 당일 조회 (카드형)
 * 초보자 가이드:
 * 1. 로그 조회 + 총 건수 카운트 2개 쿼리만 실행
 * 2. 당일 기준: TRUNC(SYSDATE) ~ TRUNC(SYSDATE) + 1
 * 3. RETURN 컬럼 파싱: 'OK'로 시작 → OK, 그 외 → NG
 * 4. 기본 pageSize = 10 (카드형 UI)
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { InterlockLog } from "@/types/mxvc/interlock";

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

interface TotalRow { CNT: number }

export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 10));
    const offset = (page - 1) * pageSize;

    const [logRows, totalRows] = await Promise.all([
      executeQuery<LogRow>(
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
         OFFSET :offs ROWS FETCH NEXT :ps ROWS ONLY`,
        { offs: offset, ps: pageSize },
      ),
      executeQuery<TotalRow>(
        `SELECT COUNT(*) AS CNT FROM ICOM_WEB_SERVICE_LOG WHERE ${DAY_FILTER}`,
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

    const totalCount = totalRows[0]?.CNT ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      logs,
      pagination: { page, pageSize, totalCount, totalPages },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Interlock API error:", error);
    return NextResponse.json(
      { error: "인터락 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
```

---

### Task 3: Hook 수정 (pageSize 기본값 10)

**Files:**
- Modify: `src/hooks/mxvc/useInterlock.ts`

- [ ] **Step 1: pageSize 기본값 변경 + InterlockResponse 타입 유지**

```typescript
/**
 * @file src/hooks/mxvc/useInterlock.ts
 * @description 인터락호출이력 폴링 훅 — 서버 페이징 지원 (카드형 10건)
 * 초보자 가이드:
 * 1. /api/mxvc/interlock?page=N&pageSize=10 에서 데이터 fetch
 * 2. fetchData를 useCallback으로 안정화
 * 3. 에러 시 이전 data 유지
 */
"use client";

import { useState, useCallback } from "react";
import type { InterlockResponse } from "@/types/mxvc/interlock";

export function useInterlock(page: number = 1, pageSize: number = 10) {
  const [data, setData] = useState<InterlockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mxvc/interlock?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InterlockResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  return { data, loading, error, fetchData };
}
```

---

### Task 4: InterlockCard 컴포넌트 생성

**Files:**
- Create: `src/components/mxvc/InterlockCard.tsx`

- [ ] **Step 1: 카드 컴포넌트 작성**

카드 구조:
- **헤더**: 공정(WORKSTAGE_CODE) 뱃지 + LINE + ADDR
- **본문**: REQ 요약 + RETURN 메시지 + OK/NG 결과 뱃지
- **하단**: CALL_DATE 표시

```tsx
/**
 * @file src/components/mxvc/InterlockCard.tsx
 * @description 인터락 호출 정보 카드 — 1건 = 1카드
 * 초보자 가이드:
 * 1. 헤더: 공정(뱃지) + LINE + ADDR
 * 2. 본문: REQ 요약, RETURN 메시지, OK/NG 결과
 * 3. 하단: 호출일시 (CALL_DATE)
 * 4. NG는 빨간 테두리/뱃지로 강조
 */
"use client";

import type { InterlockLog } from "@/types/mxvc/interlock";

interface InterlockCardProps {
  log: InterlockLog;
}

export default function InterlockCard({ log }: InterlockCardProps) {
  const isNg = log.result === "NG";

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden transition-colors ${
        isNg
          ? "border-red-500/60 bg-red-950/20 dark:bg-red-950/30"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
      }`}
    >
      {/* 헤더: 공정 뱃지 + LINE + ADDR */}
      <div
        className={`flex items-center justify-between px-3 py-2 ${
          isNg
            ? "bg-red-900/30 dark:bg-red-900/40"
            : "bg-gray-50 dark:bg-gray-800/60"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* 공정 뱃지 */}
          <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
            {log.workstageCode}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {log.lineCode}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-100">
            {log.addr}
          </span>
          {/* OK/NG 뱃지 */}
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${
              isNg ? "bg-red-600 text-white" : "bg-green-600 text-white"
            }`}
          >
            {log.result}
          </span>
        </div>
      </div>

      {/* 본문: REQ + RETURN 메시지 */}
      <div className="px-3 py-2 space-y-1.5">
        <div>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            REQ
          </span>
          <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={log.req}>
            {log.req}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            RETURN
          </span>
          <p
            className={`text-xs truncate ${
              isNg ? "text-red-400" : "text-gray-600 dark:text-gray-400"
            }`}
            title={log.returnMsg}
          >
            {log.returnMsg}
          </p>
        </div>
      </div>

      {/* 하단: 호출일시 */}
      <div
        className={`px-3 py-1.5 border-t text-xs font-mono ${
          isNg
            ? "border-red-500/30 text-red-300/80"
            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
        }`}
      >
        {log.callDate}
      </div>
    </div>
  );
}
```

---

### Task 5: InterlockCardGrid 컴포넌트 생성

**Files:**
- Create: `src/components/mxvc/InterlockCardGrid.tsx`

- [ ] **Step 1: 공정별 그룹핑 카드 그리드 작성**

로그를 workstageCode 기준으로 그룹핑하고, 그룹 헤더 아래 카드 나열:

```tsx
/**
 * @file src/components/mxvc/InterlockCardGrid.tsx
 * @description 인터락 카드 그리드 — 공정(workstageCode) 기준 그룹핑
 * 초보자 가이드:
 * 1. logs를 workstageCode 기준으로 그룹핑
 * 2. 각 그룹별 섹션 헤더 + 카드 목록
 * 3. 반응형 그리드: 1~3열 자동 조절
 */
"use client";

import { useMemo } from "react";
import type { InterlockLog } from "@/types/mxvc/interlock";
import InterlockCard from "./InterlockCard";

interface InterlockCardGridProps {
  logs: InterlockLog[];
}

export default function InterlockCardGrid({ logs }: InterlockCardGridProps) {
  /** 공정별 그룹핑 (출현 순서 유지) */
  const groups = useMemo(() => {
    const map = new Map<string, InterlockLog[]>();
    for (const log of logs) {
      const key = log.workstageCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return Array.from(map.entries());
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([workstage, groupLogs]) => (
        <section key={workstage}>
          {/* 그룹 헤더 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-sm font-bold bg-blue-600 text-white">
              {workstage}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {groupLogs.length}건
            </span>
            <div className="flex-1 border-b border-gray-200 dark:border-gray-700" />
          </div>
          {/* 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {groupLogs.map((log, idx) => (
              <InterlockCard key={`${log.callDate}-${idx}`} log={log} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

---

### Task 6: 페이지 전면 교체

**Files:**
- Modify: `src/app/(mxvc)/mxvc/interlock/page.tsx`

- [ ] **Step 1: 카드형 레이아웃으로 페이지 교체**

좌/우 분할 제거, 전체 폭 카드 그리드 + 하단 페이지네이션:

```tsx
/**
 * @file src/app/(mxvc)/mxvc/interlock/page.tsx
 * @description 멕시코전장 설비호출이력 — 공정별 카드형 대시보드
 * 초보자 가이드:
 * 1. 공정(WORKSTAGE_CODE) 기준 카드 그룹핑 그리드
 * 2. 10건씩 서버 페이징 + 하단 페이지네이션
 * 3. 10초 폴링 (useDisplayTiming)
 */
"use client";

import { useState, useEffect } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useInterlock } from "@/hooks/mxvc/useInterlock";
import InterlockCardGrid from "@/components/mxvc/InterlockCardGrid";

const SCREEN_ID = "mxvc-interlock";
const PAGE_SIZE = 10;

export default function InterlockPage() {
  const timing = useDisplayTiming();
  const [page, setPage] = useState(1);
  const { data, loading, error, fetchData } = useInterlock(page, PAGE_SIZE);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  const totalPages = data?.pagination?.totalPages ?? 1;
  const totalCount = data?.pagination?.totalCount ?? 0;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="설비호출이력" screenId={SCREEN_ID} />

      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 카드 그리드 영역 */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
        {loading && !data && (
          <div className="flex items-center justify-center h-64 text-gray-500 gap-2">
            <span className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-400 rounded-full animate-spin" />
            불러오는 중...
          </div>
        )}
        {data && <InterlockCardGrid logs={data.logs} />}
        {!data && !loading && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            데이터 없음
          </div>
        )}
      </div>

      {/* 페이지네이션 바 */}
      {data && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            전체 {totalCount}건 · {page} / {totalPages} 페이지
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              &laquo;
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              &lsaquo;
            </button>
            <span className="px-3 text-gray-700 dark:text-gray-200 font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
```

---

### Task 7: 미사용 컴포넌트 삭제

**Files:**
- Delete: `src/components/mxvc/InterlockLogTable.tsx`
- Delete: `src/components/mxvc/InterlockCharts.tsx`

- [ ] **Step 1: InterlockLogTable.tsx 삭제**

```bash
rm src/components/mxvc/InterlockLogTable.tsx
```

- [ ] **Step 2: InterlockCharts.tsx 삭제**

```bash
rm src/components/mxvc/InterlockCharts.tsx
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: interlock 페이지 카드형 UI 리뉴얼 — 공정별 그룹핑 카드 + 페이지네이션"
```
