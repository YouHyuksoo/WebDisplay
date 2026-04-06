/**
 * @file src/app/api/monitor/run-now/route.ts
 * @description POST /api/monitor/run-now — 즉시 1회 실행 (테스트/수동 트리거용)
 *
 * 초보자 가이드:
 * - 잡이 정지 상태여도 1회 실행 가능
 * - 결과는 monitor-state.json에 저장되며 로그에서 확인 가능
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
