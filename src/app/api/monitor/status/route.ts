/**
 * @file src/app/api/monitor/status/route.ts
 * @description GET /api/monitor/status — 백그라운드 잡 상태 + 최근 로그 반환
 *
 * 초보자 가이드:
 * - isRunning: 현재 setInterval이 돌고 있는지 여부
 * - lastRunAt: 마지막으로 runOnce()가 실행된 ISO 시각
 * - logs: 최근 20개 감지 로그
 * - envEnabled: CTQ_MONITOR_ENABLED 환경변수가 'true'인지 여부 (서버별 제어)
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
    envEnabled: process.env.CTQ_MONITOR_ENABLED === 'true',
  });
}
