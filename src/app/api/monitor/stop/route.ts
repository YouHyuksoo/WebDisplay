/**
 * @file src/app/api/monitor/stop/route.ts
 * @description POST /api/monitor/stop — 백그라운드 잡 정지 + 설정 저장
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
