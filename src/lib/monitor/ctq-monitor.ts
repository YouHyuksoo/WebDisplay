/**
 * @file src/lib/monitor/ctq-monitor.ts
 * @description
 * CTQ 이상점 백그라운드 모니터 — 글로벌 싱글톤 JobManager.
 *
 * 초보자 가이드:
 * 1. globalThis.__ctqMonitorJob 에 단일 인스턴스 저장 (Next.js 핫리로드 대응)
 * 2. start(): setInterval 등록, stop(): clearInterval
 * 3. runOnce(): DB 조회 → A등급 감지 → OK→A 전환 시 Teams 알림
 * 4. 이전 등급은 monitor-state.json에 저장 (서버 재시작 후에도 유지)
 * 5. teamsEnabled + teamsWebhookUrl 모두 설정된 경우에만 알림 발송
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
        console.log('[Monitor] Teams 비활성화 또는 웹훅 URL 없음 — 알림 생략');
        return;
      }

      let state = await readMonitorState();
      const now = new Date().toISOString();
      this.lastRunAt = now;

      const categoryMap: Record<MonitorCategory, { enabled: boolean; checker: () => Promise<AGradeItem[]> }> = {
        repeatability:  { enabled: settings.monitorRepeatability,  checker: checkRepeatabilityAGrade },
        nonConsecutive: { enabled: settings.monitorNonConsecutive, checker: checkNonConsecutiveAGrade },
        accident:       { enabled: settings.monitorAccident,       checker: checkAccidentAGrade },
      };

      for (const [category, { enabled, checker }] of Object.entries(categoryMap) as [MonitorCategory, { enabled: boolean; checker: () => Promise<AGradeItem[]> }][]) {
        if (!enabled) continue;

        const aItems = await checker();
        const currentKeys = new Set(aItems.map((i) => `${i.lineCode}:${category}:${i.process}`));

        // OK → A 전환된 항목만 알림 (이미 A인 항목은 알림 생략)
        const newAItems = aItems.filter((item) => {
          const key = `${item.lineCode}:${category}:${item.process}`;
          return state.prevGrades[key] !== 'A';
        });

        // 등급 상태 업데이트
        for (const item of aItems) {
          state.prevGrades[`${item.lineCode}:${category}:${item.process}`] = 'A';
        }
        // 이전에 A였다가 해소된 항목 → OK 초기화
        for (const key of Object.keys(state.prevGrades)) {
          if (key.includes(`:${category}:`) && !currentKeys.has(key)) {
            state.prevGrades[key] = 'OK';
          }
        }

        let notified = false;
        if (newAItems.length > 0) {
          notified = await sendCtqAGradeAlert(category, newAItems, settings.teamsWebhookUrl);
        }

        // 로그 기록
        for (const item of aItems) {
          const key = `${item.lineCode}:${category}:${item.process}`;
          state = appendLog(state, {
            at: now,
            category,
            lineName: item.lineName,
            process: item.process,
            grade: 'A',
            notified: newAItems.some((n) => n.lineCode === item.lineCode && n.process === item.process) && notified,
          });
          // 처리 후 해당 키를 A로 확정 (appendLog가 state를 교체하므로 다시 설정)
          state.prevGrades[key] = 'A';
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
