/**
 * @file src/lib/monitor/monitor-state.ts
 * @description
 * CTQ 이상점 모니터 상태(이전 등급, 실행 로그)를 JSON 파일로 관리합니다.
 *
 * 초보자 가이드:
 * 1. prevGrades: 이전 실행의 라인+카테고리별 등급 — A 전환 감지에 사용
 * 2. logs: 최근 50개 실행 로그 (알림 발송 여부 포함)
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
