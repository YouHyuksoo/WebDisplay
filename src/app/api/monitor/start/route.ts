/**
 * @file src/app/api/monitor/start/route.ts
 * @description POST /api/monitor/start — 백그라운드 잡 시작 + 설정 저장
 *
 * 초보자 가이드:
 * - monitorEnabled: true 로 설정 파일 저장 (서버 재시작 후 자동 재개에 사용)
 * - CTQ_MONITOR_ENABLED 환경변수가 false면 시작 불가 (서버별 게이트)
 */
import { NextResponse } from 'next/server';
import { getJobManager } from '@/lib/monitor/ctq-monitor';
import { getSettings, saveSettings } from '@/lib/slack-settings';

export async function POST() {
  if (process.env.CTQ_MONITOR_ENABLED !== 'true') {
    return NextResponse.json(
      { error: '이 서버는 CTQ_MONITOR_ENABLED=false — 모니터링 비활성화 서버입니다.' },
      { status: 403 }
    );
  }

  const settings = await getSettings();
  await saveSettings({ ...settings, monitorEnabled: true });

  const job = getJobManager();
  job.start(settings.monitorIntervalMinutes);

  return NextResponse.json({ ok: true, isRunning: job.isRunning });
}
