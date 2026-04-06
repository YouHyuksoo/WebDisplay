/**
 * @file src/lib/teams.ts
 * @description
 * SOLUM MES WebDisplay용 Microsoft Teams 웹훅 알림 유틸리티입니다.
 * Teams Incoming Webhook으로 MessageCard 형식 알림을 전송합니다.
 *
 * 초보자 가이드:
 * 1. **sendTeamsNotification(type, data)**: 타입별 Teams 알림 전송
 * 2. **알림 타입**: passRateDrop, ngSpike, lineStop, equipmentDown, dailyReport
 * 3. **MessageCard 형식**: Adaptive Card보다 단순, Incoming Webhook에서 지원
 * 4. **teamsEnabled + 개별 토글** 모두 true일 때만 전송됩니다.
 *
 * 사용 예:
 * ```typescript
 * import { sendTeamsNotification } from '@/lib/teams';
 * await sendTeamsNotification('lineStop', {
 *   lineName: 'SMD-L1',
 *   stoppedAt: new Date(),
 *   reason: '설비 이상',
 * });
 * ```
 */

import { getSettings } from '@/lib/slack-settings';

/** 알림 타입 정의 (Slack과 동일) */
export type TeamsNotificationType =
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
 * Teams 웹훅으로 MessageCard 전송
 * @param webhookUrl - Teams Incoming Webhook URL
 * @param payload - 전송할 MessageCard 페이로드
 * @returns 성공 여부
 */
async function postToTeams(webhookUrl: string, payload: object): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`[Teams] 전송 실패: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Teams] 전송 오류:', error);
    return false;
  }
}

/**
 * MES 이벤트 타입별 Teams 알림 전송
 * teamsEnabled + 개별 토글이 true일 때만 전송
 * @param type - 알림 타입
 * @param data - 알림 데이터
 * @returns 성공 여부
 */
export async function sendTeamsNotification(
  type: TeamsNotificationType,
  data: NotificationData
): Promise<boolean> {
  const settings = await getSettings();

  if (!settings.teamsEnabled || !settings.teamsWebhookUrl) {
    console.log('[Teams] 알림 비활성화 또는 웹훅 URL 없음');
    return false;
  }

  // 개별 토글 확인 (Slack 토글과 공유)
  const toggleMap: Record<TeamsNotificationType, boolean> = {
    passRateDrop: settings.notifyPassRateDrop,
    ngSpike: settings.notifyNgSpike,
    lineStop: settings.notifyLineStop,
    equipmentDown: settings.notifyEquipmentDown,
    dailyReport: settings.notifyDailyReport,
  };

  if (!toggleMap[type]) {
    console.log(`[Teams] ${type} 알림 비활성화`);
    return false;
  }

  const payload = buildTeamsPayload(type, data);
  return postToTeams(settings.teamsWebhookUrl, payload);
}

/**
 * 알림 타입별 Teams MessageCard 페이로드 생성
 */
function buildTeamsPayload(type: TeamsNotificationType, data: NotificationData): object {
  const now = new Date().toLocaleString('ko-KR');

  switch (type) {
    case 'passRateDrop': {
      const d = data as PassRateDropData;
      const facts = [
        { name: '라인', value: d.lineName },
        { name: '합격률', value: `${d.passRate.toFixed(1)}%` },
        ...(d.processName ? [{ name: '공정', value: d.processName }] : []),
        ...(d.threshold ? [{ name: '기준', value: `${d.threshold}%` }] : []),
        { name: '발생시간', value: now },
      ];
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: 'ef4444',
        summary: `[합격률 급락] ${d.lineName} 합격률 ${d.passRate.toFixed(1)}%`,
        sections: [{ activityTitle: '🔴 합격률 급락 경보', facts, markdown: true }],
      };
    }
    case 'ngSpike': {
      const d = data as NgSpikeData;
      const timeStr = d.detectedAt ? d.detectedAt.toLocaleString('ko-KR') : now;
      const facts = [
        { name: '라인', value: d.lineName },
        { name: 'NG 건수', value: `${d.ngCount}건` },
        ...(d.ngType ? [{ name: 'NG 유형', value: d.ngType }] : []),
        { name: '발생시간', value: timeStr },
      ];
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: 'f59e0b',
        summary: `[NG 급증] ${d.lineName} NG ${d.ngCount}건 발생`,
        sections: [{ activityTitle: '🟡 NG 급증 경보', facts, markdown: true }],
      };
    }
    case 'lineStop': {
      const d = data as LineStopData;
      const timeStr = d.stoppedAt ? d.stoppedAt.toLocaleString('ko-KR') : now;
      const facts = [
        { name: '라인', value: d.lineName },
        ...(d.reason ? [{ name: '사유', value: d.reason }] : []),
        { name: '발생시간', value: timeStr },
      ];
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: 'dc2626',
        summary: `[라인 정지] ${d.lineName} 정지 발생`,
        sections: [{ activityTitle: '🚨 라인 정지 발생', facts, markdown: true }],
      };
    }
    case 'equipmentDown': {
      const d = data as EquipmentDownData;
      const timeStr = d.stoppedAt ? d.stoppedAt.toLocaleString('ko-KR') : now;
      const facts = [
        { name: '설비', value: d.equipmentName },
        { name: '정지시간', value: `${d.downMinutes}분` },
        ...(d.lineName ? [{ name: '라인', value: d.lineName }] : []),
        { name: '발생시간', value: timeStr },
      ];
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '7c3aed',
        summary: `[설비 이상] ${d.equipmentName} ${d.downMinutes}분 정지`,
        sections: [{ activityTitle: '⚠️ 설비 이상 감지', facts, markdown: true }],
      };
    }
    case 'dailyReport': {
      const d = data as DailyReportData;
      const facts = [
        ...(d.totalProduced !== undefined ? [{ name: '총 생산', value: `${d.totalProduced.toLocaleString()}개` }] : []),
        ...(d.avgPassRate !== undefined ? [{ name: '평균 합격률', value: `${d.avgPassRate.toFixed(1)}%` }] : []),
        ...(d.ngCount !== undefined ? [{ name: 'NG 건수', value: `${d.ngCount}건` }] : []),
        ...(d.lineStopCount !== undefined ? [{ name: '라인 정지', value: `${d.lineStopCount}회` }] : []),
        { name: '발송시간', value: now },
      ];
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '22c55e',
        summary: `[일일 리포트] ${d.date} 생산 요약`,
        sections: [{ activityTitle: `📋 일일 생산 요약 리포트 (${d.date})`, facts, markdown: true }],
      };
    }
    default:
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '6b7280',
        summary: '[SOLUM MES] 알림 발생',
        sections: [{ activityTitle: '[SOLUM MES] 알림', markdown: true }],
      };
  }
}

/**
 * CTQ A등급 이상점 Teams 알림 전송
 * @param category - 알림 카테고리
 * @param items - A등급 라인 목록
 * @param webhookUrl - Teams 웹훅 URL
 * @returns 전송 성공 여부
 */
export async function sendCtqAGradeAlert(
  category: 'repeatability' | 'nonConsecutive' | 'accident',
  items: Array<{ lineCode: string; lineName: string; process: string; ngCount: number }>,
  webhookUrl: string
): Promise<boolean> {
  const categoryLabel: Record<string, string> = {
    repeatability: '반복성 (연속동일위치)',
    nonConsecutive: '연속반복성 (비연속동일위치)',
    accident: '사고성',
  };

  const categoryPath: Record<string, string> = {
    repeatability: '/ctq/repeatability',
    nonConsecutive: '/ctq/non-consecutive',
    accident: '/ctq/accident',
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const pageUrl = `${baseUrl}${categoryPath[category]}`;

  const facts = items.map((item) => ({
    name: `${item.lineName} [${item.process}]`,
    value: `A등급 — NG ${item.ngCount}건`,
  }));
  facts.push({ name: '발생시간', value: new Date().toLocaleString('ko-KR') });

  const payload = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: 'ef4444',
    summary: `[CTQ A등급] ${categoryLabel[category]} — ${items.length}개 라인`,
    sections: [
      {
        activityTitle: `🚨 CTQ 이상점 A등급 감지: ${categoryLabel[category]}`,
        activityText: `**${items.length}개 라인**에서 A등급 이상점이 감지되었습니다.`,
        facts,
        markdown: true,
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: '상세 보기',
        targets: [{ os: 'default', uri: pageUrl }],
      },
    ],
  };

  return postToTeams(webhookUrl, payload);
}
