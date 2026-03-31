/**
 * @file src/app/api/slack-settings/test/route.ts
 * @description
 * Slack 웹훅 연동 테스트 API입니다.
 * 입력된 웹훅 URL로 테스트 메시지를 전송하여 정상 동작을 확인합니다.
 *
 * 초보자 가이드:
 * 1. POST /api/slack-settings/test 로 요청
 * 2. Body: { webhookUrl: "https://hooks.slack.com/..." }
 * 3. Slack 채널에 테스트 메시지가 오면 연동 성공
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Slack 웹훅 테스트 메시지 전송
 * POST /api/slack-settings/test
 * Body: { webhookUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: '웹훅 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: '유효하지 않은 Slack 웹훅 URL입니다.' },
        { status: 400 }
      );
    }

    // 테스트 메시지 (Block Kit 형식)
    const testPayload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ SOLUM MES 연동 테스트',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Slack 웹훅 연동이 *정상적으로 설정*되었습니다.\n\n합격률 급락, NG 급증, 라인 정지 등의 MES 알림을 이 채널로 받을 수 있습니다.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `테스트 시간: ${new Date().toLocaleString('ko-KR')} | SOLUM MES WebDisplay`,
            },
          ],
        },
      ],
      text: '[SOLUM MES] Slack 연동 테스트 메시지입니다.',
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Slack 테스트 실패:', response.status, errorText);
      return NextResponse.json(
        { error: `Slack 전송 실패: ${errorText || response.statusText}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '테스트 메시지가 전송되었습니다. Slack 채널을 확인해주세요.',
    });
  } catch (error) {
    console.error('[API] Slack 테스트 오류:', error);
    return NextResponse.json(
      { error: '테스트 메시지 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}
