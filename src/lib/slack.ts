/**
 * @file src/lib/slack.ts
 * @description
 * SOLUM MES WebDisplay용 Slack 웹훅 알림 유틸리티입니다.
 * JSON 파일에 저장된 설정을 기반으로 MES 이벤트를 Slack으로 알림합니다.
 *
 * 초보자 가이드:
 * 1. **sendSlackNotification(type, data)**: 타입별 알림 전송
 * 2. **알림 타입**: passRateDrop, ngSpike, lineStop, equipmentDown, dailyReport
 * 3. **색상 코딩**: 빨강(critical), 노랑(warning), 초록(good)
 * 4. **isEnabled + 개별 토글** 모두 true일 때만 전송됩니다.
 *
 * 사용 예:
 * ```typescript
 * import { sendSlackNotification } from '@/lib/slack';
 * await sendSlackNotification('lineStop', {
 *   lineName: 'SMD-L1',
 *   stoppedAt: new Date(),
 *   reason: '설비 이상',
 * });
 * ```
 */

import { getSettings } from '@/lib/slack-settings';

/** 알림 타입 정의 */
export type SlackNotificationType =
  | 'passRateDrop'
  | 'ngSpike'
  | 'lineStop'
  | 'equipmentDown'
  | 'dailyReport';

/** 합격률 급락 알림 데이터 */
interface PassRateDropData {
  lineName: string;
  processName?: string;
  passRate: number;
  threshold?: number;
}

/** NG 급증 알림 데이터 */
interface NgSpikeData {
  lineName: string;
  ngCount: number;
  ngType?: string;
  detectedAt?: Date;
}

/** 라인 정지 알림 데이터 */
interface LineStopData {
  lineName: string;
  stoppedAt?: Date;
  reason?: string;
}

/** 설비 이상 알림 데이터 */
interface EquipmentDownData {
  equipmentName: string;
  lineName?: string;
  downMinutes: number;
  stoppedAt?: Date;
}

/** 일일 요약 리포트 데이터 */
interface DailyReportData {
  date: string;
  totalProduced?: number;
  avgPassRate?: number;
  ngCount?: number;
  lineStopCount?: number;
}

/** 알림 데이터 유니온 타입 */
type NotificationData =
  | PassRateDropData
  | NgSpikeData
  | LineStopData
  | EquipmentDownData
  | DailyReportData;

/**
 * Slack 웹훅으로 Block Kit 메시지 전송
 * @param webhookUrl - Slack Incoming Webhook URL
 * @param payload - 전송할 메시지 페이로드
 * @returns 성공 여부
 */
async function postToSlack(webhookUrl: string, payload: object): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`[Slack] 전송 실패: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Slack] 전송 오류:', error);
    return false;
  }
}

/**
 * MES 이벤트 타입별 Slack 알림 전송
 * isEnabled + 개별 토글이 true일 때만 전송
 * @param type - 알림 타입
 * @param data - 알림 데이터
 * @returns 성공 여부
 */
export async function sendSlackNotification(
  type: SlackNotificationType,
  data: NotificationData
): Promise<boolean> {
  const settings = await getSettings();

  if (!settings.isEnabled || !settings.webhookUrl) {
    console.log('[Slack] 알림 비활성화 또는 웹훅 URL 없음');
    return false;
  }

  // 개별 토글 확인
  const toggleMap: Record<SlackNotificationType, boolean> = {
    passRateDrop: settings.notifyPassRateDrop,
    ngSpike: settings.notifyNgSpike,
    lineStop: settings.notifyLineStop,
    equipmentDown: settings.notifyEquipmentDown,
    dailyReport: settings.notifyDailyReport,
  };

  if (!toggleMap[type]) {
    console.log(`[Slack] ${type} 알림 비활성화`);
    return false;
  }

  const payload = buildPayload(type, data, settings.mentionOnUrgent);
  return postToSlack(settings.webhookUrl, payload);
}

/**
 * 알림 타입별 Block Kit 페이로드 생성
 */
function buildPayload(
  type: SlackNotificationType,
  data: NotificationData,
  mentionOnUrgent: boolean
): object {
  const now = new Date().toLocaleString('ko-KR');

  switch (type) {
    case 'passRateDrop': {
      const d = data as PassRateDropData;
      const mention = mentionOnUrgent ? '<!channel> ' : '';
      return {
        attachments: [{
          color: '#ef4444',
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: `${mention}🔴 *합격률 급락 경보*` } },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `🏭 *라인:* ${d.lineName}` },
                { type: 'mrkdwn', text: `📊 *합격률:* ${d.passRate.toFixed(1)}%` },
                ...(d.processName ? [{ type: 'mrkdwn', text: `⚙️ *공정:* ${d.processName}` }] : []),
                ...(d.threshold ? [{ type: 'mrkdwn', text: `🎯 *기준:* ${d.threshold}%` }] : []),
              ],
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `발생: ${now}` }] },
          ],
        }],
        text: `[합격률 급락] ${d.lineName} 합격률 ${d.passRate.toFixed(1)}%`,
      };
    }
    case 'ngSpike': {
      const d = data as NgSpikeData;
      const mention = mentionOnUrgent ? '<!channel> ' : '';
      const timeStr = d.detectedAt ? d.detectedAt.toLocaleString('ko-KR') : now;
      return {
        attachments: [{
          color: '#f59e0b',
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: `${mention}🟡 *NG 급증 경보*` } },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `🏭 *라인:* ${d.lineName}` },
                { type: 'mrkdwn', text: `🔢 *NG 건수:* ${d.ngCount}건` },
                ...(d.ngType ? [{ type: 'mrkdwn', text: `🏷️ *NG 유형:* ${d.ngType}` }] : []),
              ],
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `발생: ${timeStr}` }] },
          ],
        }],
        text: `[NG 급증] ${d.lineName} NG ${d.ngCount}건 발생`,
      };
    }
    case 'lineStop': {
      const d = data as LineStopData;
      const mention = mentionOnUrgent ? '<!channel> ' : '';
      const timeStr = d.stoppedAt ? d.stoppedAt.toLocaleString('ko-KR') : now;
      return {
        attachments: [{
          color: '#dc2626',
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: `${mention}🚨 *라인 정지 발생*` } },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `🏭 *라인:* ${d.lineName}` },
                ...(d.reason ? [{ type: 'mrkdwn', text: `📝 *사유:* ${d.reason}` }] : []),
              ],
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `발생: ${timeStr}` }] },
          ],
        }],
        text: `[라인 정지] ${d.lineName} 정지 발생`,
      };
    }
    case 'equipmentDown': {
      const d = data as EquipmentDownData;
      const timeStr = d.stoppedAt ? d.stoppedAt.toLocaleString('ko-KR') : now;
      return {
        attachments: [{
          color: '#7c3aed',
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: `⚠️ *설비 이상 감지*` } },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `🔧 *설비:* ${d.equipmentName}` },
                { type: 'mrkdwn', text: `⏱️ *정지시간:* ${d.downMinutes}분` },
                ...(d.lineName ? [{ type: 'mrkdwn', text: `🏭 *라인:* ${d.lineName}` }] : []),
              ],
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `발생: ${timeStr}` }] },
          ],
        }],
        text: `[설비 이상] ${d.equipmentName} ${d.downMinutes}분 정지`,
      };
    }
    case 'dailyReport': {
      const d = data as DailyReportData;
      return {
        attachments: [{
          color: '#22c55e',
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: `📋 *일일 생산 요약 리포트* (${d.date})` } },
            {
              type: 'section',
              fields: [
                ...(d.totalProduced !== undefined ? [{ type: 'mrkdwn', text: `📦 *총 생산:* ${d.totalProduced.toLocaleString()}개` }] : []),
                ...(d.avgPassRate !== undefined ? [{ type: 'mrkdwn', text: `✅ *평균 합격률:* ${d.avgPassRate.toFixed(1)}%` }] : []),
                ...(d.ngCount !== undefined ? [{ type: 'mrkdwn', text: `❌ *NG 건수:* ${d.ngCount}건` }] : []),
                ...(d.lineStopCount !== undefined ? [{ type: 'mrkdwn', text: `🛑 *라인 정지:* ${d.lineStopCount}회` }] : []),
              ],
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `발송: ${now}` }] },
          ],
        }],
        text: `[일일 리포트] ${d.date} 생산 요약`,
      };
    }
    default:
      return { text: '[SOLUM MES] 알림 발생' };
  }
}
