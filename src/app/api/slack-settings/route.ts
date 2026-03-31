/**
 * @file src/app/api/slack-settings/route.ts
 * @description
 * Slack / Teams 통합 알림 설정 API 라우트입니다.
 * JSON 파일을 스토리지로 사용하며 Oracle DB 연결이 필요 없습니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/slack-settings**: 현재 알림 설정 조회 (Slack + Teams)
 * 2. **POST /api/slack-settings**: 설정 저장 (webhookUrl / teamsWebhookUrl 형식 검증 포함)
 * 3. **저장 위치**: 프로젝트 루트 data/slack-settings.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/slack-settings';

/**
 * Slack 설정 조회
 * GET /api/slack-settings
 */
export async function GET(_request: NextRequest) {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[API] Slack 설정 조회 실패:', error);
    return NextResponse.json(
      { error: 'Slack 설정을 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
}

/**
 * Slack 설정 저장
 * POST /api/slack-settings
 * Body: SlackSettings 전체 객체
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      webhookUrl,
      channelName,
      isEnabled,
      notifyPassRateDrop,
      notifyNgSpike,
      notifyLineStop,
      notifyEquipmentDown,
      notifyDailyReport,
      mentionOnUrgent,
      dailyReportTime,
      teamsWebhookUrl,
      teamsChannelName,
      teamsEnabled,
    } = body;

    // Slack webhookUrl 형식 검증
    if (webhookUrl && !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: '유효하지 않은 Slack 웹훅 URL입니다. https://hooks.slack.com/ 으로 시작해야 합니다.' },
        { status: 400 }
      );
    }

    // Teams webhookUrl 형식 검증
    if (
      teamsWebhookUrl &&
      !teamsWebhookUrl.includes('.webhook.office.com/') &&
      !teamsWebhookUrl.includes('.logic.azure.com/')
    ) {
      return NextResponse.json(
        { error: '유효하지 않은 Teams 웹훅 URL입니다. webhook.office.com 또는 logic.azure.com 도메인이어야 합니다.' },
        { status: 400 }
      );
    }

    // 기존 설정 가져와서 병합 후 저장
    const current = await getSettings();
    const updated = {
      ...current,
      webhookUrl: webhookUrl ?? current.webhookUrl,
      channelName: channelName ?? current.channelName,
      isEnabled: isEnabled ?? current.isEnabled,
      notifyPassRateDrop: notifyPassRateDrop ?? current.notifyPassRateDrop,
      notifyNgSpike: notifyNgSpike ?? current.notifyNgSpike,
      notifyLineStop: notifyLineStop ?? current.notifyLineStop,
      notifyEquipmentDown: notifyEquipmentDown ?? current.notifyEquipmentDown,
      notifyDailyReport: notifyDailyReport ?? current.notifyDailyReport,
      mentionOnUrgent: mentionOnUrgent ?? current.mentionOnUrgent,
      dailyReportTime: dailyReportTime ?? current.dailyReportTime,
      teamsWebhookUrl: teamsWebhookUrl ?? current.teamsWebhookUrl,
      teamsChannelName: teamsChannelName ?? current.teamsChannelName,
      teamsEnabled: teamsEnabled ?? current.teamsEnabled,
    };

    await saveSettings(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] Slack 설정 저장 실패:', error);
    return NextResponse.json(
      { error: 'Slack 설정을 저장할 수 없습니다.' },
      { status: 500 }
    );
  }
}
