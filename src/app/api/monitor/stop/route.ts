/**
 * @file src/app/api/monitor/stop/route.ts
 * @description POST /api/monitor/stop — 백그라운드 잡 런타임 정지
 *
 * 초보자 가이드:
 * - 런타임 중 임시 정지용 (서버 재시작 시 CTQ_MONITOR_ENABLED 기준으로 다시 결정)
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';

export async function POST() {
  const job = getJobManager();
  job.stop();

  return NextResponse.json({ ok: true, isRunning: false });
}
