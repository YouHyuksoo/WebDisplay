# 멕시코전장 직행율(FPY) 대시보드 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 멕시코전장 13개 LOG 테이블의 시간대별 직행율을 한 페이지 대시보드에 표시한다.

**Architecture:** SVEHICLEPDB에 `executeQueryByProfile("멕시코전장내부")`로 접속하여 13개 테이블을 Promise.all로 병렬 쿼리. 프론트는 quality-dashboard 패턴(사이드바 설정 + 스크롤 차트)을 따르되, 직행율 전용으로 단순화.

**Tech Stack:** Next.js 15 App Router, TypeScript, Recharts, Tailwind CSS 4, Oracle DB (oracledb)

---

### Task 1: 타입 정의

**Files:**
- Create: `src/types/mxvc/fpy.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
/**
 * @file src/types/mxvc/fpy.ts
 * @description 멕시코전장 직행율(FPY) 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. MxvcFpyResponse: API 응답 전체 (13개 테이블별 시간대 직행율)
 * 2. MxvcFpySettings: 사이드바 설정 (레이아웃/팔레트/차트토글/설비필터)
 * 3. TABLE_CONFIG: 13개 테이블의 결과/바코드 컬럼 매핑
 */

/** 시간대별 직행율 데이터 (1시간 단위) */
export interface HourlyFpy {
  hour: string;
  total: number;
  pass: number;
  yield: number;
}

/** 테이블별 직행율 요약 + 시간대 상세 */
export interface TableFpyData {
  hourly: HourlyFpy[];
  summary: { total: number; pass: number; yield: number };
}

/** API 응답 */
export interface MxvcFpyResponse {
  tables: Record<string, TableFpyData>;
  equipments: string[];
  workDay: { start: string; end: string };
  lastUpdated: string;
}

/** 13개 대상 테이블 키 */
export type MxvcFpyTableKey =
  | "LOG_FCT"
  | "LOG_VISION_LEGACY"
  | "LOG_DOWNLOAD"
  | "LOG_LOWCURRENT"
  | "LOG_VISION_NATIVE"
  | "LOG_EOL"
  | "LOG_COATING1"
  | "LOG_COATING2"
  | "LOG_COATINGREVIEW"
  | "LOG_COATINGVISION"
  | "LOG_ICT"
  | "LOG_AOI"
  | "LOG_SPI";

/** 테이블별 DB 컬럼 매핑 설정 */
export interface TableColumnConfig {
  resultCol: string;
  barcodeCol: string;
}

/** 13개 테이블 매핑 */
export const TABLE_CONFIG: Record<MxvcFpyTableKey, TableColumnConfig> = {
  LOG_FCT:           { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_VISION_LEGACY: { resultCol: "DEVICE_RESULT",  barcodeCol: "BARCODE" },
  LOG_DOWNLOAD:      { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_LOWCURRENT:    { resultCol: "OVERALL_RESULT", barcodeCol: "BARCODE" },
  LOG_VISION_NATIVE: { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_EOL:           { resultCol: "ARRAY_RESULT",   barcodeCol: "BARCODE" },
  LOG_COATING1:      { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_COATING2:      { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_COATINGREVIEW: { resultCol: "FINAL_RESULT",   barcodeCol: "MAIN_BARCODE" },
  LOG_COATINGVISION: { resultCol: "FINAL_RESULT",   barcodeCol: "MAIN_BARCODE" },
  LOG_ICT:           { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_AOI:           { resultCol: "RESULT",         barcodeCol: "SERIAL_NO" },
  LOG_SPI:           { resultCol: "PCB_RESULT",     barcodeCol: "MASTER_BARCODE" },
};

export const TABLE_KEYS: MxvcFpyTableKey[] = Object.keys(TABLE_CONFIG) as MxvcFpyTableKey[];

/** 테이블 표시명 (LOG_ 접두사 제거 + 공백) */
export const TABLE_LABELS: Record<MxvcFpyTableKey, string> = {
  LOG_FCT: "FCT",
  LOG_VISION_LEGACY: "VISION LEGACY",
  LOG_DOWNLOAD: "DOWNLOAD",
  LOG_LOWCURRENT: "LOWCURRENT",
  LOG_VISION_NATIVE: "VISION NATIVE",
  LOG_EOL: "EOL",
  LOG_COATING1: "COATING 1",
  LOG_COATING2: "COATING 2",
  LOG_COATINGREVIEW: "COATING REVIEW",
  LOG_COATINGVISION: "COATING VISION",
  LOG_ICT: "ICT",
  LOG_AOI: "AOI",
  LOG_SPI: "SPI",
};

/** 사이드바 설정 */
export interface MxvcFpySettings {
  layout: "2x3" | "3x2" | "2x2+1";
  chartHeight: number;
  palette: "blue" | "rainbow" | "warm" | "cool";
  visibleTables: MxvcFpyTableKey[];
  selectedEquipments: string[];
}

/** 기본 설정 */
export const DEFAULT_FPY_SETTINGS: MxvcFpySettings = {
  layout: "2x3",
  chartHeight: 200,
  palette: "blue",
  visibleTables: [
    "LOG_FCT", "LOG_VISION_LEGACY", "LOG_EOL", "LOG_ICT",
    "LOG_LOWCURRENT", "LOG_SPI", "LOG_AOI",
  ],
  selectedEquipments: [],
};

/** 프리셋 정의 */
export const FPY_PRESETS: Record<string, Partial<MxvcFpySettings>> = {
  default: {
    visibleTables: [
      "LOG_FCT", "LOG_VISION_LEGACY", "LOG_EOL", "LOG_ICT",
      "LOG_LOWCURRENT", "LOG_SPI", "LOG_AOI",
    ],
  },
  all: {
    visibleTables: [...TABLE_KEYS],
  },
  smt: {
    visibleTables: ["LOG_SPI", "LOG_AOI"],
  },
  coating: {
    visibleTables: ["LOG_COATING1", "LOG_COATING2", "LOG_COATINGREVIEW", "LOG_COATINGVISION"],
  },
  inspection: {
    visibleTables: [
      "LOG_FCT", "LOG_ICT", "LOG_EOL", "LOG_LOWCURRENT",
      "LOG_DOWNLOAD", "LOG_VISION_LEGACY", "LOG_VISION_NATIVE",
    ],
  },
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/mxvc/fpy.ts
git commit -m "feat(mxvc): 직행율 대시보드 타입 정의 추가"
```

---

### Task 2: API 라우트

**Files:**
- Create: `src/app/api/mxvc/fpy/route.ts`

- [ ] **Step 1: API 라우트 생성**

```typescript
/**
 * @file src/app/api/mxvc/fpy/route.ts
 * @description 멕시코전장 직행율(FPY) API — 13개 LOG 테이블 병렬 조회
 *
 * 초보자 가이드:
 * 1. SVEHICLEPDB에 executeQueryByProfile("멕시코전장내부")로 접속
 * 2. 13개 테이블을 Promise.all로 병렬 쿼리
 * 3. 작업일 기준: 08:00 시작 (현재 < 08시이면 전일 08:00~현재)
 * 4. 직행율 = PASS 건수 / 전체 건수 x 100
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQueryByProfile } from "@/lib/db";
import {
  TABLE_CONFIG, TABLE_KEYS,
  type MxvcFpyTableKey, type HourlyFpy, type TableFpyData,
} from "@/types/mxvc/fpy";

export const dynamic = "force-dynamic";

const DB_PROFILE = "멕시코전장내부";
const PASS_VALUES = ["OK", "PASS", "GOOD", "Y"];

interface FpyRow {
  HOUR: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface EquipmentRow {
  EQUIPMENT_ID: string;
}

/** 작업일 경계 SQL (08:00 기준) */
const WORK_DAY_START_SQL = `
  CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
    THEN TRUNC(SYSDATE) + 8/24
    ELSE TRUNC(SYSDATE) - 1 + 8/24
  END`;

/** 설비 필터 WHERE절 생성 */
function buildEquipmentFilter(
  equipments: string[],
): { clause: string; params: Record<string, string> } {
  if (equipments.length === 0) return { clause: "", params: {} };
  const placeholders = equipments.map((_, i) => `:eq${i}`).join(",");
  const params: Record<string, string> = {};
  equipments.forEach((eq, i) => { params[`eq${i}`] = eq; });
  return { clause: `AND EQUIPMENT_ID IN (${placeholders})`, params };
}

/** 단일 테이블 시간대별 직행율 조회 */
async function queryTableFpy(
  tableKey: MxvcFpyTableKey,
  eqFilter: { clause: string; params: Record<string, string> },
): Promise<{ key: MxvcFpyTableKey; data: TableFpyData }> {
  const cfg = TABLE_CONFIG[tableKey];
  const passIn = PASS_VALUES.map((v) => `'${v}'`).join(",");

  const sql = `
    SELECT
      TO_CHAR(LOG_TIMESTAMP, 'HH24') AS HOUR,
      COUNT(*) AS TOTAL_CNT,
      SUM(CASE WHEN ${cfg.resultCol} IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM ${tableKey}
    WHERE LOG_TIMESTAMP >= (${WORK_DAY_START_SQL})
      AND LOG_TIMESTAMP <= SYSDATE
      AND ${cfg.resultCol} IS NOT NULL
      ${eqFilter.clause}
    GROUP BY TO_CHAR(LOG_TIMESTAMP, 'HH24')
    ORDER BY HOUR
  `;

  const rows = await executeQueryByProfile<FpyRow>(DB_PROFILE, sql, eqFilter.params);

  const hourly: HourlyFpy[] = rows.map((r) => ({
    hour: r.HOUR,
    total: r.TOTAL_CNT,
    pass: r.PASS_CNT,
    yield: r.TOTAL_CNT > 0
      ? Math.round((r.PASS_CNT / r.TOTAL_CNT) * 10000) / 100
      : 100,
  }));

  const totalAll = hourly.reduce((s, h) => s + h.total, 0);
  const passAll = hourly.reduce((s, h) => s + h.pass, 0);

  return {
    key: tableKey,
    data: {
      hourly,
      summary: {
        total: totalAll,
        pass: passAll,
        yield: totalAll > 0
          ? Math.round((passAll / totalAll) * 10000) / 100
          : 100,
      },
    },
  };
}

/** 사용 가능한 EQUIPMENT_ID 목록 조회 (전 테이블 UNION) */
async function queryEquipments(): Promise<string[]> {
  const unions = TABLE_KEYS
    .map((k) => `SELECT DISTINCT EQUIPMENT_ID FROM ${k}`)
    .join(" UNION ");
  const sql = `SELECT DISTINCT EQUIPMENT_ID FROM (${unions}) ORDER BY EQUIPMENT_ID`;
  const rows = await executeQueryByProfile<EquipmentRow>(DB_PROFILE, sql);
  return rows.map((r) => r.EQUIPMENT_ID);
}

export async function GET(request: NextRequest) {
  try {
    const eqParam = request.nextUrl.searchParams.get("equipments") ?? "";
    const equipments = eqParam ? eqParam.split(",").filter(Boolean) : [];
    const eqFilter = buildEquipmentFilter(equipments);

    const [tableResults, equipmentList, workDayRows] = await Promise.all([
      Promise.all(TABLE_KEYS.map((k) => queryTableFpy(k, eqFilter))),
      queryEquipments(),
      executeQueryByProfile<{ WD_START: string; WD_END: string }>(
        DB_PROFILE,
        `SELECT TO_CHAR(${WORK_DAY_START_SQL}, 'YYYY-MM-DD HH24:MI') AS WD_START,
                TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI') AS WD_END
         FROM DUAL`,
      ),
    ]);

    const tables: Record<string, TableFpyData> = {};
    for (const { key, data } of tableResults) {
      tables[key] = data;
    }

    const wd = workDayRows[0];

    return NextResponse.json({
      tables,
      equipments: equipmentList,
      workDay: { start: wd?.WD_START ?? "", end: wd?.WD_END ?? "" },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MXVC FPY API error:", error);
    return NextResponse.json(
      { error: "직행율 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/mxvc/fpy/route.ts
git commit -m "feat(mxvc): 직행율 API 라우트 — 13개 테이블 병렬 쿼리"
```

---

### Task 3: 데이터 fetch 훅

**Files:**
- Create: `src/hooks/mxvc/useMxvcFpy.ts`

- [ ] **Step 1: 훅 파일 생성**

```typescript
/**
 * @file src/hooks/mxvc/useMxvcFpy.ts
 * @description 멕시코전장 직행율 데이터 fetch 훅
 *
 * 초보자 가이드:
 * 1. /api/mxvc/fpy에서 13개 테이블 직행율 조회
 * 2. selectedEquipments를 쿼리 파라미터로 전달
 * 3. fetchData를 useCallback으로 안정화하여 useEffect 의존성 관리
 */
"use client";

import { useState, useCallback } from "react";
import type { MxvcFpyResponse } from "@/types/mxvc/fpy";

export function useMxvcFpy(selectedEquipments: string[]) {
  const [data, setData] = useState<MxvcFpyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eqKey = selectedEquipments.sort().join(",");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = eqKey ? `?equipments=${encodeURIComponent(eqKey)}` : "";
      const res = await fetch(`/api/mxvc/fpy${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MxvcFpyResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [eqKey]);

  return { data, loading, error, fetchData };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/mxvc/useMxvcFpy.ts
git commit -m "feat(mxvc): 직행율 데이터 fetch 훅 추가"
```

---

### Task 4: 차트 카드 컴포넌트

**Files:**
- Create: `src/components/mxvc/FpyChartCard.tsx`

- [ ] **Step 1: 차트 카드 컴포넌트 생성**

```typescript
/**
 * @file src/components/mxvc/FpyChartCard.tsx
 * @description 개별 테이블 직행율 차트 카드 — 시간대별 바 차트 + 요약
 *
 * 초보자 가이드:
 * 1. X축: 시간(08~), Y축: 직행율(0~100%)
 * 2. 90% 기준선: 빨간 점선 (ReferenceLine)
 * 3. 바 색상: 95%+→초록, 90~95%→노란, <90%→빨간
 * 4. 요약 라인: 전체 직행율% + PASS/Total
 */
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { TableFpyData, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { TABLE_LABELS } from "@/types/mxvc/fpy";

interface Props {
  tableKey: MxvcFpyTableKey;
  data: TableFpyData;
  height: number;
  palette: string[];
}

function getYieldColor(y: number): string {
  if (y < 90) return "#f87171";
  if (y < 95) return "#facc15";
  return "#4ade80";
}

function getSummaryColor(y: number): string {
  if (y < 90) return "text-red-400";
  if (y < 95) return "text-yellow-400";
  return "text-green-400";
}

export default function FpyChartCard({ tableKey, data, height }: Props) {
  const label = TABLE_LABELS[tableKey];
  const { summary, hourly } = data;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-400 font-bold uppercase">{label}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-bold font-mono ${getSummaryColor(summary.yield)}`}>
            {summary.yield.toFixed(1)}%
          </span>
          <span className="text-gray-500">
            ({summary.pass}/{summary.total})
          </span>
        </div>
      </div>

      {hourly.length === 0 ? (
        <div
          className="flex items-center justify-center text-gray-600 text-xs"
          style={{ height }}
        >
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(v: string) => `${v}시`}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}%`,
                name,
              ]}
              labelFormatter={(label: string) => `${label}시`}
            />
            <ReferenceLine
              y={90}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <Bar dataKey="yield" name="직행율">
              {hourly.map((entry, i) => (
                <Cell key={i} fill={getYieldColor(entry.yield)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/FpyChartCard.tsx
git commit -m "feat(mxvc): 직행율 차트 카드 컴포넌트 — Recharts 바 차트"
```

---

### Task 5: 사이드바 컴포넌트

**Files:**
- Create: `src/components/mxvc/FpySidebar.tsx`

- [ ] **Step 1: 사이드바 컴포넌트 생성**

```typescript
/**
 * @file src/components/mxvc/FpySidebar.tsx
 * @description 직행율 대시보드 사이드바 — 프리셋/레이아웃/팔레트/설비필터/차트토글
 *
 * 초보자 가이드:
 * 1. quality-dashboard DashboardSidebar 패턴과 동일한 구조
 * 2. 프리셋: 기본/전체/SMT/코팅/검사
 * 3. 설비필터: API에서 받아온 EQUIPMENT_ID 체크박스
 * 4. 차트토글: 13개 테이블 표시/숨김 체크박스
 */
"use client";

import { useState, useEffect } from "react";
import type { MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import {
  DEFAULT_FPY_SETTINGS, FPY_PRESETS,
  TABLE_KEYS, TABLE_LABELS,
} from "@/types/mxvc/fpy";

interface Props {
  settings: MxvcFpySettings;
  onChange: (s: MxvcFpySettings) => void;
  onRefresh: () => void;
  loading: boolean;
  equipments: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const PRESET_LABELS: Record<string, string> = {
  default: "기본",
  all: "전체",
  smt: "SMT",
  coating: "코팅",
  inspection: "검사",
};

export default function FpySidebar({
  settings, onChange, onRefresh, loading,
  equipments, collapsed, onToggleCollapse,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const set = (patch: Partial<MxvcFpySettings>) =>
    onChange({ ...settings, ...patch });

  const toggleTable = (key: MxvcFpyTableKey) => {
    const curr = settings.visibleTables;
    const next = curr.includes(key)
      ? curr.filter((k) => k !== key)
      : [...curr, key];
    set({ visibleTables: next });
  };

  const toggleEquipment = (eq: string) => {
    const curr = settings.selectedEquipments;
    const next = curr.includes(eq)
      ? curr.filter((e) => e !== eq)
      : [...curr, eq];
    set({ selectedEquipments: next });
  };

  if (!mounted) {
    return (
      <div className="w-[260px] min-w-[260px] bg-gray-900 border-r border-gray-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      relative bg-gray-900 border-r border-gray-700 flex flex-col gap-3 transition-all duration-300 ease-in-out
      ${collapsed ? "w-0 min-w-0 p-0 overflow-hidden border-none" : "w-[260px] min-w-[260px] p-4 overflow-y-auto"}
    `}>
      <button
        onClick={onToggleCollapse}
        className={`absolute top-4 right-2 z-10 p-1.5 rounded-md bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:bg-blue-600 transition-all ${collapsed ? "hidden" : "block"}`}
        title="접기"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={collapsed ? "opacity-0 invisible" : "opacity-100 visible transition-opacity duration-300 delay-100"}>
        <div>
          <h2 className="text-xs text-blue-400 uppercase tracking-wider font-bold">직행율 FPY</h2>
          <p className="text-[10px] text-gray-500 mt-1">차트 설정</p>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {/* 새로고침 */}
          <button onClick={onRefresh} disabled={loading}
            className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold disabled:opacity-50 transition-colors">
            {loading ? "조회 중..." : "새로고침"}
          </button>

          {/* 프리셋 */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">프리셋</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(PRESET_LABELS).map(([k, v]) => (
                <button key={k}
                  onClick={() => set({ ...DEFAULT_FPY_SETTINGS, ...FPY_PRESETS[k] })}
                  className="px-2 py-1 text-[10px] border border-gray-600 rounded bg-gray-900 text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* 레이아웃 */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">레이아웃</label>
            <select value={settings.layout}
              onChange={(e) => set({ layout: e.target.value as MxvcFpySettings["layout"] })}
              className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-2 py-1 text-xs">
              <option value="2x3">2열</option>
              <option value="3x2">3열</option>
              <option value="2x2+1">2열+1</option>
            </select>
          </div>

          {/* 차트 높이 */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">
              차트 높이 <span className="text-blue-400 font-mono float-right">{settings.chartHeight}px</span>
            </label>
            <input type="range" min={120} max={350} value={settings.chartHeight}
              onChange={(e) => set({ chartHeight: Number(e.target.value) })}
              className="w-full accent-blue-500" />
          </div>

          {/* 팔레트 */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">색상 팔레트</label>
            <select value={settings.palette}
              onChange={(e) => set({ palette: e.target.value as MxvcFpySettings["palette"] })}
              className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-2 py-1 text-xs">
              <option value="blue">Blue</option>
              <option value="rainbow">Rainbow</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          {/* 설비 필터 */}
          {equipments.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">
                설비 필터
                {settings.selectedEquipments.length > 0 && (
                  <span className="text-blue-400 float-right">
                    {settings.selectedEquipments.length}개 선택
                  </span>
                )}
              </label>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {equipments.map((eq) => (
                  <label key={eq} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={settings.selectedEquipments.includes(eq)}
                      onChange={() => toggleEquipment(eq)}
                      className="accent-blue-500" />
                    <span className="text-[11px] text-gray-300 font-mono">{eq}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 차트 토글 */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">표시할 차트</label>
            {TABLE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 mt-1 cursor-pointer">
                <input type="checkbox"
                  checked={settings.visibleTables.includes(key)}
                  onChange={() => toggleTable(key)}
                  className="accent-blue-500" />
                <span className="text-[11px] text-gray-300">{TABLE_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/FpySidebar.tsx
git commit -m "feat(mxvc): 직행율 사이드바 — 프리셋/레이아웃/설비필터/차트토글"
```

---

### Task 6: 대시보드 차트 영역 컴포넌트

**Files:**
- Create: `src/components/mxvc/FpyDashboard.tsx`

- [ ] **Step 1: 대시보드 컴포넌트 생성**

```typescript
/**
 * @file src/components/mxvc/FpyDashboard.tsx
 * @description 직행율 차트 영역 — 설정에 따라 선택된 테이블 차트를 그리드로 배치
 *
 * 초보자 가이드:
 * 1. settings.visibleTables에 포함된 테이블만 표시
 * 2. settings.layout에 따라 grid-cols-2 또는 grid-cols-3
 * 3. 각 차트는 FpyChartCard 컴포넌트
 */
"use client";

import type { MxvcFpyResponse, MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { PALETTES } from "@/types/ctq/quality-dashboard";
import FpyChartCard from "./FpyChartCard";

interface Props {
  data: MxvcFpyResponse;
  settings: MxvcFpySettings;
}

export default function FpyDashboard({ data, settings }: Props) {
  const colors = PALETTES[settings.palette] || PALETTES.blue;
  const gridCols = settings.layout === "3x2" ? "grid-cols-3" : "grid-cols-2";

  const visibleTables = settings.visibleTables.filter(
    (key) => data.tables[key],
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 요약 바 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="작업일"
          value={`${data.workDay.start.slice(5)} ~ ${data.workDay.end.slice(11)}`}
          color="text-blue-400"
        />
        <SummaryCard
          label="조회 테이블"
          value={`${visibleTables.length}개`}
          color="text-cyan-400"
        />
        <SummaryCard
          label="설비"
          value={data.equipments.length > 0 ? `${data.equipments.length}대` : "-"}
          color="text-purple-400"
        />
        <OverallYieldCard tables={data.tables} visibleKeys={visibleTables} />
      </div>

      {/* 차트 그리드 */}
      <div className={`grid ${gridCols} gap-3`}>
        {visibleTables.map((key, i) => {
          const isLast = settings.layout === "2x2+1"
            && i === visibleTables.length - 1
            && visibleTables.length % 2 === 1;
          return (
            <div key={key} className={isLast ? "col-span-full" : ""}>
              <FpyChartCard
                tableKey={key}
                data={data.tables[key]}
                height={settings.chartHeight}
                palette={colors}
              />
            </div>
          );
        })}
      </div>

      {visibleTables.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
          사이드바에서 표시할 차트를 선택하세요
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
      <div className={`text-lg font-extrabold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function OverallYieldCard({
  tables,
  visibleKeys,
}: {
  tables: MxvcFpyResponse["tables"];
  visibleKeys: MxvcFpyTableKey[];
}) {
  let totalAll = 0;
  let passAll = 0;
  for (const key of visibleKeys) {
    const t = tables[key];
    if (t) {
      totalAll += t.summary.total;
      passAll += t.summary.pass;
    }
  }
  const overall = totalAll > 0
    ? Math.round((passAll / totalAll) * 10000) / 100
    : 0;
  const color = overall < 90
    ? "text-red-400"
    : overall < 95
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
      <div className={`text-2xl font-extrabold font-mono ${color}`}>{overall.toFixed(1)}%</div>
      <div className="text-[10px] text-gray-500 mt-1">종합 직행율</div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/FpyDashboard.tsx
git commit -m "feat(mxvc): 직행율 대시보드 차트 영역 — 요약+그리드 배치"
```

---

### Task 7: 페이지

**Files:**
- Create: `src/app/(mxvc)/mxvc/fpy/page.tsx`

- [ ] **Step 1: 페이지 파일 생성**

```typescript
/**
 * @file src/app/(mxvc)/mxvc/fpy/page.tsx
 * @description 멕시코전장 직행율(FPY) 대시보드 메인 페이지
 *
 * 초보자 가이드:
 * 1. 왼쪽 사이드바: 차트 설정 (프리셋/레이아웃/설비필터/차트토글)
 * 2. 오른쪽: 13개 테이블 시간대별 직행율 바 차트 (스크롤)
 * 3. quality-dashboard 페이지와 동일한 레이아웃 패턴
 * 4. 작업일 08:00 기준
 */
"use client";

import { useState, useEffect } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import { usePersistedState } from "@/hooks/ctq/usePersistedState";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useMxvcFpy } from "@/hooks/mxvc/useMxvcFpy";
import FpySidebar from "@/components/mxvc/FpySidebar";
import FpyDashboard from "@/components/mxvc/FpyDashboard";
import type { MxvcFpySettings } from "@/types/mxvc/fpy";
import { DEFAULT_FPY_SETTINGS } from "@/types/mxvc/fpy";

const SCREEN_ID = "mxvc-fpy";

export default function MxvcFpyPage() {
  const timing = useDisplayTiming();

  const [settings, setSettings] = usePersistedState<MxvcFpySettings>(
    "mxvc-fpy-settings",
    DEFAULT_FPY_SETTINGS,
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data, loading, error, fetchData } = useMxvcFpy(
    settings.selectedEquipments,
  );

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 직행율" screenId={SCREEN_ID} />

      <div className="flex flex-1 min-h-0 relative">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-4 left-0 z-20 p-1.5 rounded-r-md bg-gray-800 border border-l-0 border-gray-700 text-blue-400 hover:text-white hover:bg-blue-600 transition-all shadow-lg"
            title="사이드바 열기"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        <FpySidebar
          settings={settings}
          onChange={setSettings}
          onRefresh={fetchData}
          loading={loading}
          equipments={data?.equipments ?? []}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(true)}
        />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "ml-0" : ""}`}>
          {error && !data && (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                데이터 조회 실패: {error}
              </div>
            </div>
          )}
          {loading && !data && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
              <span className="w-8 h-8 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
              데이터 조회 중...
            </div>
          )}
          {data && <FpyDashboard data={data} settings={settings} />}
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/(mxvc)/mxvc/fpy/page.tsx
git commit -m "feat(mxvc): 직행율 대시보드 페이지 — 사이드바+차트+자동갱신"
```

---

### Task 8: 메뉴 카드 추가

**Files:**
- Modify: `src/lib/menu/config.ts:164`

- [ ] **Step 1: DEFAULT_SHORTCUTS에 직행율 카드 추가**

`config.ts`의 layer 8 섹션 (164행 부근)에 기존 `mex-log` 항목 아래에 추가:

```typescript
  // 기존 줄:
  { id: 'mex-log', title: '로그조회', url: '/mxvc/log', color: '#22d3ee', icon: 'svg:error-log', layer: 8 },
  // 새로 추가:
  { id: 'mex-fpy', title: '직행율', url: '/mxvc/fpy', color: '#22c55e', icon: 'svg:target', layer: 8 },
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/menu/config.ts
git commit -m "feat(mxvc): 멕시코전장 메뉴에 직행율 카드 추가"
```

---

### Task 9: 통합 테스트

- [ ] **Step 1: 개발 서버 실행 후 페이지 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/mxvc/fpy` 접속하여 확인:
- 페이지 로딩 시 13개 테이블 데이터 조회 성공
- 차트 카드가 2열 그리드로 표시됨
- 사이드바에서 프리셋 전환 시 차트 토글 동작
- 설비 필터 체크박스 표시 및 필터링 동작
- 레이아웃/차트높이/팔레트 변경 실시간 반영
- 사이드바 접기/펼기 동작

- [ ] **Step 2: 메뉴에서 진입 확인**

메인 메뉴 → 멕시코전장모니터링 카테고리에서 "직행율" 카드 클릭하여 페이지 진입 확인.

- [ ] **Step 3: 최종 커밋**

문제 수정이 있었다면 커밋:

```bash
git add -A
git commit -m "fix(mxvc): 직행율 대시보드 통합 테스트 수정사항"
```
