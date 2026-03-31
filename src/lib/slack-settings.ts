/**
 * @file src/lib/slack-settings.ts
 * @description
 * Slack / Teams 알림 설정을 JSON 파일로 저장/조회하는 유틸리티입니다.
 * Oracle DB 없이 data/slack-settings.json 파일을 직접 사용합니다.
 *
 * 초보자 가이드:
 * 1. **getSettings()**: 현재 설정 조회 (파일 없으면 기본값 반환)
 * 2. **saveSettings()**: 설정을 JSON 파일에 저장
 * 3. **저장 위치**: 프로젝트 루트의 data/slack-settings.json
 * 4. Slack과 Teams 설정이 함께 저장됩니다
 *
 * 사용 예:
 * ```typescript
 * import { getSettings, saveSettings } from '@/lib/slack-settings';
 * const settings = await getSettings();
 * await saveSettings({ ...settings, isEnabled: true });
 * ```
 */

import fs from 'fs/promises';
import path from 'path';

/** Slack / Teams 통합 알림 설정 타입 */
export interface SlackSettings {
  // --- Slack 설정 ---
  /** Incoming Webhook URL */
  webhookUrl: string;
  /** 알림 채널명 (표시용) */
  channelName: string;
  /** Slack 알림 마스터 ON/OFF */
  isEnabled: boolean;
  /** 합격률 급락 알림 */
  notifyPassRateDrop: boolean;
  /** NG 급증 알림 */
  notifyNgSpike: boolean;
  /** 라인 정지 알림 */
  notifyLineStop: boolean;
  /** 설비 이상 알림 */
  notifyEquipmentDown: boolean;
  /** 일일 요약 리포트 */
  notifyDailyReport: boolean;
  /** 긴급 시 @channel 멘션 */
  mentionOnUrgent: boolean;
  /** 일일 리포트 전송 시간 (HH:mm) */
  dailyReportTime: string;
  // --- Teams 설정 ---
  /** Teams Incoming Webhook URL */
  teamsWebhookUrl: string;
  /** Teams 채널명 (표시용) */
  teamsChannelName: string;
  /** Teams 알림 ON/OFF */
  teamsEnabled: boolean;
}

/** 기본 설정값 */
const DEFAULT_SETTINGS: SlackSettings = {
  webhookUrl: '',
  channelName: '',
  isEnabled: false,
  notifyPassRateDrop: false,
  notifyNgSpike: false,
  notifyLineStop: false,
  notifyEquipmentDown: false,
  notifyDailyReport: false,
  mentionOnUrgent: false,
  dailyReportTime: '08:00',
  teamsWebhookUrl: '',
  teamsChannelName: '',
  teamsEnabled: false,
};

/** 설정 파일 경로 */
const SETTINGS_PATH = path.join(process.cwd(), 'data', 'slack-settings.json');

/**
 * 현재 Slack 설정 조회
 * 파일이 없거나 읽기 실패 시 기본값 반환
 * @returns SlackSettings 객체
 */
export async function getSettings(): Promise<SlackSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SlackSettings>;
    // 새로 추가된 필드가 없을 경우 기본값으로 채움
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Slack 설정 저장
 * data/ 디렉토리가 없으면 자동 생성
 * @param settings - 저장할 설정 객체
 */
export async function saveSettings(settings: SlackSettings): Promise<void> {
  const dir = path.dirname(SETTINGS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
