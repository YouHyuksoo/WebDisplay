# 제품투입/포장 모니터링 & 생산계획등록 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PBA 모니터링 카테고리에 제품투입현황(22), 제품포장현황(23), 생산계획등록(20) 3개 화면 구현

**Architecture:** 투입/포장은 공통 컴포넌트(`ProductIoStatus`)에 `workstageCode` prop으로 분기. 생산계획등록은 CRUD 폼. 기존 `DisplayLayout` + SWR polling 패턴 준수.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS 4, Oracle (oracledb), SWR

---

## File Structure

```
src/
├── app/api/display/
│   ├── 20/route.ts                          # 생산계획 CRUD API (GET/POST/PUT/DELETE)
│   ├── 22/route.ts                          # 투입현황 조회 API (GET)
│   └── 23/route.ts                          # 포장현황 조회 API (GET)
├── components/display/screens/
│   ├── product-io/
│   │   ├── ProductIoStatus.tsx              # 투입/포장 메인 (SWR + DisplayLayout)
│   │   └── ProductIoGrid.tsx                # 시간대별 Target/Actual/Shortage/Rate 그리드
│   └── production-plan/
│       └── ProductionPlanRegister.tsx        # 생산계획 CRUD 폼
├── lib/queries/
│   └── product-io-status.ts                 # 투입/포장 SQL 쿼리
└── lib/screens.ts                           # 화면 20, 22, 23 등록
```

---

### Task 1: DB 스키마 변경 — IP_PRODUCT_LINE_TARGET 컬럼 추가

**Files:**
- Create: `scripts/sql/alter-ip-product-line-target.sql`

- [ ] **Step 1: ALTER TABLE SQL 작성**

```sql
-- scripts/sql/alter-ip-product-line-target.sql
ALTER TABLE IP_PRODUCT_LINE_TARGET ADD (
  MODEL_NAME     VARCHAR2(50),
  ITEM_CODE      VARCHAR2(20),
  UPH            NUMBER,
  LEADER_ID      VARCHAR2(20),
  SUB_LEADER_ID  VARCHAR2(20)
);

COMMENT ON COLUMN IP_PRODUCT_LINE_TARGET.MODEL_NAME IS '모델명';
COMMENT ON COLUMN IP_PRODUCT_LINE_TARGET.ITEM_CODE IS '제품코드';
COMMENT ON COLUMN IP_PRODUCT_LINE_TARGET.UPH IS '시간당 생산능력';
COMMENT ON COLUMN IP_PRODUCT_LINE_TARGET.LEADER_ID IS '리더 사번 (ISYS_USERS.USER_ID)';
COMMENT ON COLUMN IP_PRODUCT_LINE_TARGET.SUB_LEADER_ID IS '부리더 사번 (ISYS_USERS.USER_ID)';
```

- [ ] **Step 2: SMVNPDB에 ALTER TABLE 실행**

```bash
python C:/Users/hsyou/.claude/skills/oracle-db/scripts/oracle_connector.py --site SMVNPDB --query "ALTER TABLE IP_PRODUCT_LINE_TARGET ADD (MODEL_NAME VARCHAR2(50), ITEM_CODE VARCHAR2(20), UPH NUMBER, LEADER_ID VARCHAR2(20), SUB_LEADER_ID VARCHAR2(20))"
```

- [ ] **Step 3: 컬럼 추가 확인**

```bash
python C:/Users/hsyou/.claude/skills/oracle-db/scripts/oracle_connector.py --site SMVNPDB --describe-table IP_PRODUCT_LINE_TARGET
```

Expected: MODEL_NAME, ITEM_CODE, UPH, LEADER_ID, SUB_LEADER_ID 5개 컬럼이 보여야 함

- [ ] **Step 4: Commit**

```bash
git add scripts/sql/alter-ip-product-line-target.sql
git commit -m "feat: IP_PRODUCT_LINE_TARGET에 MODEL_NAME, ITEM_CODE, UPH, LEADER_ID, SUB_LEADER_ID 추가"
```

---

### Task 2: screens.ts에 화면 20, 22, 23 등록

**Files:**
- Modify: `src/lib/screens.ts:33` (SCREENS 레지스트리)

- [ ] **Step 1: SCREENS에 3개 화면 추가**

`src/lib/screens.ts`의 `SCREENS` 객체에 추가 (21번 아래):

```typescript
'20': { id: '20', title: 'Production Plan Register', titleKo: '생산계획등록', titleVi: 'Đăng ký kế hoạch sản xuất', window: '', group: 'pba-monitoring' },
'22': { id: '22', title: 'Product Input Status', titleKo: '제품투입현황', titleVi: 'Tình trạng nhập sản phẩm', window: '', group: 'pba-monitoring', lineFilter: true },
'23': { id: '23', title: 'Product Packaging Status', titleKo: '제품포장현황', titleVi: 'Tình trạng đóng gói sản phẩm', window: '', group: 'pba-monitoring', lineFilter: true },
```

주의: `lineFilter: true`는 22, 23에만. 20(등록화면)은 lineFilter 불필요.

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add src/lib/screens.ts
git commit -m "feat: screens.ts에 화면 20(생산계획등록), 22(투입), 23(포장) 등록"
```

---

### Task 3: 투입/포장 SQL 쿼리 모듈

**Files:**
- Create: `src/lib/queries/product-io-status.ts`

- [ ] **Step 1: SQL 쿼리 모듈 작성**

```typescript
/**
 * @file product-io-status.ts
 * @description 제품투입현황(22)/제품포장현황(23) SQL 쿼리.
 * 초보자 가이드: IP_PRODUCT_LINE_TARGET(계획)과 IP_PRODUCT_WORKSTAGE_IO(실적)을
 * LINE_CODE로 조인하여 시간대별 실적을 조회한다.
 * workstageCode로 투입(W310)/포장(W220)을 구분.
 */

/**
 * 생산계획 조회 — 단일 라인, 오늘 날짜 기준
 * ICOM_WORKTIME_RANGES의 SHIFTTIME으로 현재 shift 판별 후 해당 계획 조회
 */
export function sqlProductPlan(): string {
  return `
SELECT t.PLAN_DATE,
       t.LINE_CODE,
       F_GET_LINE_NAME(t.LINE_CODE, 1) AS LINE_NAME,
       t.SHIFT_CODE,
       t.PLAN_QTY,
       t.UPH,
       t.MODEL_NAME,
       t.ITEM_CODE,
       t.WORKER_QTY,
       t.COMMENTS,
       t.LEADER_ID,
       t.SUB_LEADER_ID,
       NVL(leader.USER_NAME, t.LEADER_ID) AS LEADER_NAME,
       NVL(sub_leader.USER_NAME, t.SUB_LEADER_ID) AS SUB_LEADER_NAME
  FROM IP_PRODUCT_LINE_TARGET t
  LEFT JOIN ISYS_USERS leader ON leader.USER_ID = t.LEADER_ID
  LEFT JOIN ISYS_USERS sub_leader ON sub_leader.USER_ID = t.SUB_LEADER_ID
 WHERE t.LINE_CODE = :lineCode
   AND t.ORGANIZATION_ID = :orgId
   AND t.PLAN_DATE = TRUNC(SYSDATE)
`;
}

/**
 * 시간대별 실적 집계 — WORK_TIME_ZONE 기준, 2시간 묶음
 * @param workstageCode - 'W310'(투입) 또는 'W220'(포장)
 */
export function sqlTimeZoneActual(): string {
  return `
SELECT WORK_TIME_ZONE,
       SUM(IO_QTY) AS QTY
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode
   AND WORKSTAGE_CODE = :workstageCode
   AND ORGANIZATION_ID = :orgId
   AND ACTUAL_YYYMMDD = TO_CHAR(SYSDATE, 'YYYYMMDD')
 GROUP BY WORK_TIME_ZONE
 ORDER BY WORK_TIME_ZONE
`;
}

/**
 * 총 실적 수량 조회
 */
export function sqlTotalActual(): string {
  return `
SELECT COUNT(*) AS TOTAL_QTY
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode
   AND WORKSTAGE_CODE = :workstageCode
   AND ORGANIZATION_ID = :orgId
   AND ACTUAL_YYYMMDD = TO_CHAR(SYSDATE, 'YYYYMMDD')
`;
}

/**
 * WORK_TIME_ZONE 값을 2시간 단위 그룹 인덱스(0~5)로 매핑.
 * 주간: AA+AB→0, AC+AD→1, AE+AF→2, AG+AH→3, AI+AJ→4, AK+AL→5
 * 야간: BA+BB→0, BC+BD→1, BE+BF→2, BG+BH→3, BI+BJ→4, BK+BL→5
 */
export function mapTimeZoneToGroup(zone: string): number {
  const dayMap: Record<string, number> = {
    AA: 0, AB: 0, AC: 1, AD: 1, AE: 2, AF: 2,
    AG: 3, AH: 3, AI: 4, AJ: 4, AK: 5, AL: 5,
  };
  const nightMap: Record<string, number> = {
    BA: 0, BB: 0, BC: 1, BD: 1, BE: 2, BF: 2,
    BG: 3, BH: 3, BI: 4, BJ: 4, BK: 5, BL: 5,
  };
  return dayMap[zone] ?? nightMap[zone] ?? -1;
}

/** 주간/야간 시간대 레이블 */
export const TIME_LABELS: Record<string, string[]> = {
  A: ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20'],
  B: ['20-22', '22-00', '00-02', '02-04', '04-06', '06-08'],
};

/** 현재 shift 코드 판별 (08~20 → A, 20~08 → B) */
export function getCurrentShift(): string {
  const hour = new Date().getHours();
  return (hour >= 8 && hour < 20) ? 'A' : 'B';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/product-io-status.ts
git commit -m "feat: 투입/포장 SQL 쿼리 모듈 추가 (product-io-status.ts)"
```

---

### Task 4: 투입현황 API Route (/api/display/22)

**Files:**
- Create: `src/app/api/display/22/route.ts`

- [ ] **Step 1: API Route 작성**

```typescript
/**
 * @file route.ts
 * @description 제품투입현황 API (메뉴 22).
 * 초보자 가이드: GET /api/display/22?orgId=1&lines=P11 로 호출하면
 * 해당 라인의 투입 실적(시간대별)과 생산계획을 반환한다.
 * workstageCode = 'W310' (투입 공정)
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlProductPlan,
  sqlTimeZoneActual,
  sqlTotalActual,
  mapTimeZoneToGroup,
  getCurrentShift,
  TIME_LABELS,
} from '@/lib/queries/product-io-status';

const WORKSTAGE_CODE = 'W310';
const TIME_ZONE_COUNT = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = Number(searchParams.get('orgId') ?? '1');
  const lineCode = searchParams.get('lines') ?? '';

  if (!lineCode || lineCode === '%') {
    return NextResponse.json({ plan: null, timeZones: [], totalActual: 0, timeLabels: [], shift: getCurrentShift(), timestamp: new Date().toISOString() });
  }

  try {
    const shift = getCurrentShift();

    const [planRows, tzRows, totalRows] = await Promise.all([
      executeQuery<Record<string, unknown>>(sqlProductPlan(), { lineCode, orgId }),
      executeQuery<{ WORK_TIME_ZONE: string; QTY: number }>(sqlTimeZoneActual(), { lineCode, workstageCode: WORKSTAGE_CODE, orgId }),
      executeQuery<{ TOTAL_QTY: number }>(sqlTotalActual(), { lineCode, workstageCode: WORKSTAGE_CODE, orgId }),
    ]);

    const plan = planRows[0] ?? null;
    const totalActual = totalRows[0]?.TOTAL_QTY ?? 0;
    const planQty = (plan as Record<string, unknown>)?.PLAN_QTY as number ?? 0;

    // 시간대별 실적 집계 (2시간 묶음, 6개)
    const grouped = new Array(TIME_ZONE_COUNT).fill(0);
    for (const row of tzRows) {
      const idx = mapTimeZoneToGroup(row.WORK_TIME_ZONE);
      if (idx >= 0) grouped[idx] += row.QTY;
    }

    // 시간대별 목표 균등 분배
    const baseTarget = Math.floor(planQty / TIME_ZONE_COUNT);
    const remainder = planQty % TIME_ZONE_COUNT;
    const targets = Array.from({ length: TIME_ZONE_COUNT }, (_, i) =>
      i === TIME_ZONE_COUNT - 1 ? baseTarget + remainder : baseTarget
    );

    return NextResponse.json({
      plan,
      timeZones: grouped,
      targets,
      totalActual,
      timeLabels: TIME_LABELS[shift] ?? TIME_LABELS.A,
      shift,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/22] Error:', error);
    return NextResponse.json({ error: 'Database query failed', plan: null, timeZones: [], targets: [], totalActual: 0, timeLabels: [], shift: 'A' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/display/22/route.ts
git commit -m "feat: 투입현황 API Route (/api/display/22, W310)"
```

---

### Task 5: 포장현황 API Route (/api/display/23)

**Files:**
- Create: `src/app/api/display/23/route.ts`

- [ ] **Step 1: API Route 작성**

`/api/display/22/route.ts`와 동일 구조, `WORKSTAGE_CODE`만 `'W220'`으로 변경:

```typescript
/**
 * @file route.ts
 * @description 제품포장현황 API (메뉴 23).
 * 초보자 가이드: GET /api/display/23?orgId=1&lines=P11 로 호출하면
 * 해당 라인의 포장 실적(시간대별)과 생산계획을 반환한다.
 * workstageCode = 'W220' (포장 공정)
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlProductPlan,
  sqlTimeZoneActual,
  sqlTotalActual,
  mapTimeZoneToGroup,
  getCurrentShift,
  TIME_LABELS,
} from '@/lib/queries/product-io-status';

const WORKSTAGE_CODE = 'W220';
const TIME_ZONE_COUNT = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = Number(searchParams.get('orgId') ?? '1');
  const lineCode = searchParams.get('lines') ?? '';

  if (!lineCode || lineCode === '%') {
    return NextResponse.json({ plan: null, timeZones: [], totalActual: 0, timeLabels: [], shift: getCurrentShift(), timestamp: new Date().toISOString() });
  }

  try {
    const shift = getCurrentShift();

    const [planRows, tzRows, totalRows] = await Promise.all([
      executeQuery<Record<string, unknown>>(sqlProductPlan(), { lineCode, orgId }),
      executeQuery<{ WORK_TIME_ZONE: string; QTY: number }>(sqlTimeZoneActual(), { lineCode, workstageCode: WORKSTAGE_CODE, orgId }),
      executeQuery<{ TOTAL_QTY: number }>(sqlTotalActual(), { lineCode, workstageCode: WORKSTAGE_CODE, orgId }),
    ]);

    const plan = planRows[0] ?? null;
    const totalActual = totalRows[0]?.TOTAL_QTY ?? 0;
    const planQty = (plan as Record<string, unknown>)?.PLAN_QTY as number ?? 0;

    const grouped = new Array(TIME_ZONE_COUNT).fill(0);
    for (const row of tzRows) {
      const idx = mapTimeZoneToGroup(row.WORK_TIME_ZONE);
      if (idx >= 0) grouped[idx] += row.QTY;
    }

    const baseTarget = Math.floor(planQty / TIME_ZONE_COUNT);
    const remainder = planQty % TIME_ZONE_COUNT;
    const targets = Array.from({ length: TIME_ZONE_COUNT }, (_, i) =>
      i === TIME_ZONE_COUNT - 1 ? baseTarget + remainder : baseTarget
    );

    return NextResponse.json({
      plan,
      timeZones: grouped,
      targets,
      totalActual,
      timeLabels: TIME_LABELS[shift] ?? TIME_LABELS.A,
      shift,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/23] Error:', error);
    return NextResponse.json({ error: 'Database query failed', plan: null, timeZones: [], targets: [], totalActual: 0, timeLabels: [], shift: 'A' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/display/23/route.ts
git commit -m "feat: 포장현황 API Route (/api/display/23, W220)"
```

---

### Task 6: 투입/포장 공통 그리드 컴포넌트

**Files:**
- Create: `src/components/display/screens/product-io/ProductIoGrid.tsx`

- [ ] **Step 1: ProductIoGrid 컴포넌트 작성**

```tsx
/**
 * @file ProductIoGrid.tsx
 * @description 제품투입/포장 현황 시간대별 그리드.
 * 초보자 가이드: Target/Actual/Shortage/% Rate를 시간대별로 표시.
 * 단일 라인 전체화면용. 투입(W310)/포장(W220) 공통 사용.
 */
'use client';

import { fmtNum } from '@/lib/display-helpers';

interface ProductIoPlan {
  PLAN_QTY: number;
  MODEL_NAME: string | null;
  ITEM_CODE: string | null;
  UPH: number | null;
  WORKER_QTY: number | null;
  COMMENTS: string | null;
  LINE_NAME: string | null;
  SHIFT_CODE: string | null;
  LEADER_NAME: string | null;
  SUB_LEADER_NAME: string | null;
  LEADER_ID: string | null;
  SUB_LEADER_ID: string | null;
}

interface ProductIoGridProps {
  plan: ProductIoPlan | null;
  timeZones: number[];
  targets: number[];
  totalActual: number;
  timeLabels: string[];
  shift: string;
  isLoading: boolean;
  error: unknown;
  /** 화면 타이틀 (투입현황 / 포장현황) */
  title: string;
}

export default function ProductIoGrid({
  plan,
  timeZones,
  targets,
  totalActual,
  timeLabels,
  shift,
  isLoading,
  error,
  title,
}: ProductIoGridProps) {
  if (error) {
    return <div className="flex h-full items-center justify-center text-red-400">데이터 조회 실패</div>;
  }
  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-zinc-400">로딩 중...</div>;
  }

  const planQty = plan?.PLAN_QTY ?? 0;
  const totalTarget = targets.reduce((a, b) => a + b, 0);
  const totalShortage = totalActual - totalTarget;
  const totalRate = totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(1) : '0.0';
  const completionRate = planQty > 0 ? ((totalActual / planQty) * 100).toFixed(2) : '0.00';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const shiftLabel = shift === 'A' ? 'Day' : 'Night';

  return (
    <div className="flex h-full flex-col gap-2 p-3 text-white">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-6 text-sm">
          <span>Line: <strong className="text-cyan-400">{plan?.LINE_NAME ?? '-'}</strong></span>
          <span>Shift: <strong>{shiftLabel}</strong></span>
        </div>
        <div className="text-lg font-mono text-zinc-300">{timeStr}</div>
      </div>

      {/* Plan 요약 */}
      <div className="flex items-center gap-8 rounded-lg bg-zinc-900/60 px-4 py-1.5 text-sm">
        <span>Plan Q&apos;ty: <strong className="text-white">{fmtNum(planQty)}</strong></span>
        <span>Finished Q&apos;ty: <strong className="text-green-400">{fmtNum(totalActual)}</strong></span>
        <span>Completion %: <strong className="text-yellow-400">{completionRate}%</strong></span>
      </div>

      {/* 시간대별 그리드 */}
      <div className="flex-1 overflow-hidden rounded-lg border border-zinc-700">
        <table className="h-full w-full table-fixed border-collapse text-center">
          <thead>
            <tr className="bg-zinc-800 text-sm text-zinc-300">
              <th className="w-24 border border-zinc-700 px-2 py-2"></th>
              {timeLabels.map((label, i) => (
                <th key={i} className="border border-zinc-700 px-2 py-2">Time {i + 1}<br /><span className="text-xs text-zinc-500">{label}</span></th>
              ))}
              <th className="border border-zinc-700 px-2 py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody className="text-xl font-bold">
            {/* Target */}
            <tr className="bg-zinc-900/80">
              <td className="border border-zinc-700 px-2 py-3 text-sm font-semibold text-yellow-400">Target</td>
              {targets.map((t, i) => (
                <td key={i} className="border border-zinc-700 px-2 py-3 text-white">{fmtNum(t)}</td>
              ))}
              <td className="border border-zinc-700 px-2 py-3 text-white">{fmtNum(totalTarget)}</td>
            </tr>
            {/* Actual */}
            <tr className="bg-zinc-950/60">
              <td className="border border-zinc-700 px-2 py-3 text-sm font-semibold text-green-400">Actual</td>
              {timeZones.map((a, i) => (
                <td key={i} className="border border-zinc-700 px-2 py-3 text-white">{fmtNum(a)}</td>
              ))}
              <td className="border border-zinc-700 px-2 py-3 text-white">{fmtNum(totalActual)}</td>
            </tr>
            {/* Shortage */}
            <tr className="bg-zinc-900/80">
              <td className="border border-zinc-700 px-2 py-3 text-sm font-semibold text-red-400">Shortage</td>
              {timeZones.map((a, i) => {
                const shortage = a - targets[i];
                return (
                  <td key={i} className={`border border-zinc-700 px-2 py-3 ${shortage < 0 ? 'text-red-500' : 'text-white'}`}>
                    {fmtNum(shortage)}
                  </td>
                );
              })}
              <td className={`border border-zinc-700 px-2 py-3 ${totalShortage < 0 ? 'text-red-500' : 'text-white'}`}>
                {fmtNum(totalShortage)}
              </td>
            </tr>
            {/* % Rate */}
            <tr className="bg-zinc-950/60">
              <td className="border border-zinc-700 px-2 py-3 text-sm font-semibold text-cyan-400">% Rate</td>
              {timeZones.map((a, i) => {
                const rate = targets[i] > 0 ? ((a / targets[i]) * 100).toFixed(1) : '0.0';
                return (
                  <td key={i} className="border border-zinc-700 px-2 py-3 text-cyan-300">{rate}%</td>
                );
              })}
              <td className="border border-zinc-700 px-2 py-3 text-cyan-300">{totalRate}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 모델 정보 바 */}
      <div className="flex items-center gap-6 rounded-lg bg-zinc-900/60 px-4 py-2 text-sm">
        <span>MODEL TYPE: <strong className="text-white">{plan?.MODEL_NAME ?? '-'}</strong></span>
        <span>UPH: <strong className="text-white">{plan?.UPH ?? '-'}</strong></span>
        <span>Code: <strong className="text-cyan-400">{plan?.ITEM_CODE ?? '-'}</strong></span>
        <span>PlanQty: <strong className="text-white">{fmtNum(planQty)}</strong></span>
        <span>CompletionQty: <strong className="text-green-400">{fmtNum(totalActual)}</strong></span>
      </div>

      {/* 하단: NOTICE + Leader */}
      <div className="flex items-center gap-4 rounded-lg bg-zinc-900 px-4 py-2">
        <div className="flex-1">
          <span className="mr-2 text-xs font-bold text-red-500">NOTICE</span>
          <span className="text-sm text-yellow-300">{plan?.COMMENTS ?? ''}</span>
        </div>
        <div className="flex gap-4 text-xs text-zinc-400">
          <div className="text-center">
            <div className="font-semibold text-zinc-300">Leader</div>
            <div>{plan?.LEADER_NAME ?? '-'}</div>
            {plan?.LEADER_ID && <div className="text-zinc-500">ID: {plan.LEADER_ID}</div>}
          </div>
          <div className="text-center">
            <div className="font-semibold text-zinc-300">Sub Leader</div>
            <div>{plan?.SUB_LEADER_NAME ?? '-'}</div>
            {plan?.SUB_LEADER_ID && <div className="text-zinc-500">ID: {plan.SUB_LEADER_ID}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/display/screens/product-io/ProductIoGrid.tsx
git commit -m "feat: 투입/포장 공통 그리드 컴포넌트 (ProductIoGrid)"
```

---

### Task 7: 투입/포장 메인 컴포넌트

**Files:**
- Create: `src/components/display/screens/product-io/ProductIoStatus.tsx`

- [ ] **Step 1: ProductIoStatus 컴포넌트 작성**

```tsx
/**
 * @file ProductIoStatus.tsx
 * @description 제품투입/포장 현황 메인 화면. SWR polling + 다크 UI.
 * 초보자 가이드: workstageCode prop으로 투입(W310)/포장(W220) 구분.
 * API에서 데이터를 가져와 ProductIoGrid에 전달.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import ProductIoGrid from './ProductIoGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { useSyncFooterStatus } from '@/components/providers/FooterProvider';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

interface ProductIoStatusProps {
  screenId: string;
  /** 공정코드: 'W310'(투입) 또는 'W220'(포장) */
  workstageCode: string;
}

export default function ProductIoStatus({ screenId, workstageCode }: ProductIoStatusProps) {
  const timing = useDisplayTiming();
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(selectedLines) }),
    fetcher,
    {
      refreshInterval: timing.refreshSeconds * 1000,
      onSuccess: () => setLastUpdated(new Date()),
    },
  );

  useSyncFooterStatus({ loading: isLoading, lastUpdated });

  const handleLineChange = useCallback(() => {
    setSelectedLines(getSelectedLines(screenId));
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

  const title = workstageCode === 'W310' ? '제품투입현황' : '제품포장현황';

  return (
    <DisplayLayout screenId={screenId}>
      <ProductIoGrid
        plan={data?.plan ?? null}
        timeZones={data?.timeZones ?? []}
        targets={data?.targets ?? []}
        totalActual={data?.totalActual ?? 0}
        timeLabels={data?.timeLabels ?? []}
        shift={data?.shift ?? 'A'}
        isLoading={isLoading}
        error={error}
        title={title}
      />
    </DisplayLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/display/screens/product-io/ProductIoStatus.tsx
git commit -m "feat: 투입/포장 메인 컴포넌트 (ProductIoStatus)"
```

---

### Task 8: 생산계획등록 API (/api/display/20)

**Files:**
- Create: `src/app/api/display/20/route.ts`

- [ ] **Step 1: CRUD API 작성**

```typescript
/**
 * @file route.ts
 * @description 생산계획등록 CRUD API (메뉴 20).
 * 초보자 가이드: IP_PRODUCT_LINE_TARGET 테이블에 대한 CRUD.
 * GET: 목록 조회, POST: 등록, PUT: 수정, DELETE: 삭제.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import oracledb from 'oracledb';

/** 계획 목록 조회 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = Number(searchParams.get('orgId') ?? '1');
  const planDate = searchParams.get('planDate') ?? '';

  const sql = `
SELECT t.PLAN_DATE, t.LINE_CODE,
       F_GET_LINE_NAME(t.LINE_CODE, 1) AS LINE_NAME,
       t.SHIFT_CODE, t.MODEL_NAME, t.ITEM_CODE,
       t.UPH, t.PLAN_QTY, t.WORKER_QTY, t.COMMENTS,
       t.LEADER_ID, t.SUB_LEADER_ID,
       NVL(leader.USER_NAME, t.LEADER_ID) AS LEADER_NAME,
       NVL(sub_leader.USER_NAME, t.SUB_LEADER_ID) AS SUB_LEADER_NAME,
       t.ENTER_DATE, t.ENTER_BY
  FROM IP_PRODUCT_LINE_TARGET t
  LEFT JOIN ISYS_USERS leader ON leader.USER_ID = t.LEADER_ID
  LEFT JOIN ISYS_USERS sub_leader ON sub_leader.USER_ID = t.SUB_LEADER_ID
 WHERE t.ORGANIZATION_ID = :orgId
   AND (:planDate IS NULL OR t.PLAN_DATE = TO_DATE(:planDate, 'YYYY-MM-DD'))
 ORDER BY t.PLAN_DATE DESC, t.LINE_CODE
`;

  try {
    const rows = await executeQuery(sql, { orgId, planDate: planDate || null });
    return NextResponse.json({ rows, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[API /display/20 GET] Error:', error);
    return NextResponse.json({ error: 'Query failed', rows: [] }, { status: 500 });
  }
}

/** 생산계획 등록 */
export async function POST(request: Request) {
  const body = await request.json();
  const sql = `
INSERT INTO IP_PRODUCT_LINE_TARGET (
  PLAN_DATE, LINE_CODE, SHIFT_CODE, PLAN_QTY, UPH,
  MODEL_NAME, ITEM_CODE, WORKER_QTY, COMMENTS,
  LEADER_ID, SUB_LEADER_ID, ORGANIZATION_ID,
  ENTER_DATE, ENTER_BY
) VALUES (
  TO_DATE(:planDate, 'YYYY-MM-DD'), :lineCode, :shiftCode, :planQty, :uph,
  :modelName, :itemCode, :workerQty, :comments,
  :leaderId, :subLeaderId, :orgId,
  SYSDATE, :enterBy
)`;

  try {
    const pool = await (await import('@/lib/db')).default;
    const conn = await (await oracledb.createPool({})).getConnection();
    // executeQuery 는 SELECT 전용이므로 INSERT는 직접 실행
    const oraPool = await getPoolForDml();
    await executeDml(sql, {
      planDate: body.planDate,
      lineCode: body.lineCode,
      shiftCode: body.shiftCode ?? 'A',
      planQty: body.planQty ?? 0,
      uph: body.uph ?? null,
      modelName: body.modelName ?? null,
      itemCode: body.itemCode ?? null,
      workerQty: body.workerQty ?? null,
      comments: body.comments ?? null,
      leaderId: body.leaderId ?? null,
      subLeaderId: body.subLeaderId ?? null,
      orgId: body.orgId ?? 1,
      enterBy: body.enterBy ?? 'SYSTEM',
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /display/20 POST] Error:', error);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }
}

/** 생산계획 수정 */
export async function PUT(request: Request) {
  const body = await request.json();
  const sql = `
UPDATE IP_PRODUCT_LINE_TARGET SET
  SHIFT_CODE = :shiftCode,
  PLAN_QTY = :planQty,
  UPH = :uph,
  MODEL_NAME = :modelName,
  ITEM_CODE = :itemCode,
  WORKER_QTY = :workerQty,
  COMMENTS = :comments,
  LEADER_ID = :leaderId,
  SUB_LEADER_ID = :subLeaderId,
  LAST_MODIFY_DATE = SYSDATE,
  LAST_MODIFY_BY = :modifyBy
WHERE PLAN_DATE = TO_DATE(:planDate, 'YYYY-MM-DD')
  AND LINE_CODE = :lineCode
  AND ORGANIZATION_ID = :orgId
`;

  try {
    await executeDml(sql, {
      planDate: body.planDate,
      lineCode: body.lineCode,
      shiftCode: body.shiftCode ?? 'A',
      planQty: body.planQty ?? 0,
      uph: body.uph ?? null,
      modelName: body.modelName ?? null,
      itemCode: body.itemCode ?? null,
      workerQty: body.workerQty ?? null,
      comments: body.comments ?? null,
      leaderId: body.leaderId ?? null,
      subLeaderId: body.subLeaderId ?? null,
      orgId: body.orgId ?? 1,
      modifyBy: body.enterBy ?? 'SYSTEM',
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /display/20 PUT] Error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

/** 생산계획 삭제 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const planDate = searchParams.get('planDate') ?? '';
  const lineCode = searchParams.get('lineCode') ?? '';
  const orgId = Number(searchParams.get('orgId') ?? '1');

  const sql = `
DELETE FROM IP_PRODUCT_LINE_TARGET
WHERE PLAN_DATE = TO_DATE(:planDate, 'YYYY-MM-DD')
  AND LINE_CODE = :lineCode
  AND ORGANIZATION_ID = :orgId
`;

  try {
    await executeDml(sql, { planDate, lineCode, orgId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /display/20 DELETE] Error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

// DML 실행 헬퍼 (INSERT/UPDATE/DELETE + autoCommit)
async function executeDml(sql: string, binds: Record<string, unknown>): Promise<void> {
  const { getPool } = await import('@/lib/db');
  // db.ts에 getPool이 export되지 않으므로 executeQuery 패턴 활용
  // 대안: db.ts에 executeDml 추가 필요
  const oracledb = (await import('oracledb')).default;
  const { executeQuery: _ , ...dbModule } = await import('@/lib/db');
  // 직접 커넥션 사용
  const pool = await (dbModule as { getPool?: () => Promise<oracledb.Pool> }).getPool?.()
    ?? await oracledb.getPool();
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, binds, { autoCommit: true });
  } finally {
    await conn.close();
  }
}
```

**주의:** `db.ts`에서 `getPool`이 export되지 않음. Step 2에서 db.ts 수정 필요.

- [ ] **Step 2: db.ts에 executeDml 함수 추가**

`src/lib/db.ts` 파일 끝에 추가:

```typescript
/**
 * DML(INSERT/UPDATE/DELETE) 실행 헬퍼. autoCommit 포함.
 * @param sql - 실행할 DML 문
 * @param binds - 바인드 변수
 */
export async function executeDml(
  sql: string,
  binds: oracledb.BindParameters = {},
): Promise<oracledb.Result<unknown>> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(sql, binds, { autoCommit: true });
    return result;
  } finally {
    await conn.close();
  }
}
```

그리고 `route.ts`에서 `executeDml` 임포트로 간소화:

```typescript
import { executeQuery, executeDml } from '@/lib/db';
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts src/app/api/display/20/route.ts
git commit -m "feat: 생산계획등록 CRUD API + db.ts executeDml 헬퍼 추가"
```

---

### Task 9: 생산계획등록 화면 컴포넌트

**Files:**
- Create: `src/components/display/screens/production-plan/ProductionPlanRegister.tsx`

- [ ] **Step 1: CRUD 폼 컴포넌트 작성**

```tsx
/**
 * @file ProductionPlanRegister.tsx
 * @description 생산계획등록 화면 (메뉴 20). CRUD 폼.
 * 초보자 가이드: 날짜/라인 선택 후 생산계획 정보를 입력하여 저장.
 * 등록된 계획 리스트를 테이블로 표시하고, 행 클릭으로 수정/삭제.
 */
'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import DisplayLayout from '../../DisplayLayout';
import { fetcher } from '@/lib/fetcher';
import { DEFAULT_ORG_ID, fmtNum } from '@/lib/display-helpers';

interface PlanRow {
  PLAN_DATE: string;
  LINE_CODE: string;
  LINE_NAME: string;
  SHIFT_CODE: string;
  MODEL_NAME: string | null;
  ITEM_CODE: string | null;
  UPH: number | null;
  PLAN_QTY: number | null;
  WORKER_QTY: number | null;
  COMMENTS: string | null;
  LEADER_ID: string | null;
  SUB_LEADER_ID: string | null;
  LEADER_NAME: string | null;
  SUB_LEADER_NAME: string | null;
}

const EMPTY_FORM = {
  planDate: new Date().toISOString().slice(0, 10),
  lineCode: '',
  shiftCode: 'A',
  modelName: '',
  itemCode: '',
  uph: '',
  planQty: '',
  workerQty: '',
  comments: '',
  leaderId: '',
  subLeaderId: '',
};

interface ProductionPlanRegisterProps {
  screenId: string;
}

export default function ProductionPlanRegister({ screenId }: ProductionPlanRegisterProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editMode, setEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const apiUrl = `/api/display/20?orgId=${DEFAULT_ORG_ID}&planDate=${selectedDate}`;
  const { data, isLoading } = useSWR(apiUrl, fetcher);
  const rows: PlanRow[] = data?.rows ?? [];

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = useCallback(async () => {
    const method = editMode ? 'PUT' : 'POST';
    const res = await fetch('/api/display/20', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        planQty: Number(form.planQty) || 0,
        uph: Number(form.uph) || null,
        workerQty: Number(form.workerQty) || null,
        orgId: Number(DEFAULT_ORG_ID),
        enterBy: 'ADMIN',
      }),
    });
    if (res.ok) {
      mutate(apiUrl);
      setForm(EMPTY_FORM);
      setEditMode(false);
    }
  }, [form, editMode, apiUrl]);

  const handleDelete = useCallback(async () => {
    if (!form.lineCode || !form.planDate) return;
    const res = await fetch(
      `/api/display/20?planDate=${form.planDate}&lineCode=${form.lineCode}&orgId=${DEFAULT_ORG_ID}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      mutate(apiUrl);
      setForm(EMPTY_FORM);
      setEditMode(false);
    }
  }, [form, apiUrl]);

  const handleRowClick = (row: PlanRow) => {
    const dateStr = typeof row.PLAN_DATE === 'string'
      ? row.PLAN_DATE.slice(0, 10)
      : new Date(row.PLAN_DATE).toISOString().slice(0, 10);
    setForm({
      planDate: dateStr,
      lineCode: row.LINE_CODE,
      shiftCode: row.SHIFT_CODE ?? 'A',
      modelName: row.MODEL_NAME ?? '',
      itemCode: row.ITEM_CODE ?? '',
      uph: row.UPH?.toString() ?? '',
      planQty: row.PLAN_QTY?.toString() ?? '',
      workerQty: row.WORKER_QTY?.toString() ?? '',
      comments: row.COMMENTS ?? '',
      leaderId: row.LEADER_ID ?? '',
      subLeaderId: row.SUB_LEADER_ID ?? '',
    });
    setEditMode(true);
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setEditMode(false);
  };

  return (
    <DisplayLayout screenId={screenId}>
      <div className="flex h-full flex-col gap-3 p-4 text-white">
        {/* 입력 폼 */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {editMode ? '계획 수정' : '신규 등록'}
            </h2>
            <div className="flex gap-2">
              <button onClick={handleNew} className="rounded bg-zinc-700 px-3 py-1 text-sm hover:bg-zinc-600">
                신규
              </button>
              <button onClick={handleSave} className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500">
                {editMode ? '수정' : '저장'}
              </button>
              {editMode && (
                <button onClick={handleDelete} className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-500">
                  삭제
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">계획일자</span>
              <input type="date" value={form.planDate} onChange={(e) => handleChange('planDate', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">라인코드</span>
              <input type="text" value={form.lineCode} onChange={(e) => handleChange('lineCode', e.target.value)}
                disabled={editMode}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white disabled:opacity-50" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">Shift</span>
              <select value={form.shiftCode} onChange={(e) => handleChange('shiftCode', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white">
                <option value="A">A (주간)</option>
                <option value="B">B (야간)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">모델명</span>
              <input type="text" value={form.modelName} onChange={(e) => handleChange('modelName', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">제품코드</span>
              <input type="text" value={form.itemCode} onChange={(e) => handleChange('itemCode', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">UPH</span>
              <input type="number" value={form.uph} onChange={(e) => handleChange('uph', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">계획수량</span>
              <input type="number" value={form.planQty} onChange={(e) => handleChange('planQty', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">작업인원</span>
              <input type="number" value={form.workerQty} onChange={(e) => handleChange('workerQty', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">리더 ID</span>
              <input type="text" value={form.leaderId} onChange={(e) => handleChange('leaderId', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400">부리더 ID</span>
              <input type="text" value={form.subLeaderId} onChange={(e) => handleChange('subLeaderId', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-zinc-400">NOTICE</span>
              <input type="text" value={form.comments} onChange={(e) => handleChange('comments', e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white" />
            </label>
          </div>
        </div>

        {/* 조회 날짜 필터 */}
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white" />
          <span className="text-sm text-zinc-400">등록된 계획: {rows.length}건</span>
        </div>

        {/* 계획 리스트 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-800 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">일자</th>
                <th className="px-3 py-2 text-left">라인</th>
                <th className="px-3 py-2 text-left">Shift</th>
                <th className="px-3 py-2 text-left">모델명</th>
                <th className="px-3 py-2 text-left">제품코드</th>
                <th className="px-3 py-2 text-right">UPH</th>
                <th className="px-3 py-2 text-right">계획수량</th>
                <th className="px-3 py-2 text-right">인원</th>
                <th className="px-3 py-2 text-left">리더</th>
                <th className="px-3 py-2 text-left">NOTICE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.PLAN_DATE}-${row.LINE_CODE}`}
                  onClick={() => handleRowClick(row)}
                  className={`cursor-pointer border-t border-zinc-800 hover:bg-zinc-800 ${i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40'}`}>
                  <td className="px-3 py-2">{typeof row.PLAN_DATE === 'string' ? row.PLAN_DATE.slice(0, 10) : ''}</td>
                  <td className="px-3 py-2">{row.LINE_NAME ?? row.LINE_CODE}</td>
                  <td className="px-3 py-2">{row.SHIFT_CODE}</td>
                  <td className="px-3 py-2">{row.MODEL_NAME ?? '-'}</td>
                  <td className="px-3 py-2 text-cyan-400">{row.ITEM_CODE ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{row.UPH ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(row.PLAN_QTY)}</td>
                  <td className="px-3 py-2 text-right">{row.WORKER_QTY ?? '-'}</td>
                  <td className="px-3 py-2">{row.LEADER_NAME ?? '-'}</td>
                  <td className="px-3 py-2 text-yellow-300">{row.COMMENTS ?? ''}</td>
                </tr>
              ))}
              {rows.length === 0 && !isLoading && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-zinc-500">등록된 계획이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DisplayLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/display/screens/production-plan/ProductionPlanRegister.tsx
git commit -m "feat: 생산계획등록 CRUD 폼 컴포넌트 (ProductionPlanRegister)"
```

---

### Task 10: page.tsx 라우터에 화면 20, 22, 23 연결

**Files:**
- Modify: `src/app/(display)/display/[screenId]/page.tsx`

- [ ] **Step 1: import 추가**

파일 상단 import 블록에 추가:

```typescript
import ProductIoStatus from '@/components/display/screens/product-io/ProductIoStatus';
import ProductionPlanRegister from '@/components/display/screens/production-plan/ProductionPlanRegister';
```

- [ ] **Step 2: screenId 분기 추가**

`if (screenId === '50')` 블록 다음, `return <DisplayLayout>` 전에 추가:

```typescript
if (screenId === '20') {
  return <ProductionPlanRegister screenId={screenId} />;
}

if (screenId === '22') {
  return <ProductIoStatus screenId={screenId} workstageCode="W310" />;
}

if (screenId === '23') {
  return <ProductIoStatus screenId={screenId} workstageCode="W220" />;
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add src/app/(display)/display/[screenId]/page.tsx
git commit -m "feat: page.tsx에 화면 20(생산계획), 22(투입), 23(포장) 라우팅 추가"
```
