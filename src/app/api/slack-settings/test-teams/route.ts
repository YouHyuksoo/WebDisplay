/**
 * @file src/app/api/slack-settings/test-teams/route.ts
 * @description
 * Microsoft Teams 웹훅 연동 테스트 API입니다.
 * 입력된 웹훅 URL로 테스트 메시지를 전송하여 정상 동작을 확인합니다.
 *
 * 초보자 가이드:
 * 1. POST /api/slack-settings/test-teams 로 요청
 * 2. Body: { webhookUrl: "https://*.webhook.office.com/..." }
 * 3. Teams 채널에 테스트 메시지가 오면 연동 성공
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Teams 웹훅 URL 유효성 검사
 * webhook.office.com 또는 logic.azure.com 도메인 허용
 */
function isValidTeamsWebhookUrl(url: string): boolean {
  return (
    url.includes('.webhook.office.com/') ||
    url.includes('.logic.azure.com/')
  );
}

/**
 * Teams 웹훅 테스트 메시지 전송
 * POST /api/slack-settings/test-teams
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

    if (!isValidTeamsWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: '유효하지 않은 Teams 웹훅 URL입니다. webhook.office.com 또는 logic.azure.com 도메인이어야 합니다.' },
        { status: 400 }
      );
    }

    // Teams MessageCard 형식 테스트 메시지
    const testPayload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '22c55e',
      summary: 'SOLUM MES Teams 연동 테스트',
      sections: [
        {
          activityTitle: '✅ SOLUM MES 연동 테스트',
          activityText: 'Teams 웹훅 연동이 **정상적으로 설정**되었습니다.',
          facts: [
            { name: '시스템', value: 'SOLUM MES WebDisplay' },
            { name: '테스트 시간', value: new Date().toLocaleString('ko-KR') },
            { name: '상태', value: '연동 성공' },
          ],
          markdown: true,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Teams 테스트 실패:', response.status, errorText);
      return NextResponse.json(
        { error: `Teams 전송 실패: ${errorText || response.statusText}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '테스트 메시지가 전송되었습니다. Teams 채널을 확인해주세요.',
    });
  } catch (error) {
    console.error('[API] Teams 테스트 오류:', error);
    return NextResponse.json(
      { error: '테스트 메시지 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}
