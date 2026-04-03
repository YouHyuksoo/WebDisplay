# 멕시코전장 추적성분석 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제품 BARCODE 입력 → 모든 LOG 테이블 + 마스터 테이블 병렬 조회 → 시간순 타임라인 표시하는 추적성 분석 페이지

**Architecture:** Next.js App Router 페이지 + API Route. API에서 Oracle 메타데이터로 바코드 컬럼을 자동 감지하고, LOG_ 테이블들을 Promise.all 병렬 조회한 뒤 시간순 정렬하여 반환. 프론트는 상단 마스터 카드 + 하단 타임라인 구조.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Oracle (oracledb), executeQuery

---

## 파일 구조

| 파일 | 역할 | 작업 |
|---|---|---|
| `src/types/mxvc/traceability.ts` | 타입 정의 | 신규 생성 |
| `src/app/api/mxvc/traceability/route.ts` | API Route (병렬 조회 + 시간순 정렬) | 신규 생성 |
| `src/components/mxvc/TraceabilityMaster.tsx` | 상단 마스터 정보 카드 | 신규 생성 |
| `src/components/mxvc/TraceabilityTimeline.tsx` | 타임라인 컴포넌트 | 신규 생성 |
| `src/app/(mxvc)/mxvc/traceability/page.tsx` | 페이지 컴포넌트 | 신규 생성 |
| `config/cards.json` | 메뉴 카드 추가 | 수정 |

---

### Task 1: 타입 정의

**Files:**
- Create: `src/types/mxvc/traceability.ts`

- [ ] **Step 1: 타입 파일 생성**

```ts
/**
 * @file src/types/mxvc/traceability.ts
 * @description 멕시코전장 추적성분석 타입 정의
 * 초보자 가이드:
 * 1. TraceabilityMasterInfo: IP_PRODUCT_2D_BARCODE에서 조회한 바코드 마스터 정보
 * 2. TimelineEvent: 타임라인에 표시할 개별 이벤트 (LOG, 공정이동, 수리)
 * 3. TraceabilityResponse: API 전체 응답 구조
 */

/** 타임라인 이벤트 유형 */
export type TimelineEventType = 'log' | 'stage_move' | 'repair';

/** 타임라인 이벤트 1건 */
export interface TimelineEvent {
  /** 소스 테이블명 (e.g. LOG_SMD_PLACE, IP_PRODUCT_WORK_QC) */
  source: string;
  /** 이벤트 유형: log=설비로그, stage_move=공정이동, repair=수리이력 */
  type: TimelineEventType;
  /** ISO 8601 타임스탬프 (정렬 기준) */
  timestamp: string;
  /** 해당 row의 전체 데이터 */
  data: Record<string, unknown>;
}

/** API 응답 전체 구조 */
export interface TraceabilityResponse {
  /** IP_PRODUCT_2D_BARCODE 마스터 정보 */
  master: Record<string, unknown> | null;
  /** IP_PRODUCT_RUN_CARD 작업지시 정보 */
  runCard: Record<string, unknown> | null;
  /** IP_PRODUCT_MODEL_MASTER 모델 마스터 정보 */
  modelMaster: Record<string, unknown> | null;
  /** 시간순 정렬된 타임라인 이벤트 배열 */
  timeline: TimelineEvent[];
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/mxvc/traceability.ts
git commit -m "feat(mxvc): 추적성분석 타입 정의 추가"
```

---

### Task 2: API Route

**Files:**
- Create: `src/app/api/mxvc/traceability/route.ts`

- [ ] **Step 1: API Route 파일 생성**

```ts
/**
 * @file src/app/api/mxvc/traceability/route.ts
 * @description 추적성분석 API — 바코드로 마스터 + 모든 LOG 테이블 병렬 조회 후 시간순 반환.
 * 초보자 가이드:
 * - GET ?barcode=XXXX 로 호출
 * - 1단계: IP_PRODUCT_2D_BARCODE에서 마스터 정보 조회
 * - 2단계: RUN_NO → IP_PRODUCT_RUN_CARD, MODEL_NAME → IP_PRODUCT_MODEL_MASTER 조회
 * - 3단계: USER_TAB_COLUMNS 메타데이터로 각 LOG_ 테이블의 바코드 컬럼 감지
 * - 4단계: 바코드 컬럼이 있는 LOG_ 테이블 + WORK_QC + WORKSTAGE_IO를 Promise.all 병렬 조회
 * - 5단계: 모든 결과를 시간순 정렬하여 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import type { TimelineEvent, TraceabilityResponse } from '@/types/mxvc/traceability';

export const dynamic = 'force-dynamic';

/** 바코드를 저장할 수 있는 컬럼명 후보 */
const BARCODE_COLUMNS = ['PID', 'BARCODE', 'MASTER_BARCODE', 'SERIAL_NO', 'PRODUCT_2D_BARCODE', '2D_BARCODE'];

/** 제외할 LOG 테이블 */
const EXCLUDED_TABLES = ['LOG_ALARM', 'LOG_ERROR'];

/** 날짜/타임스탬프 컬럼 타입 */
function isDateType(dataType: string): boolean {
  return /DATE|TIMESTAMP/i.test(dataType);
}

/** BigInt, Lob, Date 등 JSON 직렬화 불가 타입을 안전하게 변환 */
function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val == null) {
      safe[key] = val;
    } else if (typeof val === 'bigint') {
      safe[key] = Number.isSafeInteger(Number(val)) ? Number(val) : String(val);
    } else if (val instanceof Date) {
      safe[key] = val.toISOString();
    } else if (Buffer.isBuffer(val)) {
      safe[key] = val.toString('base64');
    } else if (typeof val === 'object' && val.constructor?.name === 'Lob') {
      safe[key] = '[LOB]';
    } else {
      try { JSON.stringify(val); safe[key] = val; } catch { safe[key] = String(val); }
    }
  }
  return safe;
}

interface ColumnInfo {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')?.trim() ?? '';
  if (!barcode) {
    return NextResponse.json({ error: '바코드를 입력해 주세요' }, { status: 400 });
  }

  try {
    /* 1) 마스터 정보 조회 */
    const masterRows = await executeQuery<Record<string, unknown>>(
      `SELECT * FROM IP_PRODUCT_2D_BARCODE WHERE BARCODE = :barcode`,
      { barcode },
    );
    const master = masterRows.length > 0 ? sanitizeRow(masterRows[0]) : null;

    /* 2) 연관 마스터 테이블 조회 (RUN_NO, MODEL_NAME) */
    const runNo = master?.RUN_NO as string | undefined;
    const modelName = master?.MODEL_NAME as string | undefined;

    const [runCardRows, modelMasterRows] = await Promise.all([
      runNo
        ? executeQuery<Record<string, unknown>>(
            `SELECT * FROM IP_PRODUCT_RUN_CARD WHERE RUN_NO = :runNo`,
            { runNo },
          )
        : Promise.resolve([]),
      modelName
        ? executeQuery<Record<string, unknown>>(
            `SELECT * FROM IP_PRODUCT_MODEL_MASTER WHERE MODEL_NAME = :modelName`,
            { modelName },
          )
        : Promise.resolve([]),
    ]);

    const runCard = runCardRows.length > 0 ? sanitizeRow(runCardRows[0]) : null;
    const modelMaster = modelMasterRows.length > 0 ? sanitizeRow(modelMasterRows[0]) : null;

    /* 3) LOG_ 테이블 메타데이터 — 바코드 컬럼 + 날짜 컬럼 감지 */
    const barcodeColIn = BARCODE_COLUMNS.map((_, i) => `:bc${i}`).join(',');
    const barcodeBinds: Record<string, string> = {};
    BARCODE_COLUMNS.forEach((col, i) => { barcodeBinds[`bc${i}`] = col; });

    const colMeta = await executeQuery<ColumnInfo>(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
         FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME LIKE 'LOG\\_%' ESCAPE '\\'
          AND COLUMN_NAME IN (${barcodeColIn})
        ORDER BY TABLE_NAME, COLUMN_NAME`,
      barcodeBinds,
    );

    /* 테이블별 바코드 컬럼 그룹화 */
    const tableBarcodeCols = new Map<string, string[]>();
    for (const row of colMeta) {
      if (EXCLUDED_TABLES.includes(row.TABLE_NAME)) continue;
      const cols = tableBarcodeCols.get(row.TABLE_NAME) ?? [];
      cols.push(row.COLUMN_NAME);
      tableBarcodeCols.set(row.TABLE_NAME, cols);
    }

    /* 날짜 컬럼 메타 조회 (타임라인 정렬용) */
    const tableNames = Array.from(tableBarcodeCols.keys());
    let tableDateCols = new Map<string, string>();

    if (tableNames.length > 0) {
      const tblIn = tableNames.map((_, i) => `:t${i}`).join(',');
      const tblBinds: Record<string, string> = {};
      tableNames.forEach((t, i) => { tblBinds[`t${i}`] = t; });

      const dateMeta = await executeQuery<ColumnInfo>(
        `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
           FROM USER_TAB_COLUMNS
          WHERE TABLE_NAME IN (${tblIn})
            AND DATA_TYPE LIKE '%DATE%' OR DATA_TYPE LIKE '%TIMESTAMP%'
          ORDER BY TABLE_NAME, COLUMN_ID`,
        tblBinds,
      );
      for (const row of dateMeta) {
        if (!tableDateCols.has(row.TABLE_NAME) && isDateType(row.DATA_TYPE)) {
          tableDateCols.set(row.TABLE_NAME, row.COLUMN_NAME);
        }
      }
    }

    /* 4) LOG_ 테이블 + WORK_QC + WORKSTAGE_IO 병렬 조회 */
    const logQueries = Array.from(tableBarcodeCols.entries()).map(
      async ([tableName, bcCols]): Promise<TimelineEvent[]> => {
        const whereOr = bcCols.map((c) => `${c} = :barcode`).join(' OR ');
        const dateCol = tableDateCols.get(tableName);
        const orderBy = dateCol ? ` ORDER BY ${dateCol} ASC` : '';

        const rows = await executeQuery<Record<string, unknown>>(
          `SELECT * FROM ${tableName} WHERE ${whereOr}${orderBy}`,
          { barcode },
        );

        return rows.map((row) => {
          const safe = sanitizeRow(row);
          let timestamp = '';
          if (dateCol && row[dateCol]) {
            timestamp = row[dateCol] instanceof Date
              ? (row[dateCol] as Date).toISOString()
              : String(row[dateCol]);
          }
          return { source: tableName, type: 'log' as const, timestamp, data: safe };
        });
      },
    );

    const workQcQuery = executeQuery<Record<string, unknown>>(
      `SELECT * FROM IP_PRODUCT_WORK_QC
        WHERE PID = :barcode OR BARCODE = :barcode OR MASTER_BARCODE = :barcode
        ORDER BY 1`,
      { barcode },
    ).then((rows) =>
      rows.map((row) => {
        const safe = sanitizeRow(row);
        const ts = safe.REG_DATE ?? safe.CREATE_DATE ?? safe.UPDATE_DATE ?? '';
        return {
          source: 'IP_PRODUCT_WORK_QC',
          type: 'repair' as const,
          timestamp: String(ts),
          data: safe,
        };
      }),
    ).catch(() => [] as TimelineEvent[]);

    const stageIoQuery = executeQuery<Record<string, unknown>>(
      `SELECT * FROM IP_PRODUCT_WORKSTAGE_IO
        WHERE PID = :barcode OR BARCODE = :barcode OR MASTER_BARCODE = :barcode
        ORDER BY 1`,
      { barcode },
    ).then((rows) =>
      rows.map((row) => {
        const safe = sanitizeRow(row);
        const ts = safe.IO_DATE ?? safe.CREATE_DATE ?? safe.REG_DATE ?? '';
        return {
          source: 'IP_PRODUCT_WORKSTAGE_IO',
          type: 'stage_move' as const,
          timestamp: String(ts),
          data: safe,
        };
      }),
    ).catch(() => [] as TimelineEvent[]);

    const results = await Promise.all([...logQueries, workQcQuery, stageIoQuery]);
    const timeline = results
      .flat()
      .sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

    const response: TraceabilityResponse = { master, runCard, modelMaster, timeline };
    return NextResponse.json(response);
  } catch (err) {
    console.error('추적성분석 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/mxvc/traceability/route.ts
git commit -m "feat(mxvc): 추적성분석 API Route 추가 — 바코드 병렬 조회 + 시간순 정렬"
```

---

### Task 3: TraceabilityMaster 컴포넌트

**Files:**
- Create: `src/components/mxvc/TraceabilityMaster.tsx`

- [ ] **Step 1: 마스터 카드 컴포넌트 생성**

```tsx
/**
 * @file src/components/mxvc/TraceabilityMaster.tsx
 * @description 추적성분석 상단 마스터 정보 카드.
 * 초보자 가이드:
 * - IP_PRODUCT_2D_BARCODE 마스터 + IP_PRODUCT_RUN_CARD + IP_PRODUCT_MODEL_MASTER 정보 표시
 * - 카드형 레이아웃으로 주요 정보를 한눈에 요약
 */
'use client';

interface TraceabilityMasterProps {
  master: Record<string, unknown> | null;
  runCard: Record<string, unknown> | null;
  modelMaster: Record<string, unknown> | null;
}

/** 값을 안전하게 문자열로 변환 */
function val(obj: Record<string, unknown> | null, key: string): string {
  if (!obj || obj[key] == null) return '-';
  return String(obj[key]);
}

export default function TraceabilityMaster({ master, runCard, modelMaster }: TraceabilityMasterProps) {
  if (!master) return null;

  const items = [
    { label: 'BARCODE', value: val(master, 'BARCODE') },
    { label: 'MODEL', value: val(master, 'MODEL_NAME') || val(modelMaster, 'MODEL_NAME') },
    { label: 'RUN NO', value: val(master, 'RUN_NO') },
    { label: 'RUN DATE', value: val(master, 'RUN_DATE') || val(runCard, 'RUN_DATE') },
    { label: 'LOT QTY', value: val(runCard, 'LOT_QTY') || val(master, 'LOT_QTY') },
    { label: 'LINE', value: val(master, 'LINE_CODE') || val(runCard, 'LINE_CODE') },
    { label: '작업지시', value: val(runCard, 'WORK_ORDER') || val(runCard, 'RUN_NO') },
    { label: '모델설명', value: val(modelMaster, 'MODEL_DESC') || val(modelMaster, 'DESCRIPTION') },
  ];

  return (
    <div className="mx-6 mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900/60 shadow-sm">
      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
        제품 마스터 정보
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              {item.label}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate"
                  title={item.value}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/TraceabilityMaster.tsx
git commit -m "feat(mxvc): 추적성분석 마스터 정보 카드 컴포넌트"
```

---

### Task 4: TraceabilityTimeline 컴포넌트

**Files:**
- Create: `src/components/mxvc/TraceabilityTimeline.tsx`

- [ ] **Step 1: 타임라인 컴포넌트 생성**

```tsx
/**
 * @file src/components/mxvc/TraceabilityTimeline.tsx
 * @description 추적성분석 타임라인 — 시간순 이벤트 카드를 세로로 나열.
 * 초보자 가이드:
 * - TimelineEvent 배열을 받아 시간순으로 세로 타임라인 렌더링
 * - 유형별 아이콘/배지 구분: log(파란), stage_move(초록), repair(주황+수리 배지)
 * - 각 카드 클릭 시 접기/펼치기로 전체 데이터 확인
 */
'use client';

import { useState } from 'react';
import type { TimelineEvent, TimelineEventType } from '@/types/mxvc/traceability';

interface TraceabilityTimelineProps {
  events: TimelineEvent[];
}

/** 이벤트 유형별 스타일 설정 */
const EVENT_STYLES: Record<TimelineEventType, {
  dotClass: string;
  badgeClass: string;
  badgeText: string;
  icon: string;
}> = {
  log: {
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    badgeText: '',
    icon: '●',
  },
  stage_move: {
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    badgeText: '이동',
    icon: '→',
  },
  repair: {
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    badgeText: '수리',
    icon: '⚠',
  },
};

/** 타임스탬프를 표시용 문자열로 변환 */
function formatTimestamp(ts: string): string {
  if (!ts) return '--:--';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

/** 이벤트 요약 텍스트 생성 — 주요 데이터 2~3개 표시 */
function getSummary(event: TimelineEvent): string {
  const { data, type } = event;
  const skip = new Set(['RNUM', 'ROWNUM', 'LOG_ID', 'LOGTIMESTAMP']);

  if (type === 'stage_move') {
    const from = data.FROM_WORKSTAGE ?? data.FROM_STAGE ?? '';
    const to = data.TO_WORKSTAGE ?? data.TO_STAGE ?? '';
    if (from || to) return `${from} → ${to}`;
  }

  if (type === 'repair') {
    const defect = data.DEFECT_CODE ?? data.DEFECT_NAME ?? '';
    const action = data.ACTION_CODE ?? data.REPAIR_ACTION ?? '';
    return [defect, action].filter(Boolean).join(' / ') || '수리 등록';
  }

  /* log 타입: 주요 값 2~3개 */
  const entries = Object.entries(data)
    .filter(([k, v]) => !skip.has(k) && v != null && String(v).length > 0 && String(v).length < 50)
    .slice(0, 3);
  return entries.map(([k, v]) => `${k}: ${v}`).join(' | ') || '-';
}

/** 단일 이벤트 카드 */
function TimelineCard({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const style = EVENT_STYLES[event.type];

  return (
    <div className="relative flex gap-4 pb-6">
      {/* 세로 선 + 도트 */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div className={`w-3 h-3 rounded-full ${style.dotClass} shrink-0 mt-1.5 z-10`} />
        <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* 카드 본문 */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex-1 min-w-0 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600
                   transition-colors p-3"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
            {formatTimestamp(event.timestamp)}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badgeClass}`}>
            {style.badgeText || event.source.replace('LOG_', '')}
          </span>
          {event.type === 'repair' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              ⚠ 수리
            </span>
          )}
          <span className="ml-auto text-[10px] text-gray-400">
            {expanded ? '▾' : '▸'}
          </span>
        </div>

        {/* 요약 */}
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {getSummary(event)}
        </p>

        {/* 펼침: 전체 데이터 */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(event.data).map(([key, value]) => (
                  <tr key={key} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="py-1 pr-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap align-top w-40">
                      {key}
                    </td>
                    <td className="py-1 text-gray-800 dark:text-gray-200 break-all">
                      {value == null ? '-' : String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TraceabilityTimeline({ events }: TraceabilityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-500 text-sm">
        타임라인 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="px-6 py-4 overflow-y-auto flex-1">
      {events.map((event, idx) => (
        <TimelineCard key={`${event.source}-${event.timestamp}-${idx}`} event={event} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/mxvc/TraceabilityTimeline.tsx
git commit -m "feat(mxvc): 추적성분석 타임라인 컴포넌트 — 접기/펼치기, 유형별 아이콘/배지"
```

---

### Task 5: 페이지 컴포넌트

**Files:**
- Create: `src/app/(mxvc)/mxvc/traceability/page.tsx`

- [ ] **Step 1: 페이지 파일 생성**

```tsx
/**
 * @file src/app/(mxvc)/mxvc/traceability/page.tsx
 * @description 멕시코전장 추적성분석 메인 페이지.
 * 초보자 가이드:
 * - 상단: DisplayHeader + 바코드 입력 + 조회 버튼
 * - 중단: 제품 마스터 카드 (TraceabilityMaster)
 * - 하단: 시간순 타임라인 (TraceabilityTimeline)
 * - 하단: DisplayFooter
 */
'use client';

import { useState, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceabilityMaster from '@/components/mxvc/TraceabilityMaster';
import TraceabilityTimeline from '@/components/mxvc/TraceabilityTimeline';
import type { TraceabilityResponse } from '@/types/mxvc/traceability';

const SCREEN_ID = 'mxvc-traceability';

export default function TraceabilityPage() {
  const [barcode, setBarcode] = useState('');
  const [data, setData] = useState<TraceabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`/api/mxvc/traceability?barcode=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API 오류 (${res.status})`);
      }
      const json: TraceabilityResponse = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [barcode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 추적성분석" screenId={SCREEN_ID} />

      {/* 바코드 입력 바 */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b
                       border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 shrink-0">
          BARCODE
        </label>
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="제품 바코드를 입력하세요"
          className="flex-1 max-w-md h-9 px-3 text-sm rounded-lg
                     bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                     text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                     focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !barcode.trim()}
          className="h-9 px-5 text-sm font-medium bg-blue-600 hover:bg-blue-500
                     disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500
                     text-white rounded-lg transition-colors"
        >
          {loading ? '조회 중...' : '조회'}
        </button>
        {data && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            {data.timeline.length}건
          </span>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-6 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* 마스터 카드 + 타임라인 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {data && (
          <>
            <TraceabilityMaster
              master={data.master}
              runCard={data.runCard}
              modelMaster={data.modelMaster}
            />
            <TraceabilityTimeline events={data.timeline} />
          </>
        )}
        {!data && !loading && !error && (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            바코드를 입력하고 조회 버튼을 눌러주세요
          </div>
        )}
      </div>

      <DisplayFooter />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/\(mxvc\)/mxvc/traceability/page.tsx
git commit -m "feat(mxvc): 추적성분석 페이지 — 바코드 입력 + 마스터카드 + 타임라인"
```

---

### Task 6: 메뉴 카드 등록

**Files:**
- Modify: `config/cards.json` (398행 부근, `mex-inspect-result` 카드 뒤에 추가)

- [ ] **Step 1: cards.json에 추적성분석 카드 추가**

`mex-inspect-result` 항목 뒤에 추가:

```json
    {
      "id": "mex-traceability",
      "title": "추적성분석",
      "url": "/mxvc/traceability",
      "color": "#ec4899",
      "icon": "svg:error-log",
      "layer": 8
    }
```

- [ ] **Step 2: 커밋**

```bash
git add config/cards.json
git commit -m "feat(mxvc): 멕시코전장 메뉴에 추적성분석 카드 추가"
```

---

### Task 7: 통합 확인

- [ ] **Step 1: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공, 에러 없음

- [ ] **Step 2: 개발 서버에서 확인**

```bash
npm run dev
```

1. `http://localhost:3000/mxvc/traceability` 접속
2. 바코드 입력 → 조회 클릭
3. 마스터 카드 표시 확인
4. 타임라인 시간순 정렬 확인
5. 카드 클릭 접기/펼치기 확인
6. 다크모드 전환 확인

- [ ] **Step 3: 최종 커밋 (필요 시)**

빌드 에러 수정 등이 있으면 추가 커밋.
