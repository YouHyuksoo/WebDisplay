# Reverse Trace Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `/mxvc/reverse-trace`의 단일 "릴번호 입력" 경로를 5가지 모드(즉시입력/출고기준/런번호/피더/엑셀)의 위자드로 확장. 기존 3D 그래프 + 5개 테이블 결과 영역은 그대로 재사용.

**Architecture:** 하이브리드 위자드 — 모달에서 모드 선택/조건 입력 후 메인 화면으로 복귀. 모드 B~E는 좌측 `ReelListSidebar`에 릴 후보 리스트, 사용자가 선택 후 [조회] 클릭 시 기존 `/api/mxvc/reverse-trace` 재사용. 신규 API는 릴 후보 조회용 `/api/mxvc/reverse-trace/candidates` 1개(mode 파라미터 분기).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS 4, Oracle(`executeQuery`), `xlsx`(기설치), 클라이언트 상태(React useState).

**프로젝트 규약:**
- 테스트 프레임워크 없음 → 검증은 `npx tsc --noEmit -p .` + 브라우저 + curl
- 커밋 메시지: 한국어, `feat:` / `refactor:` / `fix:` 접두사
- 모든 파일 JSDoc 필수(`@file`, `@description`, 초보자 가이드)
- 파일 300줄 초과 시 분리

**Spec:** `docs/superpowers/specs/2026-04-14-reverse-trace-wizard-design.md`

---

## File Structure

**Create (11 files):**
```
src/types/mxvc/reverse-trace-wizard.ts
src/app/api/mxvc/reverse-trace/candidates/route.ts
src/components/mxvc/reverse-trace/TraceStartScreen.tsx
src/components/mxvc/reverse-trace/TraceWizardModal.tsx
src/components/mxvc/reverse-trace/TraceResultPanel.tsx
src/components/mxvc/reverse-trace/ReelListSidebar.tsx
src/components/mxvc/reverse-trace/modes/ModeImmediate.tsx
src/components/mxvc/reverse-trace/modes/ModeIssue.tsx
src/components/mxvc/reverse-trace/modes/ModeRun.tsx
src/components/mxvc/reverse-trace/modes/ModeFeeder.tsx
src/components/mxvc/reverse-trace/modes/ModeExcel.tsx
```

**Modify (1 file):**
```
src/app/(mxvc)/mxvc/reverse-trace/page.tsx  (상태/레이아웃만 유지, 결과 영역은 TraceResultPanel로 이동)
```

**Unchanged (재사용):**
```
src/app/api/mxvc/reverse-trace/route.ts
src/components/mxvc/ReverseTrace3DGraph.tsx
src/components/mxvc/ReverseTracePanelSplitter.tsx
src/components/mxvc/reverseTraceGraphBuilder.ts
```

---

## Task 1: 타입 정의

**Files:**
- Create: `src/types/mxvc/reverse-trace-wizard.ts`

- [ ] **Step 1: 파일 생성 — 위자드 공통 타입**

```typescript
/**
 * @file src/types/mxvc/reverse-trace-wizard.ts
 * @description 역추적 위자드 — 모드/후보/위자드 상태 타입 정의
 *
 * 초보자 가이드:
 * - TraceMode: 5가지 추적 경로 리터럴 유니온
 * - ReelCandidate: 모드별 추가 필드를 가진 후보 행
 * - WizardState: 메인 페이지에서 관리하는 위자드 상태
 */

export type TraceMode = 'immediate' | 'issue' | 'run' | 'feeder' | 'excel';

export interface ReelCandidateBase {
  reelCd: string;
}

export interface IssueCandidate extends ReelCandidateBase {
  itemCode:  string;
  modelName: string | null;
  issueDate: string;
  issueQty:  number;
  lotNo:     string;
}

export interface RunCandidate extends ReelCandidateBase {
  itemCode:  string;
  modelName: string | null;
  issueDate: string;
  issueQty:  number;
}

export interface FeederCandidate extends ReelCandidateBase {
  partNo:      string;
  installDt:   string;
  uninstallDt: string | null;
}

export interface ExcelCandidate extends ReelCandidateBase {
  rowIndex: number;
}

export type ReelCandidate = IssueCandidate | RunCandidate | FeederCandidate | ExcelCandidate;

export interface CandidatesResponse {
  mode:       Exclude<TraceMode, 'immediate' | 'excel'>;
  candidates: ReelCandidate[];
  total:      number;
}

export interface IssueModeInput  { dateFrom: string; dateTo: string; itemCode: string; }
export interface RunModeInput    { runNo: string; }
export interface FeederModeInput { date: string; eqpCd: string; feederCd: string; }

/** 메인 페이지 위자드 상태 */
export interface WizardState {
  mode:            TraceMode;
  candidates:      ReelCandidate[];  // mode=immediate면 빈 배열
  selectedReelCd:  string;           // 사이드바에서 선택된 릴 (조회 전)
  tracedReelCd:    string;           // 실제 추적 쿼리된 릴 (결과 표시용)
}

export const MODE_LABELS: Record<TraceMode, string> = {
  immediate: '즉시입력',
  issue:     '출고기준',
  run:       '런번호로 추적',
  feeder:    '피더번호로 추적',
  excel:     '엑셀 업로드',
};
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/types/mxvc/reverse-trace-wizard.ts
git commit -m "feat: 역추적 위자드 타입 정의 추가"
```

---

## Task 2: Candidates API 엔드포인트

**Files:**
- Create: `src/app/api/mxvc/reverse-trace/candidates/route.ts`

- [ ] **Step 1: API 라우트 작성**

```typescript
/**
 * @file src/app/api/mxvc/reverse-trace/candidates/route.ts
 * @description 역추적 위자드 — 릴 후보 리스트 조회 API
 *
 * 초보자 가이드:
 * 1. mode 파라미터로 세 가지 경로 분기: issue | run | feeder
 * 2. 각 모드별 필수 파라미터 검증 후 Oracle 조회
 * 3. 최대 500건까지만 반환 (DB 부하 방지)
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get('mode');

  try {
    if (mode === 'issue')  return await handleIssue(sp);
    if (mode === 'run')    return await handleRun(sp);
    if (mode === 'feeder') return await handleFeeder(sp);
    return NextResponse.json({ error: 'mode 파라미터가 필요합니다 (issue | run | feeder)' }, { status: 400 });
  } catch (err) {
    console.error('candidates API 오류:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

async function handleIssue(sp: URLSearchParams) {
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo   = sp.get('dateTo')   ?? '';
  const itemCode = sp.get('itemCode') ?? '';
  if (!dateFrom || !dateTo || !itemCode) {
    return NextResponse.json({ error: 'dateFrom, dateTo, itemCode 모두 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT DISTINCT
           rb.ITEM_BARCODE                                  AS "reelCd",
           iss.ITEM_CODE                                    AS "itemCode",
           NVL(iss.MODEL_NAME, '-')                         AS "modelName",
           TO_CHAR(iss.ISSUE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS "issueDate",
           iss.ISSUE_QTY                                    AS "issueQty",
           iss.MATERIAL_MFS                                 AS "lotNo"
      FROM IM_ITEM_ISSUE iss
      JOIN IM_ITEM_RECEIPT_BARCODE rb
        ON rb.LOT_NO = iss.MATERIAL_MFS AND rb.ITEM_CODE = iss.ITEM_CODE
     WHERE iss.ISSUE_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
       AND iss.ISSUE_DATE <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
       AND iss.ITEM_CODE = :itemCode
     ORDER BY "issueDate" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { dateFrom, dateTo, itemCode });
  return NextResponse.json({ mode: 'issue', candidates: rows, total: rows.length });
}

async function handleRun(sp: URLSearchParams) {
  const runNo = sp.get('runNo') ?? '';
  if (!runNo) return NextResponse.json({ error: 'runNo 파라미터가 필요합니다' }, { status: 400 });

  const sql = `
    SELECT DISTINCT
           rb.ITEM_BARCODE                                  AS "reelCd",
           iss.ITEM_CODE                                    AS "itemCode",
           NVL(iss.MODEL_NAME, '-')                         AS "modelName",
           TO_CHAR(iss.ISSUE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS "issueDate",
           iss.ISSUE_QTY                                    AS "issueQty"
      FROM IM_ITEM_ISSUE iss
      JOIN IM_ITEM_RECEIPT_BARCODE rb
        ON rb.LOT_NO = iss.MATERIAL_MFS AND rb.ITEM_CODE = iss.ITEM_CODE
     WHERE iss.RUN_NO = :runNo
     ORDER BY "issueDate" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { runNo });
  return NextResponse.json({ mode: 'run', candidates: rows, total: rows.length });
}

async function handleFeeder(sp: URLSearchParams) {
  const date     = sp.get('date')     ?? '';
  const eqpCd    = sp.get('eqpCd')    ?? '';
  const feederCd = sp.get('feederCd') ?? '';
  if (!date || !eqpCd || !feederCd) {
    return NextResponse.json({ error: 'date, eqpCd, feederCd 모두 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT DISTINCT
           CAST("ReelCd" AS VARCHAR2(200))                                  AS "reelCd",
           CAST("PartNo" AS VARCHAR2(100))                                  AS "partNo",
           TO_CHAR(CAST("ReelInstallDt" AS TIMESTAMP), 'YYYY-MM-DD HH24:MI:SS')   AS "installDt",
           TO_CHAR(CAST("ReelUninstallDt" AS TIMESTAMP), 'YYYY-MM-DD HH24:MI:SS') AS "uninstallDt"
      FROM HW_ITS_REELCHANGEHISTORY
     WHERE "EqpCd"    = :eqpCd
       AND "FeederCd" = :feederCd
       AND "ReelInstallDt" < TRUNC(TO_DATE(:targetDate, 'YYYY-MM-DD')) + 1
       AND ( "ReelUninstallDt" IS NULL
             OR "ReelUninstallDt" >= TRUNC(TO_DATE(:targetDate, 'YYYY-MM-DD')) )
     ORDER BY "installDt" DESC`;

  const rows = await executeQuery(sql, { eqpCd, feederCd, targetDate: date });
  return NextResponse.json({ mode: 'feeder', candidates: rows, total: rows.length });
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: dev 서버 기동 후 API 수동 검증 (issue 모드)**

Run (브라우저 또는 curl):
```
http://localhost:3000/api/mxvc/reverse-trace/candidates?mode=issue&dateFrom=2026-04-01&dateTo=2026-04-14&itemCode=<실제품목코드>
```
Expected: `{ mode: "issue", candidates: [...], total: N }` (200 응답)
실패 시 (품목코드 미입력): `{ error: "..." }` (400)

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/mxvc/reverse-trace/candidates/route.ts
git commit -m "feat: 역추적 릴 후보 조회 API 추가 (issue/run/feeder)"
```

---

## Task 3: TraceResultPanel 컴포넌트 분리 (기존 page.tsx에서 추출)

**Files:**
- Create: `src/components/mxvc/reverse-trace/TraceResultPanel.tsx`
- Modify: `src/app/(mxvc)/mxvc/reverse-trace/page.tsx` (임시 — Task 12에서 최종 통합)

> **의도**: 기존 결과 영역(상단 조회바 제외, 3D 그래프 + 5개 테이블 + 우측 패널 스플리터 + 하이라이트/최대화 로직) 전체를 그대로 컴포넌트로 추출. 동작은 변경 없음, 단순 이동.

- [ ] **Step 1: 기존 page.tsx 전체 구조 파악**

Run: `wc -l C:/Project/WebDisplay/src/app/(mxvc)/mxvc/reverse-trace/page.tsx`
Expected: 600-900 라인대

파일의 핵심 영역:
- State (lines ~115-140): reelCd, receipt, issues, reelMaster, reelChanges, boards, loading, error, searchedReelCd, expandedBoard, details, detailLoading, expandedCats, maximized, rightWidth, highlightedRow, rightPanelRef, panelDims
- Callbacks (lines ~140-260): handleSearch, handleBoardClick, handleCategoryToggle, handleEntityClick, etc.
- JSX 상단 조회바 + 본문

- [ ] **Step 2: TraceResultPanel 생성 — 결과 영역 전체 이동**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/TraceResultPanel.tsx
 * @description 역추적 결과 영역 — 3D 그래프 + 5개 테이블 + 패널 스플리터
 *
 * 초보자 가이드:
 * - props.reelCd로 추적 쿼리 실행 (reelCd 변경 시 자동 refetch)
 * - 기존 page.tsx의 결과 영역 로직을 그대로 이동 (동작 변경 없음)
 * - 상단 조회바는 메인 페이지/위자드로 이동, 이 컴포넌트는 결과 표시만 담당
 */
'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReverseTrace3DGraph from '@/components/mxvc/ReverseTrace3DGraph';
import ReverseTracePanelSplitter from '@/components/mxvc/ReverseTracePanelSplitter';
import {
  buildGraphData,
  type CategoryId,
  type GraphNode,
  type ApiResponse,
} from '@/components/mxvc/reverseTraceGraphBuilder';
import Spinner from '@/components/ui/Spinner';

/* 아래 5개 인터페이스는 기존 page.tsx에서 그대로 복사 */
interface ReceiptInfo { /* ... 기존 page.tsx의 ReceiptInfo 그대로 ... */ }
interface IssueInfo { /* ... 기존 IssueInfo 그대로 ... */ }
interface ReelMasterInfo { /* ... */ }
interface ReelChangeInfo { /* ... */ }
interface BoardSummary { /* ... */ }
interface DetailRow { /* ... */ }

interface Props {
  reelCd: string;  // 빈 문자열이면 "조회 대기" 상태
}

export default function TraceResultPanel({ reelCd }: Props) {
  /* 기존 page.tsx의 state 전부 이동 — searchedReelCd는 prop reelCd로 대체 */
  const [receipt, setReceipt] = useState<ReceiptInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [reelMaster, setReelMaster] = useState<ReelMasterInfo[]>([]);
  const [reelChanges, setReelChanges] = useState<ReelChangeInfo[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedBoard, setExpandedBoard] = useState('');
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [maximized, setMaximized] = useState(false);
  const [rightWidth, setRightWidth] = useState(30);
  const [highlightedRow, setHighlightedRow] = useState<{ section: string; id: string } | null>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [panelDims, setPanelDims] = useState({ width: 0, height: 0 });

  /* reelCd 변경 시 자동 조회 (기존 handleSearch 로직) */
  useEffect(() => {
    if (!reelCd.trim()) {
      setReceipt([]); setIssues([]); setReelMaster([]); setReelChanges([]); setBoards([]);
      setExpandedBoard(''); setDetails([]); setError('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/mxvc/reverse-trace?reelCd=${encodeURIComponent(reelCd)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setReceipt(json.receipt ?? []);
        setIssues(json.issues ?? []);
        setReelMaster(json.reelMaster ?? []);
        setReelChanges(json.reelChanges ?? []);
        setBoards(json.boards ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reelCd]);

  const handleBoardClick = useCallback(async (boardSN: string) => {
    if (expandedBoard === boardSN) { setExpandedBoard(''); setDetails([]); return; }
    setExpandedBoard(boardSN);
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ reelCd, mode: 'detail', boardSN });
      const res = await fetch(`/api/mxvc/reverse-trace?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDetails(json.details ?? []);
    } catch {
      setDetails([]);
    } finally {
      setDetailLoading(false);
    }
  }, [reelCd, expandedBoard]);

  const apiData: ApiResponse | null = useMemo(() => {
    if (!receipt.length && !issues.length && !reelMaster.length && !reelChanges.length && !boards.length) return null;
    return { reelCd: reelCd || 'Unknown', lotNo: '', receipt, issues, reelMaster, reelChanges, boards };
  }, [reelCd, receipt, issues, reelMaster, reelChanges, boards]);

  const hasData = apiData !== null;

  /* 기존 page.tsx의 ResizeObserver, ESC 키, 하이라이트 자동제거, handleCategoryToggle, handleEntityClick, JSX 전체 이동 */
  /* — 여기서는 지면상 생략, 원본 파일의 useEffect/콜백/return JSX를 그대로 복사 */

  return (
    <>
      {/* 원본 page.tsx의 main 내부 JSX 그대로 (에러/로딩/splitter/그래프/테이블) */}
      {loading && <Spinner fullscreen size="lg" vertical label="역추적 조회 중..." />}
      {error && <div className="mx-6 mt-4 rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">조회 오류: {error}</div>}
      {/* ... 이하 기존 JSX 복붙 ... */}
    </>
  );
}
```

> **구현 노트**: 기존 page.tsx에서 return문 안의 `<main>` 이하(조회바 제외, 에러/로딩/스플리터/그래프/테이블/드릴다운) JSX 전체를 그대로 복사해 `TraceResultPanel`의 return으로 옮긴다. state/콜백도 전부 이동. searchedReelCd는 prop `reelCd`로 대체. 변경 최소화가 원칙.

- [ ] **Step 3: page.tsx를 임시로 TraceResultPanel만 래핑한 형태로 수정**

`src/app/(mxvc)/mxvc/reverse-trace/page.tsx`를 다음과 같이 축소 (Task 12에서 다시 확장):

```typescript
'use client';
import { useState } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceResultPanel from '@/components/mxvc/reverse-trace/TraceResultPanel';

const SCREEN_ID = 'mxvc-reverse-trace';

export default function ReverseTracePage() {
  const [reelCd, setReelCd] = useState('');
  const [input, setInput]   = useState('');
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <DisplayHeader screenId={SCREEN_ID} />
      <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-300">ReelCd:</label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setReelCd(input.trim()); }}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          placeholder="릴번호 입력..."
        />
        <button
          onClick={() => setReelCd(input.trim())}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-500"
        >조회</button>
      </div>
      <main className="flex-1 min-h-0 overflow-hidden">
        <TraceResultPanel reelCd={reelCd} />
      </main>
      <DisplayFooter />
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크 + 브라우저 회귀 검증**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: 에러 없음

브라우저: `http://localhost:3000/mxvc/reverse-trace` → 실제 릴번호 입력 → 기존과 동일한 결과가 나오는지 확인
(3D 그래프 + 5개 테이블 + BoardSN 클릭 드릴다운 + 우측 패널 드래그 크기조정)

- [ ] **Step 5: 커밋**

```bash
git add src/components/mxvc/reverse-trace/TraceResultPanel.tsx src/app/(mxvc)/mxvc/reverse-trace/page.tsx
git commit -m "refactor: 역추적 결과 영역을 TraceResultPanel로 분리"
```

---

## Task 4: TraceStartScreen 컴포넌트

**Files:**
- Create: `src/components/mxvc/reverse-trace/TraceStartScreen.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/TraceStartScreen.tsx
 * @description 역추적 초기 CTA 화면 — "추적 시작" 버튼으로 위자드 오픈
 *
 * 초보자 가이드:
 * - 추적 결과가 없는 초기 상태에 표시
 * - onStart 콜백으로 부모가 위자드 모달을 연다
 */
'use client';

interface Props {
  onStart: () => void;
}

export default function TraceStartScreen({ onStart }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-zinc-100">역추적을 시작하세요</h2>
        <p className="mb-6 text-sm text-zinc-400">
          릴번호를 알면 바로 입력하고,<br />
          모를 때는 <span className="text-zinc-200">출고 / 런번호 / 피더 / 엑셀</span> 조건으로 찾아 추적할 수 있습니다.
        </p>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          추적 시작
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/mxvc/reverse-trace/TraceStartScreen.tsx
git commit -m "feat: 역추적 시작 CTA 화면 TraceStartScreen 추가"
```

---

## Task 5: ModeImmediate 컴포넌트 (즉시입력)

**Files:**
- Create: `src/components/mxvc/reverse-trace/modes/ModeImmediate.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/modes/ModeImmediate.tsx
 * @description 즉시입력 모드 — 릴번호 직접 입력 후 바로 결과 표시
 */
'use client';
import { useState } from 'react';

interface Props {
  onSubmit: (reelCd: string) => void;
  onBack:   () => void;
}

export default function ModeImmediate({ onSubmit, onBack }: Props) {
  const [reelCd, setReelCd] = useState('');
  const canSubmit = reelCd.trim().length > 0;
  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">자재바코드롯트 (ReelCd)</label>
        <input
          type="text"
          value={reelCd}
          onChange={(e) => setReelCd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit(reelCd.trim()); }}
          autoFocus
          placeholder="예: 1234-ABC-500"
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">Enter 또는 [조회] 클릭 시 바로 추적 실행</p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit(reelCd.trim())}
          disabled={!canSubmit}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >조회 →</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/mxvc/reverse-trace/modes/ModeImmediate.tsx
git commit -m "feat: 위자드 즉시입력 모드 ModeImmediate 추가"
```

---

## Task 6: ModeIssue 컴포넌트 (출고기준)

**Files:**
- Create: `src/components/mxvc/reverse-trace/modes/ModeIssue.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/modes/ModeIssue.tsx
 * @description 출고기준 모드 — 기간 + 품목코드로 릴 리스트 조회
 *
 * 초보자 가이드:
 * - dateFrom/dateTo/itemCode 전부 필수
 * - 기간 90일 초과 시 경고 배너
 * - onSubmit(dateFrom, dateTo, itemCode) 호출 — 부모가 /candidates?mode=issue 호출
 */
'use client';
import { useState, useMemo } from 'react';
import type { IssueModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: IssueModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeIssue({ onSubmit, onBack, loading }: Props) {
  const [dateFrom, setDateFrom] = useState(TODAY());
  const [dateTo,   setDateTo]   = useState(TODAY());
  const [itemCode, setItemCode] = useState('');

  const daysDiff = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    const a = new Date(dateFrom).getTime();
    const b = new Date(dateTo).getTime();
    return Math.round((b - a) / 86400000);
  }, [dateFrom, dateTo]);

  const tooLong = daysDiff > 90;
  const canSubmit = dateFrom && dateTo && itemCode.trim() && daysDiff >= 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">시작일</label>
          <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">종료일</label>
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">품목코드 *</label>
        <input type="text" value={itemCode} onChange={(e) => setItemCode(e.target.value)} autoFocus
          placeholder="예: 10-1234-567" required
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
      </div>
      {tooLong && (
        <div className="rounded border border-amber-700 bg-amber-900/30 p-2 text-xs text-amber-300">
          ⚠ 기간이 {daysDiff}일입니다(90일 초과). DB 부하가 생길 수 있어요. 그래도 조회하려면 아래 [조회]를 누르세요.
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit({ dateFrom, dateTo, itemCode: itemCode.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? '조회 중...' : '조회 →'}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/mxvc/reverse-trace/modes/ModeIssue.tsx
git commit -m "feat: 위자드 출고기준 모드 ModeIssue 추가"
```

---

## Task 7: ModeRun 컴포넌트 (런번호)

**Files:**
- Create: `src/components/mxvc/reverse-trace/modes/ModeRun.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/modes/ModeRun.tsx
 * @description 런번호 모드 — RUN_NO로 해당 작업지시에 출고된 릴 리스트 조회
 */
'use client';
import { useState } from 'react';
import type { RunModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: RunModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

export default function ModeRun({ onSubmit, onBack, loading }: Props) {
  const [runNo, setRunNo] = useState('');
  const canSubmit = runNo.trim().length > 0;
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">런번호 (RUN_NO) *</label>
        <input
          type="text"
          value={runNo}
          onChange={(e) => setRunNo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit({ runNo: runNo.trim() }); }}
          autoFocus
          placeholder="예: RUN-20260414-01"
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">IM_ITEM_ISSUE.RUN_NO 기준 — 해당 작업지시로 출고된 모든 릴 조회</p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit({ runNo: runNo.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? '조회 중...' : '조회 →'}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 커밋**

```bash
cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10
git add src/components/mxvc/reverse-trace/modes/ModeRun.tsx
git commit -m "feat: 위자드 런번호 모드 ModeRun 추가"
```

---

## Task 8: ModeFeeder 컴포넌트 (피더번호)

**Files:**
- Create: `src/components/mxvc/reverse-trace/modes/ModeFeeder.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/modes/ModeFeeder.tsx
 * @description 피더번호 모드 — 일자 + 장비 + 피더번호로 그 시점 걸려있던 릴 조회
 */
'use client';
import { useState } from 'react';
import type { FeederModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: FeederModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeFeeder({ onSubmit, onBack, loading }: Props) {
  const [date, setDate]         = useState(TODAY());
  const [eqpCd, setEqpCd]       = useState('');
  const [feederCd, setFeederCd] = useState('');
  const canSubmit = !!date && eqpCd.trim() && feederCd.trim();
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">일자 *</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">장비코드 (EqpCd) *</label>
          <input type="text" value={eqpCd} onChange={(e) => setEqpCd(e.target.value)} autoFocus
            placeholder="예: NXT3-01"
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">피더코드 (FeederCd) *</label>
          <input type="text" value={feederCd} onChange={(e) => setFeederCd(e.target.value)}
            placeholder="예: F001"
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        해당 일자에 지정한 장비-피더에 <span className="text-zinc-300">설치되어 있었던</span> 모든 자재바코드롯트를 조회합니다.
      </p>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit({ date, eqpCd: eqpCd.trim(), feederCd: feederCd.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? '조회 중...' : '조회 →'}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 커밋**

```bash
cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10
git add src/components/mxvc/reverse-trace/modes/ModeFeeder.tsx
git commit -m "feat: 위자드 피더번호 모드 ModeFeeder 추가"
```

---

## Task 9: ModeExcel 컴포넌트 (엑셀 업로드)

**Files:**
- Create: `src/components/mxvc/reverse-trace/modes/ModeExcel.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/modes/ModeExcel.tsx
 * @description 엑셀 업로드 모드 — 1열(자재바코드롯트번호) 엑셀에서 릴번호 추출
 *
 * 초보자 가이드:
 * - xlsx 라이브러리로 클라이언트 파싱 (API 호출 없음)
 * - 1행은 헤더로 가정(무시), 2행부터 릴번호
 * - 최대 1000행 제한, 빈 값/숫자형 제외, 중복 제거
 */
'use client';
import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { ExcelCandidate } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (candidates: ExcelCandidate[]) => void;
  onBack:   () => void;
}

const MAX_ROWS = 1000;

export default function ModeExcel({ onSubmit, onBack }: Props) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed]     = useState<ExcelCandidate[]>([]);
  const [error, setError]       = useState('');

  const handleFile = useCallback(async (file: File) => {
    setError(''); setFileName(file.name); setParsed([]);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      // 1행 헤더 제거
      const body = rows.slice(1);
      if (body.length > MAX_ROWS) {
        setError(`${body.length}행이 입력되었습니다. 최대 ${MAX_ROWS}행만 지원합니다.`);
        return;
      }
      const seen = new Set<string>();
      const list: ExcelCandidate[] = [];
      body.forEach((row, idx) => {
        const raw = row[0];
        if (raw == null) return;
        const reelCd = String(raw).trim();
        if (!reelCd || seen.has(reelCd)) return;
        seen.add(reelCd);
        list.push({ reelCd, rowIndex: idx + 2 });  // +2: 1행 헤더 + 0-based → 1-based
      });
      if (list.length === 0) {
        setError('릴번호를 찾을 수 없습니다. 1열(A열)에 자재바코드롯트번호를 넣어주세요.');
        return;
      }
      setParsed(list);
    } catch (e) {
      setError(`파일 읽기 실패: ${(e as Error).message}`);
    }
  }, []);

  const canSubmit = parsed.length > 0 && !error;
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">엑셀 파일 (.xlsx)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-1.5 file:text-white file:hover:bg-blue-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          1열(A열) = 자재바코드롯트번호. 1행은 헤더로 자동 제외. 최대 {MAX_ROWS}행.
        </p>
      </div>
      {fileName && !error && parsed.length > 0 && (
        <div className="rounded border border-emerald-700 bg-emerald-900/20 p-2 text-xs text-emerald-300">
          ✅ {fileName} — 유효한 릴 {parsed.length}개 추출됨 (중복 제거 후)
        </div>
      )}
      {error && (
        <div className="rounded border border-red-700 bg-red-900/20 p-2 text-xs text-red-300">{error}</div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit(parsed)}
          disabled={!canSubmit}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >다음 →</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 커밋**

```bash
cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10
git add src/components/mxvc/reverse-trace/modes/ModeExcel.tsx
git commit -m "feat: 위자드 엑셀 업로드 모드 ModeExcel 추가"
```

---

## Task 10: TraceWizardModal 통합 컴포넌트

**Files:**
- Create: `src/components/mxvc/reverse-trace/TraceWizardModal.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/TraceWizardModal.tsx
 * @description 역추적 위자드 모달 — Step 1(모드 선택) + Step 2(모드별 입력) 관리
 *
 * 초보자 가이드:
 * - 오픈 시 Step 1(모드 카드) 표시
 * - 모드 선택 → Step 2로 전환, 해당 모드의 ModeXxx 컴포넌트 렌더
 * - 모드별 onSubmit은 부모로 위임 (API 호출/상태관리는 부모 책임)
 */
'use client';
import { useState, useEffect } from 'react';
import ModeImmediate from './modes/ModeImmediate';
import ModeIssue    from './modes/ModeIssue';
import ModeRun      from './modes/ModeRun';
import ModeFeeder   from './modes/ModeFeeder';
import ModeExcel    from './modes/ModeExcel';
import {
  MODE_LABELS,
  type TraceMode,
  type IssueModeInput,
  type RunModeInput,
  type FeederModeInput,
  type ExcelCandidate,
} from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  isOpen: boolean;
  initialMode?: TraceMode;
  loading?: boolean;
  onClose:              () => void;
  onImmediateSubmit:    (reelCd: string) => void;
  onIssueSubmit:        (input: IssueModeInput) => void;
  onRunSubmit:          (input: RunModeInput) => void;
  onFeederSubmit:       (input: FeederModeInput) => void;
  onExcelSubmit:        (candidates: ExcelCandidate[]) => void;
}

const MODE_CARDS: { mode: TraceMode; emoji: string; desc: string }[] = [
  { mode: 'immediate', emoji: '⚡', desc: '릴번호를 바로 입력' },
  { mode: 'issue',     emoji: '📦', desc: '기간 + 품목으로 출고된 릴 찾기' },
  { mode: 'run',       emoji: '🏷️', desc: '런번호(RUN_NO)로 찾기' },
  { mode: 'feeder',    emoji: '🔧', desc: '특정일 피더에 걸린 릴 찾기' },
  { mode: 'excel',     emoji: '📄', desc: '엑셀(1열) 릴번호 일괄 업로드' },
];

export default function TraceWizardModal({
  isOpen, initialMode, loading,
  onClose,
  onImmediateSubmit, onIssueSubmit, onRunSubmit, onFeederSubmit, onExcelSubmit,
}: Props) {
  const [step, setStep] = useState<'pick' | 'input'>(initialMode ? 'input' : 'pick');
  const [mode, setMode] = useState<TraceMode | null>(initialMode ?? null);

  /* 오픈 전환 시 상태 초기화 */
  useEffect(() => {
    if (isOpen) {
      setStep(initialMode ? 'input' : 'pick');
      setMode(initialMode ?? null);
    }
  }, [isOpen, initialMode]);

  /* ESC로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePickMode = (m: TraceMode) => { setMode(m); setStep('input'); };
  const handleBack     = () => { setMode(null); setStep('pick'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            역추적 {step === 'pick' ? '— 모드 선택' : mode ? `— ${MODE_LABELS[mode]}` : ''}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-lg leading-none">✕</button>
        </header>

        <div className="p-5">
          {step === 'pick' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MODE_CARDS.map((c) => (
                <button
                  key={c.mode}
                  onClick={() => handlePickMode(c.mode)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-900/20"
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-sm font-semibold text-zinc-100">{MODE_LABELS[c.mode]}</span>
                  <span className="text-xs text-zinc-400">{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'input' && mode === 'immediate' && (
            <ModeImmediate onSubmit={onImmediateSubmit} onBack={handleBack} />
          )}
          {step === 'input' && mode === 'issue' && (
            <ModeIssue onSubmit={onIssueSubmit} onBack={handleBack} loading={loading} />
          )}
          {step === 'input' && mode === 'run' && (
            <ModeRun onSubmit={onRunSubmit} onBack={handleBack} loading={loading} />
          )}
          {step === 'input' && mode === 'feeder' && (
            <ModeFeeder onSubmit={onFeederSubmit} onBack={handleBack} loading={loading} />
          )}
          {step === 'input' && mode === 'excel' && (
            <ModeExcel onSubmit={onExcelSubmit} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -15`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/mxvc/reverse-trace/TraceWizardModal.tsx
git commit -m "feat: 역추적 위자드 모달 TraceWizardModal 추가"
```

---

## Task 11: ReelListSidebar 컴포넌트

**Files:**
- Create: `src/components/mxvc/reverse-trace/ReelListSidebar.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
/**
 * @file src/components/mxvc/reverse-trace/ReelListSidebar.tsx
 * @description 위자드 결과로 받은 릴 후보 리스트 (좌측 사이드바)
 *
 * 초보자 가이드:
 * - 모드별 추가 컬럼 표시 (issue: 출고일/품목, run: 품목/출고일, feeder: 설치일시, excel: 행번호)
 * - 행 클릭으로 선택 → hightlight만 (조회는 [조회] 버튼 클릭 필요)
 * - [조회] 버튼: selectedReelCd가 있을 때만 활성
 */
'use client';
import type { TraceMode, ReelCandidate } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  mode:           TraceMode;
  candidates:     ReelCandidate[];
  selectedReelCd: string;
  tracedReelCd:   string;
  onSelect:       (reelCd: string) => void;
  onTrace:        () => void;
}

export default function ReelListSidebar({ mode, candidates, selectedReelCd, tracedReelCd, onSelect, onTrace }: Props) {
  return (
    <aside className="flex flex-col h-full w-full border-r border-zinc-800 bg-zinc-950">
      <header className="flex-shrink-0 px-3 py-2 border-b border-zinc-800">
        <div className="text-xs font-semibold text-zinc-200">릴 후보 ({candidates.length}건)</div>
        <div className="text-[10px] text-zinc-500 mt-0.5">클릭 후 [조회] 눌러 추적</div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">조회 결과 없음</div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {candidates.map((c) => {
              const isSelected = c.reelCd === selectedReelCd;
              const isTraced   = c.reelCd === tracedReelCd;
              return (
                <li
                  key={c.reelCd}
                  onClick={() => onSelect(c.reelCd)}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-900/40 border-l-2 border-blue-400'
                      : 'border-l-2 border-transparent hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`font-mono ${isTraced ? 'text-emerald-300' : 'text-zinc-100'}`}>{c.reelCd}</span>
                    {isTraced && <span className="ml-auto text-[9px] rounded bg-emerald-800 px-1.5 py-0.5 text-emerald-200">추적됨</span>}
                  </div>
                  {/* 모드별 보조 정보 */}
                  {'issueDate' in c && (
                    <div className="mt-0.5 text-[10px] text-zinc-400">
                      {c.issueDate.slice(0, 10)} · {'itemCode' in c ? c.itemCode : ''} · {c.issueQty.toLocaleString()}ea
                    </div>
                  )}
                  {'installDt' in c && (
                    <div className="mt-0.5 text-[10px] text-zinc-400">
                      {c.partNo} · 설치 {c.installDt.slice(0, 16)}
                    </div>
                  )}
                  {'rowIndex' in c && (
                    <div className="mt-0.5 text-[10px] text-zinc-500">엑셀 {c.rowIndex}행</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-zinc-800 p-2">
        <button
          onClick={onTrace}
          disabled={!selectedReelCd}
          className="w-full rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
        >
          {selectedReelCd ? `[${selectedReelCd}] 조회` : '릴을 선택하세요'}
        </button>
      </footer>
    </aside>
  );
}
```

- [ ] **Step 2: 타입 체크 + 커밋**

```bash
cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -10
git add src/components/mxvc/reverse-trace/ReelListSidebar.tsx
git commit -m "feat: 릴 후보 사이드바 ReelListSidebar 추가"
```

---

## Task 12: 메인 페이지 통합 리팩토링

**Files:**
- Modify: `src/app/(mxvc)/mxvc/reverse-trace/page.tsx`

- [ ] **Step 1: page.tsx 재작성 — 위자드 + 사이드바 + 결과 통합**

```typescript
/**
 * @file src/app/(mxvc)/mxvc/reverse-trace/page.tsx
 * @description 멕시코전장 역추적 위자드 페이지
 *
 * 초보자 가이드:
 * 1. 초기: TraceStartScreen → [추적 시작] 클릭 → TraceWizardModal 오픈
 * 2. 위자드에서 모드 + 조건 입력 → candidates API(또는 엑셀 파싱) → 릴 리스트 확보
 * 3. 결과: 좌측 ReelListSidebar + 우측 TraceResultPanel
 * 4. 즉시입력 모드는 사이드바 생략, 바로 TraceResultPanel
 * 5. "추적 시작" 버튼은 헤더에 항상 노출 (언제든 모드 변경 가능)
 */
'use client';

import { useState, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceStartScreen from '@/components/mxvc/reverse-trace/TraceStartScreen';
import TraceWizardModal from '@/components/mxvc/reverse-trace/TraceWizardModal';
import ReelListSidebar from '@/components/mxvc/reverse-trace/ReelListSidebar';
import TraceResultPanel from '@/components/mxvc/reverse-trace/TraceResultPanel';
import Spinner from '@/components/ui/Spinner';
import {
  MODE_LABELS,
  type TraceMode,
  type ReelCandidate,
  type IssueModeInput,
  type RunModeInput,
  type FeederModeInput,
  type ExcelCandidate,
  type CandidatesResponse,
} from '@/types/mxvc/reverse-trace-wizard';

const SCREEN_ID = 'mxvc-reverse-trace';

export default function ReverseTracePage() {
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [mode, setMode]               = useState<TraceMode | null>(null);
  const [candidates, setCandidates]   = useState<ReelCandidate[]>([]);
  const [selectedReelCd, setSelected] = useState('');
  const [tracedReelCd, setTraced]     = useState('');
  const [wizardLoading, setWizLoading] = useState(false);
  const [wizardError, setWizError]     = useState('');

  /* 공통: candidates API 호출 */
  const fetchCandidates = useCallback(async (url: string): Promise<ReelCandidate[]> => {
    setWizLoading(true); setWizError('');
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as CandidatesResponse;
      return json.candidates;
    } catch (e) {
      setWizError((e as Error).message);
      return [];
    } finally {
      setWizLoading(false);
    }
  }, []);

  /* 모드별 핸들러 */
  const handleImmediate = useCallback((reelCd: string) => {
    setMode('immediate');
    setCandidates([]);
    setSelected(reelCd);
    setTraced(reelCd);
    setWizardOpen(false);
  }, []);

  const handleIssue = useCallback(async (input: IssueModeInput) => {
    const p = new URLSearchParams({ mode: 'issue', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('issue'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleRun = useCallback(async (input: RunModeInput) => {
    const p = new URLSearchParams({ mode: 'run', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('run'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleFeeder = useCallback(async (input: FeederModeInput) => {
    const p = new URLSearchParams({ mode: 'feeder', ...input });
    const list = await fetchCandidates(`/api/mxvc/reverse-trace/candidates?${p}`);
    setMode('feeder'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, [fetchCandidates]);

  const handleExcel = useCallback((list: ExcelCandidate[]) => {
    setMode('excel'); setCandidates(list); setSelected(''); setTraced(''); setWizardOpen(false);
  }, []);

  const handleTrace = useCallback(() => {
    if (!selectedReelCd) return;
    setTraced(selectedReelCd);
  }, [selectedReelCd]);

  const hasResult = !!mode && (mode === 'immediate' || candidates.length > 0);
  const showSidebar = mode !== null && mode !== 'immediate' && candidates.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <DisplayHeader screenId={SCREEN_ID} />

      {/* 상단 모드 표시 + 추적 시작 */}
      <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        {mode && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            현재 모드: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{MODE_LABELS[mode]}</span>
            {tracedReelCd && <> · 추적 중: <code className="text-emerald-400 font-mono">{tracedReelCd}</code></>}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {wizardError && (
            <span className="text-xs text-red-400">{wizardError}</span>
          )}
          <button
            onClick={() => setWizardOpen(true)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-500"
          >
            {mode ? '추적 시작 (모드 변경)' : '추적 시작'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {!hasResult && (
          <TraceStartScreen onStart={() => setWizardOpen(true)} />
        )}
        {hasResult && showSidebar && (
          <div className="w-64 md:w-72 flex-shrink-0">
            <ReelListSidebar
              mode={mode!}
              candidates={candidates}
              selectedReelCd={selectedReelCd}
              tracedReelCd={tracedReelCd}
              onSelect={setSelected}
              onTrace={handleTrace}
            />
          </div>
        )}
        {hasResult && (
          <div className="flex-1 min-w-0 overflow-hidden">
            {tracedReelCd ? (
              <TraceResultPanel reelCd={tracedReelCd} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                좌측에서 릴을 선택하고 <span className="mx-1 font-semibold text-zinc-300">[조회]</span> 버튼을 누르세요.
              </div>
            )}
          </div>
        )}
      </main>

      {wizardLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <Spinner size="lg" vertical label="릴 후보 조회 중..." labelClassName="text-white" />
        </div>
      )}

      <TraceWizardModal
        isOpen={isWizardOpen}
        loading={wizardLoading}
        onClose={() => setWizardOpen(false)}
        onImmediateSubmit={handleImmediate}
        onIssueSubmit={handleIssue}
        onRunSubmit={handleRun}
        onFeederSubmit={handleFeeder}
        onExcelSubmit={handleExcel}
      />

      <DisplayFooter />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: 에러 없음

- [ ] **Step 3: 브라우저 검증 — 모드별 진입**

URL: `http://localhost:3000/mxvc/reverse-trace`

검증 체크리스트:
- 초기 진입 시 TraceStartScreen 표시
- [추적 시작] 클릭 → 모달에 5개 모드 카드 표시
- **즉시입력**: 기존 유효한 릴번호 입력 → 바로 3D 그래프 + 5테이블 나옴 (기존과 동일)
- **출고기준**: 기간 + 품목 입력 → 사이드바에 릴 후보 리스트 → 선택 → [조회] → 결과 표시
- **런번호**: RUN_NO 입력 → 사이드바 + 선택 + 조회
- **피더번호**: 일자 + 장비 + 피더 입력 → 사이드바 + 선택 + 조회
- **엑셀**: 1열 엑셀 업로드 → 사이드바 + 선택 + 조회
- 상단 [추적 시작 (모드 변경)] 버튼으로 재진입 시 모달 다시 열림

- [ ] **Step 4: 커밋**

```bash
git add src/app/(mxvc)/mxvc/reverse-trace/page.tsx
git commit -m "feat: 역추적 페이지 위자드 UX 통합 (5모드 + 사이드바)"
```

---

## Task 13: 검증 + 회귀 체크

**Files:**
- 변경 없음 (검증만)

- [ ] **Step 1: 최종 타입 체크**

Run: `cd C:/Project/WebDisplay && npx tsc --noEmit -p . 2>&1 | tee /tmp/tsc.log | head -30`
Expected: 에러 없음 (출력 없음 또는 `Found 0 errors`)

- [ ] **Step 2: ESLint 체크**

Run: `cd C:/Project/WebDisplay && npm run lint 2>&1 | tail -30`
Expected: 새 파일들에서 에러/경고 없음

- [ ] **Step 3: 회귀 — 기존 `/mxvc/reverse-trace` 즉시입력 동등성**

이전(위자드 전) 사용자가 릴번호 직접 입력했을 때와 **동일한 결과**가 나와야 한다:
- 위자드 → 즉시입력 → 동일 릴번호 입력
- 3D 그래프 노드 수, 테이블 행 수, BoardSN 드릴다운 모두 이전과 일치
- 스플리터(우측 패널 크기 조정), ESC 최대화 해제도 작동

- [ ] **Step 4: Candidates API 모드별 curl 검증**

```bash
# issue 모드 — 필수 파라미터 누락 시 400
curl -s "http://localhost:3000/api/mxvc/reverse-trace/candidates?mode=issue" | head -c 200
# Expected: {"error":"dateFrom, dateTo, itemCode 모두 필요합니다"}

# run 모드 — 정상 케이스 (실제 RUN_NO로 치환)
curl -s "http://localhost:3000/api/mxvc/reverse-trace/candidates?mode=run&runNo=<실제RUN_NO>" | head -c 300
# Expected: {"mode":"run","candidates":[...],"total":N}

# feeder 모드 — 정상 케이스 (실제 EqpCd/FeederCd)
curl -s "http://localhost:3000/api/mxvc/reverse-trace/candidates?mode=feeder&date=2026-04-14&eqpCd=<eqp>&feederCd=<f>" | head -c 300
# Expected: {"mode":"feeder","candidates":[...]}
```

- [ ] **Step 5: 엑셀 업로드 엣지 케이스**

- 빈 파일: 에러 배너 "릴번호를 찾을 수 없습니다"
- 1001행 파일: "1001행... 최대 1000행만 지원"
- 중복 포함 파일(10행 중 3행 중복): 유효 릴 7개로 카운트

- [ ] **Step 6: 최종 검증 완료 커밋 (문서만 업데이트)**

변경 없으면 커밋 생략. 만약 세부 수정이 있었다면:
```bash
git add <changed files>
git commit -m "fix: 역추적 위자드 검증 중 발견된 이슈 수정"
```

---

## Self-Review 결과

**1. Spec 커버리지 체크**

| Spec 항목 | Task |
|---|---|
| 5가지 모드 정의 | Task 5~9 |
| 하이브리드 위자드 UX (Q1) | Task 4, 10, 12 |
| candidates API (3모드) | Task 2 |
| 기존 추적 API 재사용 | Task 3 (TraceResultPanel) |
| 엑셀 1열 1000행 제한 | Task 9 |
| 출고기준 기간 90일 경고 | Task 6 |
| 피더 기간 중첩 쿼리 | Task 2 (handleFeeder) |
| 모드 변경 / 다른 릴 선택 후 조회버튼 (Q6) | Task 11 (footer 버튼), Task 12 (상단 재진입) |
| 타입 정의 | Task 1 |

누락 없음.

**2. Placeholder 스캔**: "TBD"/"TODO"/"similar to" 없음. Task 3의 "기존 JSX 복붙"은 구현자가 원본 파일 lines를 직접 옮기는 기계적 작업으로 명시됨 (불확정 아님).

**3. 타입 일관성**:
- `TraceMode`: Task 1 정의 → Task 10, 11, 12에서 동일 사용 ✓
- `ReelCandidate` 유니온: Task 1 정의 → Task 11에서 `'issueDate' in c` 식 좁히기 사용 ✓
- `IssueModeInput`/`RunModeInput`/`FeederModeInput`: Task 1 → Task 6~8, 10, 12에서 동일 시그니처 ✓
- `onSubmit` 시그니처: 각 모드 컴포넌트 prop과 `TraceWizardModal` prop, `page.tsx` 핸들러 일치 ✓

---

## 실행 순서 요약

1. Task 1 (타입) → Task 2 (API) — 기반
2. Task 3 (결과 패널 분리) — 회귀 안전성 확보
3. Task 4~11 (위자드/모드/사이드바) — 독립적, 순서 자유
4. Task 12 (통합) — 모든 컴포넌트 조립
5. Task 13 (검증)

Task 3이 제일 큼(결과영역 대량 이동). 이후는 작은 단위로 안전하게 병렬/순차 진행 가능.
