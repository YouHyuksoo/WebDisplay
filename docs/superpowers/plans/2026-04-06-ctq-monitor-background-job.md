# CTQ A등급 이상점 백그라운드 모니터링 + Teams 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 반복성 / 연속반복성(비연속) / 사고성 이상점을 주기적으로 조회하여 A등급 라인이 감지되면 Teams(Power Automate)로 알림을 자동 발송하는 백그라운드 작업 및 UI 제어 메뉴를 구축한다.

**Architecture:** Next.js 모듈 스코프에 글로벌 싱글톤 `JobManager`를 두고 `setInterval`로 주기 실행. DB 조회는 기존 API route와 동일한 쿼리 함수를 직접 호출. 이전 실행의 등급 상태를 `data/monitor-state.json`에 저장하여 OK→A **전환 시점**에만 Teams 알림 발송 (중복 방지). UI는 기존 알림 설정 페이지(`/u1/slack-settings`) 하단에 "백그라운드 모니터" 섹션으로 추가.

**Tech Stack:** Next.js 15 App Router, TypeScript, node:fs/promises (상태 파일), fetch (Teams webhook), 기존 `executeQuery` / `getSettings` / `sendTeamsNotification` 재사용

---

## 파일 구조

### 신규 생성
| 파일 | 역할 |
|---|---|
| `src/lib/monitor/ctq-monitor.ts` | 글로벌 JobManager 싱글톤 — start/stop/runOnce 로직 |
| `src/lib/monitor/ctq-checker.ts` | 3개 카테고리 DB 조회 → A등급 라인 목록 반환 |
| `src/lib/monitor/monitor-state.ts` | `data/monitor-state.json` 읽기/쓰기 (이전 등급 상태 + 로그) |
| `src/app/api/monitor/status/route.ts` | GET — 잡 상태, 마지막 실행 시간, 최근 로그 반환 |
| `src/app/api/monitor/start/route.ts` | POST — 잡 시작 |
| `src/app/api/monitor/stop/route.ts` | POST — 잡 정지 |
| `src/app/api/monitor/run-now/route.ts` | POST — 즉시 1회 실행 (테스트용) |
| `src/components/u1/slack/MonitorJobSection.tsx` | 백그라운드 모니터 UI 컴포넌트 |

### 수정
| 파일 | 변경 내용 |
|---|---|
| `src/lib/slack-settings.ts` | 모니터 설정 필드 추가 (enabled, interval, 3개 카테고리 토글) |
| `data/slack-settings.json` | 새 필드 기본값 추가 |
| `src/app/api/slack-settings/route.ts` | 새 필드 처리 확인 (pass-through 방식이면 수정 불필요) |
| `src/app/(u1)/u1/slack-settings/page.tsx` | MonitorJobSection 추가, settings 타입 확장 |
| `src/lib/teams.ts` | CTQ A등급 전용 Teams 페이로드 빌더 추가 |

---

## Task 1: 설정 타입 확장 + monitor-state 유틸

**Files:**
- Modify: `src/lib/slack-settings.ts`
- Create: `src/lib/monitor/monitor-state.ts`

- [ ] **Step 1: slack-settings.ts 타입에 모니터 필드 추가**

`SlackSettings` 인터페이스 마지막 Teams 섹션 아래에 추가:

```typescript
// --- 백그라운드 모니터 설정 ---
/** 이상점 백그라운드 모니터 ON/OFF */
monitorEnabled: boolean;
/** 검사 주기 (분, 최소 1) */
monitorIntervalMinutes: number;
/** 반복성(연속동일위치) 모니터링 여부 */
monitorRepeatability: boolean;
/** 연속반복성(비연속동일위치) 모니터링 여부 */
monitorNonConsecutive: boolean;
/** 사고성 모니터링 여부 */
monitorAccident: boolean;
```

`DEFAULT_SETTINGS`에 기본값 추가:

```typescript
monitorEnabled: false,
monitorIntervalMinutes: 5,
monitorRepeatability: true,
monitorNonConsecutive: true,
monitorAccident: true,
```

- [ ] **Step 2: monitor-state.ts 파일 생성**

```typescript
/**
 * @file src/lib/monitor/monitor-state.ts
 * @description
 * CTQ 이상점 모니터 상태(이전 등급, 실행 로그)를 JSON 파일로 관리합니다.
 *
 * 초보자 가이드:
 * 1. prevGrades: 이전 실행의 라인+카테고리별 등급 — A 전환 감지에 사용
 * 2. logs: 최근 20개 실행 로그 (알림 발송 여부 포함)
 * 3. lastRunAt: 마지막 실행 ISO 시각
 */

import fs from 'fs/promises';
import path from 'path';

/** 카테고리 타입 */
export type MonitorCategory = 'repeatability' | 'nonConsecutive' | 'accident';

/** 라인+카테고리별 등급 키: "lineCode:category:process" */
export type GradeKey = string;

/** 모니터 로그 항목 */
export interface MonitorLog {
  at: string;           // ISO 시각
  category: MonitorCategory;
  lineName: string;
  process: string;
  grade: 'A' | 'B' | 'OK';
  notified: boolean;    // Teams 알림 발송 여부
}

/** 저장 상태 구조 */
export interface MonitorState {
  lastRunAt: string | null;
  prevGrades: Record<GradeKey, string>;  // "OK" | "A" | "B"
  logs: MonitorLog[];
}

const STATE_PATH = path.join(process.cwd(), 'data', 'monitor-state.json');
const MAX_LOGS = 50;

const DEFAULT_STATE: MonitorState = {
  lastRunAt: null,
  prevGrades: {},
  logs: [],
};

/** 상태 읽기 */
export async function readMonitorState(): Promise<MonitorState> {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/** 상태 저장 */
export async function writeMonitorState(state: MonitorState): Promise<void> {
  const dir = path.dirname(STATE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

/** 로그 추가 (최대 MAX_LOGS 유지) */
export function appendLog(state: MonitorState, log: MonitorLog): MonitorState {
  const logs = [log, ...state.logs].slice(0, MAX_LOGS);
  return { ...state, logs };
}
```

- [ ] **Step 3: data/slack-settings.json 새 필드 추가**

기존 파일 내용을 읽고 모니터 필드를 추가:

```json
{
  "...기존 필드...",
  "monitorEnabled": false,
  "monitorIntervalMinutes": 5,
  "monitorRepeatability": true,
  "monitorNonConsecutive": true,
  "monitorAccident": true
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/slack-settings.ts src/lib/monitor/monitor-state.ts data/slack-settings.json
git commit -m "feat: CTQ 모니터 설정 타입 + 상태 파일 유틸 추가"
```

---

## Task 2: CTQ DB 조회 로직 (ctq-checker.ts)

**Files:**
- Create: `src/lib/monitor/ctq-checker.ts`

이 파일은 기존 API route들의 DB 조회 로직을 **함수**로 추출해서 재사용한다. 기존 route.ts 파일은 수정하지 않는다.

- [ ] **Step 1: ctq-checker.ts 생성**

```typescript
/**
 * @file src/lib/monitor/ctq-checker.ts
 * @description
 * CTQ 이상점 모니터링 — A등급 라인 조회 함수 모음.
 *
 * 초보자 가이드:
 * - 기존 API route들과 동일한 DB 쿼리를 사용하되, HTTP 없이 직접 호출
 * - 반환값은 A등급인 라인/공정 목록만 (B, OK 제외)
 * - getVietnamTimeRange(): 오늘 08:00 ~ 내일 08:00 (베트남 시간 기준)
 */

import { executeQuery } from '@/lib/db';
import { getVietnamTimeRange } from '@/lib/ctq/line-filter';

export interface AGradeItem {
  lineCode: string;
  lineName: string;
  process: string;
  ngCount: number;
}

/** 반복성 A등급 라인+공정 조회 (연속 동일위치 NG) */
export async function checkRepeatabilityAGrade(): Promise<AGradeItem[]> {
  const { startStr, endStr } = getVietnamTimeRange();
  const results: AGradeItem[] = [];

  // FT 공정
  const ftSql = `
    SELECT L.LINE_CODE, L.LINE_NAME, 'FT' AS PROCESS,
           COUNT(*) AS NG_COUNT
    FROM (
      SELECT T.LINE_CODE, T.PID, T.LOCATION_CODE,
             LAG(T.LOCATION_CODE) OVER (PARTITION BY T.LINE_CODE ORDER BY T.INSPECT_DATE) AS PREV_LOC
      FROM IP_PRODUCT_INSPECT_FT T
      WHERE T.INSPECT_DATE >= :startStr
        AND T.INSPECT_DATE <  :endStr
        AND T.INSPECT_RESULT = 'NG'
        AND (T.QC_CONFIRM_YN IS NULL OR T.QC_CONFIRM_YN <> 'Y')
    ) X
    JOIN IP_LINE L ON L.LINE_CODE = X.LINE_CODE
    WHERE X.LOCATION_CODE IS NOT NULL
      AND X.LOCATION_CODE = X.PREV_LOC
    GROUP BY L.LINE_CODE, L.LINE_NAME
    HAVING COUNT(*) >= 1
  `;

  // ATE 공정
  const ateSql = `
    SELECT L.LINE_CODE, L.LINE_NAME, 'ATE' AS PROCESS,
           COUNT(*) AS NG_COUNT
    FROM (
      SELECT T.LINE_CODE, T.PID, T.LOCATION_CODE,
             LAG(T.LOCATION_CODE) OVER (PARTITION BY T.LINE_CODE ORDER BY T.INSPECT_DATE) AS PREV_LOC
      FROM IP_PRODUCT_INSPECT_ATE T
      WHERE T.INSPECT_DATE >= :startStr
        AND T.INSPECT_DATE <  :endStr
        AND T.INSPECT_RESULT = 'NG'
        AND (T.QC_CONFIRM_YN IS NULL OR T.QC_CONFIRM_YN <> 'Y')
    ) X
    JOIN IP_LINE L ON L.LINE_CODE = X.LINE_CODE
    WHERE X.LOCATION_CODE IS NOT NULL
      AND X.LOCATION_CODE = X.PREV_LOC
    GROUP BY L.LINE_CODE, L.LINE_NAME
    HAVING COUNT(*) >= 1
  `;

  try {
    const [ftRows, ateRows] = await Promise.all([
      executeQuery<{ LINE_CODE: string; LINE_NAME: string; PROCESS: string; NG_COUNT: number }>(
        ftSql, { startStr, endStr }
      ),
      executeQuery<{ LINE_CODE: string; LINE_NAME: string; PROCESS: string; NG_COUNT: number }>(
        ateSql, { startStr, endStr }
      ),
    ]);
    for (const r of [...ftRows, ...ateRows]) {
      results.push({ lineCode: r.LINE_CODE, lineName: r.LINE_NAME, process: r.PROCESS, ngCount: r.NG_COUNT });
    }
  } catch (e) {
    console.error('[Monitor] 반복성 조회 오류:', e);
  }
  return results;
}

/** 사고성 A등급 라인+공정 조회 */
export async function checkAccidentAGrade(): Promise<AGradeItem[]> {
  const { startStr, endStr } = getVietnamTimeRange();
  const results: AGradeItem[] = [];

  // HIPOT: 판정완료 1건 이상 → A
  const hipotSql = `
    SELECT L.LINE_CODE, L.LINE_NAME, 'HIPOT' AS PROCESS, COUNT(*) AS NG_COUNT
    FROM IP_PRODUCT_INSPECT_HIPOT T
    JOIN IP_LINE L ON L.LINE_CODE = T.LINE_CODE
    JOIN IP_PRODUCT_WORK_QC Q ON Q.PID = T.PID AND Q.INSPECT_TYPE = 'HIPOT'
    WHERE T.INSPECT_DATE >= :startStr
      AND T.INSPECT_DATE <  :endStr
      AND T.INSPECT_RESULT = 'NG'
      AND Q.REPAIR_RESULT IS NOT NULL
      AND (T.QC_CONFIRM_YN IS NULL OR T.QC_CONFIRM_YN <> 'Y')
    GROUP BY L.LINE_CODE, L.LINE_NAME
    HAVING COUNT(*) >= 1
  `;

  // ATE: 판정완료 2건 이상 → A
  const ateSql = `
    SELECT L.LINE_CODE, L.LINE_NAME, 'ATE' AS PROCESS, COUNT(*) AS NG_COUNT
    FROM IP_PRODUCT_INSPECT_ATE T
    JOIN IP_LINE L ON L.LINE_CODE = T.LINE_CODE
    JOIN IP_PRODUCT_WORK_QC Q ON Q.PID = T.PID AND Q.INSPECT_TYPE = 'ATE'
    WHERE T.INSPECT_DATE >= :startStr
      AND T.INSPECT_DATE <  :endStr
      AND T.INSPECT_RESULT = 'NG'
      AND Q.REPAIR_RESULT IS NOT NULL
      AND (T.QC_CONFIRM_YN IS NULL OR T.QC_CONFIRM_YN <> 'Y')
    GROUP BY L.LINE_CODE, L.LINE_NAME
    HAVING COUNT(*) >= 2
  `;

  try {
    const [hipotRows, ateRows] = await Promise.all([
      executeQuery<{ LINE_CODE: string; LINE_NAME: string; PROCESS: string; NG_COUNT: number }>(
        hipotSql, { startStr, endStr }
      ),
      executeQuery<{ LINE_CODE: string; LINE_NAME: string; PROCESS: string; NG_COUNT: number }>(
        ateSql, { startStr, endStr }
      ),
    ]);
    for (const r of [...hipotRows, ...ateRows]) {
      results.push({ lineCode: r.LINE_CODE, lineName: r.LINE_NAME, process: r.PROCESS, ngCount: r.NG_COUNT });
    }
  } catch (e) {
    console.error('[Monitor] 사고성 조회 오류:', e);
  }
  return results;
}

/** 연속반복성(비연속) — B급만 존재하므로 모니터 대상 없음, 빈 배열 반환 */
export async function checkNonConsecutiveAGrade(): Promise<AGradeItem[]> {
  // 비연속은 최고 등급이 B급 → A등급 알림 없음
  return [];
}
```

> **참고**: 실제 SQL은 기존 route.ts의 쿼리와 정확히 일치해야 합니다. 기존 route를 먼저 읽고 SQL을 복사해서 사용하세요. 위 SQL은 구조 예시입니다.

- [ ] **Step 2: 커밋**

```bash
git add src/lib/monitor/ctq-checker.ts
git commit -m "feat: CTQ A등급 DB 조회 함수 (monitor용)"
```

---

## Task 3: Teams 페이로드 + JobManager 싱글톤

**Files:**
- Modify: `src/lib/teams.ts`
- Create: `src/lib/monitor/ctq-monitor.ts`

- [ ] **Step 1: teams.ts에 CTQ A등급 알림 함수 추가**

`teams.ts` 파일 맨 아래에 추가:

```typescript
/**
 * CTQ A등급 이상점 Teams 알림 전송
 * @param category - 'repeatability' | 'nonConsecutive' | 'accident'
 * @param items - A등급 라인 목록
 * @param webhookUrl - Teams 웹훅 URL
 */
export async function sendCtqAGradeAlert(
  category: 'repeatability' | 'nonConsecutive' | 'accident',
  items: Array<{ lineCode: string; lineName: string; process: string; ngCount: number }>,
  webhookUrl: string
): Promise<boolean> {
  const categoryLabel: Record<string, string> = {
    repeatability: '반복성 (연속동일위치)',
    nonConsecutive: '연속반복성 (비연속동일위치)',
    accident: '사고성',
  };

  const facts = items.map((item) => ({
    name: `${item.lineName} [${item.process}]`,
    value: `A등급 — NG ${item.ngCount}건`,
  }));
  facts.push({ name: '발생시간', value: new Date().toLocaleString('ko-KR') });

  const payload = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: 'ef4444',
    summary: `[CTQ A등급] ${categoryLabel[category]} — ${items.length}개 라인`,
    sections: [
      {
        activityTitle: `🚨 CTQ 이상점 A등급 감지: ${categoryLabel[category]}`,
        activityText: `**${items.length}개 라인**에서 A등급 이상점이 감지되었습니다.`,
        facts,
        markdown: true,
      },
    ],
  };

  return postToTeams(webhookUrl, payload);
}
```

- [ ] **Step 2: ctq-monitor.ts (JobManager 싱글톤) 생성**

```typescript
/**
 * @file src/lib/monitor/ctq-monitor.ts
 * @description
 * CTQ 이상점 백그라운드 모니터 — 글로벌 싱글톤 JobManager.
 *
 * 초보자 가이드:
 * 1. globalThis.__ctqMonitor 에 단일 인스턴스 저장 (Next.js 핫리로드 대응)
 * 2. start(): setInterval 등록, stop(): clearInterval
 * 3. runOnce(): DB 조회 → A등급 감지 → OK→A 전환 시 Teams 알림
 * 4. 이전 등급은 monitor-state.json에 저장 (서버 재시작 후에도 유지)
 */

import { getSettings } from '@/lib/slack-settings';
import { sendCtqAGradeAlert } from '@/lib/teams';
import {
  checkRepeatabilityAGrade,
  checkNonConsecutiveAGrade,
  checkAccidentAGrade,
  type AGradeItem,
} from './ctq-checker';
import {
  readMonitorState,
  writeMonitorState,
  appendLog,
  type MonitorCategory,
} from './monitor-state';

interface JobManager {
  isRunning: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  lastRunAt: string | null;
  start(intervalMinutes: number): void;
  stop(): void;
  runOnce(): Promise<void>;
}

/** 글로벌 싱글톤 키 */
const GLOBAL_KEY = '__ctqMonitorJob';

function createJobManager(): JobManager {
  return {
    isRunning: false,
    intervalId: null,
    lastRunAt: null,

    start(intervalMinutes: number) {
      if (this.isRunning) return;
      const ms = Math.max(1, intervalMinutes) * 60 * 1000;
      this.isRunning = true;
      // 즉시 1회 실행
      this.runOnce();
      this.intervalId = setInterval(() => this.runOnce(), ms);
      console.log(`[Monitor] 시작 — ${intervalMinutes}분 주기`);
    },

    stop() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('[Monitor] 정지');
    },

    async runOnce() {
      const settings = await getSettings();
      if (!settings.teamsEnabled || !settings.teamsWebhookUrl) {
        console.log('[Monitor] Teams 비활성화 — 알림 생략');
        return;
      }

      let state = await readMonitorState();
      const now = new Date().toISOString();
      this.lastRunAt = now;

      const categoryMap: Record<MonitorCategory, { enabled: boolean; checker: () => Promise<AGradeItem[]> }> = {
        repeatability:    { enabled: settings.monitorRepeatability,    checker: checkRepeatabilityAGrade },
        nonConsecutive:   { enabled: settings.monitorNonConsecutive,   checker: checkNonConsecutiveAGrade },
        accident:         { enabled: settings.monitorAccident,         checker: checkAccidentAGrade },
      };

      for (const [category, { enabled, checker }] of Object.entries(categoryMap) as [MonitorCategory, { enabled: boolean; checker: () => Promise<AGradeItem[]> }][]) {
        if (!enabled) continue;

        const aItems = await checker();

        // 현재 실행에서 감지된 키 Set
        const currentKeys = new Set(aItems.map((i) => `${i.lineCode}:${category}:${i.process}`));

        // OK → A 전환된 항목만 필터링
        const newAItems = aItems.filter((item) => {
          const key = `${item.lineCode}:${category}:${item.process}`;
          return state.prevGrades[key] !== 'A';
        });

        // 이전 상태 업데이트: 현재 A인 것만 A로, 나머지는 OK
        for (const item of aItems) {
          const key = `${item.lineCode}:${category}:${item.process}`;
          state.prevGrades[key] = 'A';
        }
        // 이전에 A였다가 지금은 목록에 없는 항목 → OK로 초기화
        for (const key of Object.keys(state.prevGrades)) {
          if (key.includes(`:${category}:`) && !currentKeys.has(key)) {
            state.prevGrades[key] = 'OK';
          }
        }

        // 새로 A가 된 항목이 있으면 Teams 알림 발송
        let notified = false;
        if (newAItems.length > 0) {
          notified = await sendCtqAGradeAlert(
            category,
            newAItems,
            settings.teamsWebhookUrl
          );
        }

        // 로그 기록
        for (const item of aItems) {
          state = appendLog(state, {
            at: now,
            category,
            lineName: item.lineName,
            process: item.process,
            grade: 'A',
            notified: newAItems.some((n) => n.lineCode === item.lineCode && n.process === item.process) && notified,
          });
        }
      }

      state.lastRunAt = now;
      await writeMonitorState(state);
    },
  };
}

/** 글로벌 싱글톤 반환 */
export function getJobManager(): JobManager {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createJobManager();
  }
  return g[GLOBAL_KEY] as JobManager;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/teams.ts src/lib/monitor/ctq-monitor.ts
git commit -m "feat: CTQ A등급 Teams 페이로드 + JobManager 싱글톤"
```

---

## Task 4: 모니터 API Routes (status / start / stop / run-now)

**Files:**
- Create: `src/app/api/monitor/status/route.ts`
- Create: `src/app/api/monitor/start/route.ts`
- Create: `src/app/api/monitor/stop/route.ts`
- Create: `src/app/api/monitor/run-now/route.ts`

- [ ] **Step 1: status route 생성**

```typescript
// src/app/api/monitor/status/route.ts
/**
 * @file src/app/api/monitor/status/route.ts
 * @description GET /api/monitor/status — 백그라운드 잡 상태 + 최근 로그 반환
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';
import { readMonitorState } from '@/lib/monitor/monitor-state';

export const dynamic = 'force-dynamic';

export async function GET() {
  const job = getJobManager();
  const state = await readMonitorState();
  return NextResponse.json({
    isRunning: job.isRunning,
    lastRunAt: job.lastRunAt ?? state.lastRunAt,
    logs: state.logs.slice(0, 20),
  });
}
```

- [ ] **Step 2: start route 생성**

```typescript
// src/app/api/monitor/start/route.ts
/**
 * @file src/app/api/monitor/start/route.ts
 * @description POST /api/monitor/start — 백그라운드 잡 시작
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';
import { getSettings, saveSettings } from '@/lib/slack-settings';

export async function POST() {
  const settings = await getSettings();
  // 설정에서 enabled 플래그 저장
  await saveSettings({ ...settings, monitorEnabled: true });

  const job = getJobManager();
  job.start(settings.monitorIntervalMinutes);

  return NextResponse.json({ ok: true, isRunning: job.isRunning });
}
```

- [ ] **Step 3: stop route 생성**

```typescript
// src/app/api/monitor/stop/route.ts
/**
 * @file src/app/api/monitor/stop/route.ts
 * @description POST /api/monitor/stop — 백그라운드 잡 정지
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';
import { getSettings, saveSettings } from '@/lib/slack-settings';

export async function POST() {
  const settings = await getSettings();
  await saveSettings({ ...settings, monitorEnabled: false });

  const job = getJobManager();
  job.stop();

  return NextResponse.json({ ok: true, isRunning: false });
}
```

- [ ] **Step 4: run-now route 생성**

```typescript
// src/app/api/monitor/run-now/route.ts
/**
 * @file src/app/api/monitor/run-now/route.ts
 * @description POST /api/monitor/run-now — 즉시 1회 실행 (테스트용)
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';
import { readMonitorState } from '@/lib/monitor/monitor-state';

export async function POST() {
  const job = getJobManager();
  await job.runOnce();
  const state = await readMonitorState();
  return NextResponse.json({
    ok: true,
    lastRunAt: state.lastRunAt,
    logs: state.logs.slice(0, 5),
  });
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/monitor/
git commit -m "feat: 모니터 API routes — status/start/stop/run-now"
```

---

## Task 5: MonitorJobSection UI 컴포넌트

**Files:**
- Create: `src/components/u1/slack/MonitorJobSection.tsx`

- [ ] **Step 1: MonitorJobSection.tsx 생성**

```typescript
/**
 * @file src/components/u1/slack/MonitorJobSection.tsx
 * @description
 * CTQ 이상점 백그라운드 모니터 제어 UI 컴포넌트.
 *
 * 초보자 가이드:
 * 1. 잡 상태(실행중/정지) 표시 + 시작/정지 버튼
 * 2. 주기(분) 설정 입력
 * 3. 3개 카테고리 개별 ON/OFF 토글
 * 4. 즉시 실행 버튼 (테스트용)
 * 5. 최근 알림 로그 목록
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SlackSettings } from '@/app/(u1)/u1/slack-settings/page';
import type { MonitorLog } from '@/lib/monitor/monitor-state';

interface MonitorStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  logs: MonitorLog[];
}

interface MonitorJobSectionProps {
  settings: SlackSettings;
  onSettingsChange: (field: keyof SlackSettings, value: unknown) => void;
}

const CATEGORY_ITEMS = [
  { field: 'monitorRepeatability' as keyof SlackSettings, label: '반복성', desc: '연속 동일위치 NG (FT/ATE)' },
  { field: 'monitorNonConsecutive' as keyof SlackSettings, label: '연속반복성', desc: '비연속 동일위치 NG (FT/ATE)' },
  { field: 'monitorAccident' as keyof SlackSettings, label: '사고성', desc: 'HIPOT/BURNIN/ATE 판정 NG' },
] as const;

export default function MonitorJobSection({ settings, onSettingsChange }: MonitorJobSectionProps) {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/status');
      if (res.ok) setStatus(await res.json());
    } catch { /* 무시 */ }
  }, []);

  // 최초 로드 + 30초마다 상태 갱신
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // 상태 메시지 자동 제거
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(null), 4000);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/monitor/start', { method: 'POST' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '백그라운드 모니터를 시작했습니다.' });
        await fetchStatus();
      } else {
        setStatusMsg({ type: 'error', text: '시작에 실패했습니다.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const res = await fetch('/api/monitor/stop', { method: 'POST' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '백그라운드 모니터를 정지했습니다.' });
        await fetchStatus();
      } else {
        setStatusMsg({ type: 'error', text: '정지에 실패했습니다.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsStopping(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      const res = await fetch('/api/monitor/run-now', { method: 'POST' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '즉시 실행 완료. 로그를 확인하세요.' });
        await fetchStatus();
      } else {
        setStatusMsg({ type: 'error', text: '즉시 실행에 실패했습니다.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsRunningNow(false);
    }
  };

  const isRunning = status?.isRunning ?? false;

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-gray-200 font-semibold flex items-center gap-2">
          <span className="text-orange-400">⚙️</span>
          CTQ 이상점 백그라운드 모니터
        </h3>
        {/* 실행 상태 배지 */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          isRunning ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
        }`}>
          {isRunning ? '● 실행중' : '○ 정지'}
        </span>
      </div>

      <p className="text-gray-500 text-sm">
        A등급 이상점 감지 시 Teams 알림을 자동으로 발송합니다.
        OK→A 전환 시점에만 알림을 보내 중복 발송을 방지합니다.
      </p>

      {/* 상태 메시지 */}
      {statusMsg && (
        <div className={`px-3 py-2 rounded-lg text-sm ${
          statusMsg.type === 'success'
            ? 'bg-green-900/50 text-green-300 border border-green-700'
            : 'bg-red-900/50 text-red-300 border border-red-700'
        }`}>
          {statusMsg.type === 'success' ? '✅ ' : '❌ '}{statusMsg.text}
        </div>
      )}

      {/* 검사 주기 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          검사 주기 (분)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={settings.monitorIntervalMinutes}
          onChange={(e) => onSettingsChange('monitorIntervalMinutes', Number(e.target.value))}
          className="w-28 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">설정 저장 후 재시작하면 반영됩니다</p>
      </div>

      {/* 카테고리 토글 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">모니터링 대상</p>
        {CATEGORY_ITEMS.map((item) => (
          <label
            key={item.field}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <div>
              <p className="text-gray-200 text-sm font-medium">{item.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => onSettingsChange(item.field, !settings[item.field])}
              className={`relative w-10 h-5 rounded-full overflow-hidden transition-colors focus:outline-none flex-shrink-0 ${
                settings[item.field] ? 'bg-orange-500' : 'bg-gray-600'
              }`}
              type="button"
            >
              <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings[item.field] ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        ))}
      </div>

      {/* 제어 버튼 */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isStarting ? '⏳ 시작 중...' : '▶ 모니터 시작'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isStopping}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isStopping ? '⏳ 정지 중...' : '■ 모니터 정지'}
          </button>
        )}
        <button
          onClick={handleRunNow}
          disabled={isRunningNow}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-600"
        >
          {isRunningNow ? '⏳ 실행 중...' : '⚡ 즉시 실행'}
        </button>
      </div>

      {/* 마지막 실행 시간 */}
      {status?.lastRunAt && (
        <p className="text-xs text-gray-500">
          마지막 실행: {new Date(status.lastRunAt).toLocaleString('ko-KR')}
        </p>
      )}

      {/* 최근 로그 */}
      {status?.logs && status.logs.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">최근 감지 로그</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {status.logs.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-800 text-xs"
              >
                <span className="text-red-400 font-bold">A</span>
                <span className="text-gray-300">{log.lineName}</span>
                <span className="text-gray-500">[{log.process}]</span>
                <span className={`ml-auto ${log.notified ? 'text-green-400' : 'text-gray-600'}`}>
                  {log.notified ? '📨 전송' : '—'}
                </span>
                <span className="text-gray-600">
                  {new Date(log.at).toLocaleTimeString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/u1/slack/MonitorJobSection.tsx
git commit -m "feat: MonitorJobSection UI 컴포넌트"
```

---

## Task 6: 알림 설정 페이지에 통합

**Files:**
- Modify: `src/app/(u1)/u1/slack-settings/page.tsx`

- [ ] **Step 1: SlackSettings 타입에 모니터 필드 추가**

`page.tsx`의 `SlackSettings` 인터페이스 마지막에 추가:

```typescript
// --- 백그라운드 모니터 ---
monitorEnabled: boolean;
monitorIntervalMinutes: number;
monitorRepeatability: boolean;
monitorNonConsecutive: boolean;
monitorAccident: boolean;
```

`DEFAULT_SETTINGS`에도 추가:

```typescript
monitorEnabled: false,
monitorIntervalMinutes: 5,
monitorRepeatability: true,
monitorNonConsecutive: true,
monitorAccident: true,
```

- [ ] **Step 2: MonitorJobSection import 및 렌더링 추가**

상단 import에 추가:

```typescript
import MonitorJobSection from '@/components/u1/slack/MonitorJobSection';
```

저장 버튼 바로 위, `SlackAdvancedSection` 아래에 추가:

```tsx
{/* 백그라운드 모니터 섹션 */}
<MonitorJobSection
  settings={settings}
  onSettingsChange={(field, value) =>
    setSettings((prev) => ({ ...prev, [field]: value }))
  }
/>
```

- [ ] **Step 3: 서버 재시작 후 동작 확인**

```bash
# 브라우저에서 /u1/slack-settings 접속
# 1. "설정 저장" 클릭 (새 필드 저장)
# 2. "▶ 모니터 시작" 클릭 → 상태 배지가 "● 실행중"으로 변경 확인
# 3. "⚡ 즉시 실행" 클릭 → 로그 영역에 결과 표시 확인
# 4. Teams 채널에 테스트 메시지 도착 확인
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/(u1)/u1/slack-settings/page.tsx
git commit -m "feat: 알림 설정 페이지에 CTQ 백그라운드 모니터 섹션 통합"
```

---

## Task 7: 서버별 환경변수 게이트 + instrumentation.ts 자동 재개

**Files:**
- Modify: `.env.local`
- Create: `src/instrumentation.ts`

> `.env.local`의 `CTQ_MONITOR_ENABLED` 환경변수가 **최우선 게이트**입니다.
> 서버마다 이 파일이 다르게 배포되므로, 알림이 필요한 서버에만 `true`로 설정합니다.
> 환경변수가 `true`인 서버에서만 `instrumentation.ts`가 잡을 기동합니다.
> UI의 `monitorEnabled` 토글은 2차 제어 — 환경변수가 `false`면 UI에서 켜도 무시됩니다.

- [ ] **Step 1: .env.local에 환경변수 추가**

알림이 필요한 서버의 `.env.local`:
```bash
# 기존 DB 설정 아래에 추가
CTQ_MONITOR_ENABLED=true
```

알림이 불필요한 서버의 `.env.local`:
```bash
CTQ_MONITOR_ENABLED=false
# 또는 이 줄 자체를 생략 (없으면 false로 처리)
```

- [ ] **Step 2: src/instrumentation.ts 생성**

```typescript
/**
 * @file src/instrumentation.ts
 * @description
 * Next.js 서버 초기화 훅 (공식 지원, Next.js 15 기본 지원).
 * 서버 기동 시 1회 자동 실행 — CTQ 모니터 잡 조건부 재개.
 *
 * 초보자 가이드:
 * - CTQ_MONITOR_ENABLED=true (.env.local) 인 서버에서만 잡이 시작됨
 * - 환경변수가 없거나 false면 아무것도 하지 않음 (완전 차단)
 * - NEXT_RUNTIME === 'nodejs' 조건 필수: Edge 런타임에서는 실행하지 않음
 * - 설정 페이지 접속 없이도 서버 기동 즉시 잡이 재개됨
 *
 * 서버별 설정 위치: 프로젝트 루트 .env.local
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // 환경변수가 'true'가 아니면 이 서버는 모니터링 대상 아님
  if (process.env.CTQ_MONITOR_ENABLED !== 'true') {
    console.log('[instrumentation] CTQ 모니터 비활성화 (CTQ_MONITOR_ENABLED != true)');
    return;
  }

  try {
    const { getJobManager } = await import('@/lib/monitor/ctq-monitor');
    const { getSettings } = await import('@/lib/slack-settings');

    const settings = await getSettings();
    if (settings.monitorEnabled) {
      getJobManager().start(settings.monitorIntervalMinutes);
      console.log('[instrumentation] CTQ 모니터 잡 자동 재개');
    } else {
      console.log('[instrumentation] CTQ 모니터 대기 (UI에서 비활성화됨)');
    }
  } catch (e) {
    console.error('[instrumentation] CTQ 모니터 초기화 실패:', e);
  }
}
```

- [ ] **Step 3: MonitorJobSection UI에서 환경변수 비활성 표시**

`/api/monitor/status` 응답에 `envEnabled` 필드 추가 (`src/app/api/monitor/status/route.ts`):

```typescript
export async function GET() {
  const job = getJobManager();
  const state = await readMonitorState();
  return NextResponse.json({
    isRunning: job.isRunning,
    lastRunAt: job.lastRunAt ?? state.lastRunAt,
    logs: state.logs.slice(0, 20),
    envEnabled: process.env.CTQ_MONITOR_ENABLED === 'true',  // 추가
  });
}
```

`MonitorJobSection.tsx`에서 `envEnabled`가 `false`이면 비활성 배너 표시:

```tsx
{!status?.envEnabled && (
  <div className="px-3 py-2 rounded-lg bg-yellow-900/40 text-yellow-300 border border-yellow-700 text-xs">
    ⚠️ 이 서버는 CTQ_MONITOR_ENABLED=false — 모니터링이 비활성화된 서버입니다.
  </div>
)}
```

- [ ] **Step 4: 동작 확인**

```bash
# npm run dev 재시작 후 콘솔 확인:
# CTQ_MONITOR_ENABLED=true인 경우:
#   [instrumentation] CTQ 모니터 잡 자동 재개
#   [Monitor] 시작 — 5분 주기
#
# CTQ_MONITOR_ENABLED=false 또는 없는 경우:
#   [instrumentation] CTQ 모니터 비활성화 (CTQ_MONITOR_ENABLED != true)
```

- [ ] **Step 5: 최종 커밋**

```bash
git add src/instrumentation.ts src/app/api/monitor/status/route.ts src/components/u1/slack/MonitorJobSection.tsx
git commit -m "feat: .env.local 환경변수로 서버별 CTQ 모니터 게이트 제어"
```

---

## 자가 검토

**Spec 커버리지:**
- ✅ 반복성 A등급 감지 → Teams 알림
- ✅ 연속반복성(비연속) — B급만 존재, A등급 없음 → checker가 빈 배열 반환
- ✅ 사고성 A등급 감지 → Teams 알림
- ✅ 중복 알림 방지 (OK→A 전환 시점만)
- ✅ 백그라운드 잡 시작/정지 UI
- ✅ 검사 주기 설정
- ✅ 즉시 실행 (테스트)
- ✅ 최근 로그 표시
- ✅ 알림 설정 페이지 통합

**주의사항:**
- Task 2의 SQL은 기존 route.ts SQL을 반드시 직접 참조하여 정확히 복사할 것
- `monitorNonConsecutive`는 현재 A등급이 없으므로 알림이 발송되지 않음 (향후 B→A 기준 추가 가능)
- Next.js dev 모드에서는 핫리로드 시 글로벌 상태가 초기화될 수 있음 (prod에서는 안정적)
