/**
 * @file src/app/api/monitor/start/route.ts
 * @description POST /api/monitor/start — 백그라운드 잡 런타임 시작
 *
 * 초보자 가이드:
 * - CTQ_MONITOR_ENABLED 환경변수가 false면 시작 불가 (서버별 게이트)
 * - 서버 재시작 시 자동 재개는 instrumentation.ts가 담당
 * - 이 버튼은 런타임 중 임시 시작용 (재시작하면 env 기준으로 다시 결정)
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';
import { getSettings } from '@/lib/slack-settings';

export async function POST() {
  if (process.env.CTQ_MONITOR_ENABLED !== 'true') {
    return NextResponse.json(
      { error: '이 서버는 CTQ_MONITOR_ENABLED=false — 모니터링 비활성화 서버입니다.' },
      { status: 403 }
    );
  }

  const settings = await getSettings();
  const job = getJobManager();
  job.start(settings.monitorIntervalMinutes);

  return NextResponse.json({ ok: true, isRunning: job.isRunning });
}
