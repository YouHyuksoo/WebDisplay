/**
 * @file src/app/(u1)/u1/slack-settings/page.tsx
 * @description
 * SOLUM MES 알림 설정 페이지입니다. (Slack + Teams 통합)
 * 웹훅 URL, 채널명, 알림 조건 등을 Slack과 Teams 각각 설정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **Slack 웹훅 URL**: Slack 앱에서 생성한 Incoming Webhook URL 입력
 * 2. **Teams 웹훅 URL**: Teams 채널 커넥터에서 생성한 Incoming Webhook URL 입력
 * 3. **마스터 ON/OFF**: Slack/Teams 각각 독립적으로 켜거나 끕니다
 * 4. **개별 토글**: 각 이벤트별 알림 수신 여부 선택 (Slack/Teams 공유)
 * 5. **테스트**: 저장 전 웹훅 연동 상태를 각각 확인합니다
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import DisplayHeader from '@/components/display/DisplayHeader';
import SlackWebhookSection from '@/components/u1/slack/SlackWebhookSection';
import TeamsWebhookSection from '@/components/u1/slack/TeamsWebhookSection';
import SlackToggleSection from '@/components/u1/slack/SlackToggleSection';
import SlackAdvancedSection from '@/components/u1/slack/SlackAdvancedSection';
import MonitorJobSection from '@/components/u1/slack/MonitorJobSection';
import Spinner from '@/components/ui/Spinner';

const SCREEN_ID = 'u1-slack';

/** 통합 알림 설정 타입 (Slack + Teams) */
export interface SlackSettings {
  // Slack
  webhookUrl: string;
  channelName: string;
  isEnabled: boolean;
  // 공유 토글 (Slack/Teams 공통 적용)
  notifyPassRateDrop: boolean;
  notifyNgSpike: boolean;
  notifyLineStop: boolean;
  notifyEquipmentDown: boolean;
  notifyDailyReport: boolean;
  mentionOnUrgent: boolean;
  dailyReportTime: string;
  // Teams
  teamsWebhookUrl: string;
  teamsChannelName: string;
  teamsEnabled: boolean;
  // --- 백그라운드 모니터 ---
  monitorIntervalMinutes: number;
  monitorRepeatability: boolean;
  monitorNonConsecutive: boolean;
  monitorAccident: boolean;
}

/** 상태 메시지 타입 */
export interface StatusMsg {
  type: 'success' | 'error' | 'info';
  text: string;
}

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
  monitorIntervalMinutes: 5,
  monitorRepeatability: true,
  monitorNonConsecutive: true,
  monitorAccident: true,
};

export default function SlackSettingsPage() {
  const t = useTranslations('ctq.pages.slackSettings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [isTestingTeams, setIsTestingTeams] = useState(false);
  const [settings, setSettings] = useState<SlackSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<StatusMsg | null>(null);

  // 상태 메시지 자동 제거 (4초 후)
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  // 설정 불러오기
  useEffect(() => {
    fetch('/api/slack-settings')
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => setStatus({ type: 'error', text: t('loadFailed') }))
      .finally(() => setIsLoading(false));
  }, [t]);

  // 설정 저장
  const handleSave = async () => {
    // Slack URL 검증
    if (settings.webhookUrl && !settings.webhookUrl.startsWith('https://hooks.slack.com/')) {
      setStatus({ type: 'error', text: t('invalidSlackUrl') });
      return;
    }
    // Teams URL 검증
    if (
      settings.teamsWebhookUrl &&
      !settings.teamsWebhookUrl.includes('.webhook.office.com/') &&
      !settings.teamsWebhookUrl.includes('.logic.azure.com/') &&
      !settings.teamsWebhookUrl.includes('powerplatform.com')
    ) {
      setStatus({ type: 'error', text: t('invalidTeamsUrl') });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/slack-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setStatus({ type: 'success', text: t('saveSuccess') });
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.error || t('saveFailed') });
      }
    } catch {
      setStatus({ type: 'error', text: t('saveError') });
    } finally {
      setIsSaving(false);
    }
  };

  // Slack 테스트
  const handleTestSlack = async () => {
    if (!settings.webhookUrl) {
      setStatus({ type: 'error', text: t('enterSlackUrl') });
      return;
    }
    setIsTestingSlack(true);
    try {
      const res = await fetch('/api/slack-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.webhookUrl }),
      });
      if (res.ok) {
        setStatus({ type: 'success', text: t('slackTestSuccess') });
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.error || t('slackTestFailed') });
      }
    } catch {
      setStatus({ type: 'error', text: t('slackTestError') });
    } finally {
      setIsTestingSlack(false);
    }
  };

  // Teams 테스트
  const handleTestTeams = async () => {
    if (!settings.teamsWebhookUrl) {
      setStatus({ type: 'error', text: t('enterTeamsUrl') });
      return;
    }
    setIsTestingTeams(true);
    try {
      const res = await fetch('/api/slack-settings/test-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.teamsWebhookUrl }),
      });
      if (res.ok) {
        setStatus({ type: 'success', text: t('teamsTestSuccess') });
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.error || t('teamsTestFailed') });
      }
    } catch {
      setStatus({ type: 'error', text: t('teamsTestError') });
    } finally {
      setIsTestingTeams(false);
    }
  };

  // 토글 핸들러
  const handleToggle = (field: keyof SlackSettings) => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading) {
    return (
      <div className="h-full bg-gray-950 flex flex-col">
        <DisplayHeader title={t('title')} screenId={SCREEN_ID} />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <DisplayHeader title={t('title')} screenId={SCREEN_ID} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* 상태 메시지 */}
          {status && (
            <div className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              status.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' :
              status.type === 'error' ? 'bg-red-900/50 text-red-300 border border-red-700' :
              'bg-blue-900/50 text-blue-300 border border-blue-700'
            }`}>
              {status.type === 'success' ? '✅ ' : status.type === 'error' ? '❌ ' : 'ℹ️ '}
              {status.text}
            </div>
          )}

          {/* Slack / Teams 좌우 배치 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 왼쪽: Slack */}
            <div className="space-y-4">
              {/* Slack 마스터 ON/OFF */}
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-200 font-semibold flex items-center gap-2">
                      <span className="text-blue-400">💬</span>
                      {t('slackAlert')}
                    </p>
                    <p className="text-gray-400 text-sm mt-0.5">{t('slackAlertDesc')}</p>
                  </div>
                  <button
                    onClick={() => handleToggle('isEnabled')}
                    className={`relative w-12 h-6 rounded-full overflow-hidden transition-colors focus:outline-none ${
                      settings.isEnabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                    aria-label={t('slackAlertOnOff')}
                  >
                    <span className={`absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      settings.isEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Slack 웹훅 설정 섹션 */}
              <SlackWebhookSection
                webhookUrl={settings.webhookUrl}
                channelName={settings.channelName}
                isTesting={isTestingSlack}
                onChange={(field, value) => setSettings((prev) => ({ ...prev, [field]: value }))}
                onTest={handleTestSlack}
              />
            </div>

            {/* 오른쪽: Teams */}
            <div>
              <TeamsWebhookSection
                webhookUrl={settings.teamsWebhookUrl}
                channelName={settings.teamsChannelName}
                isEnabled={settings.teamsEnabled}
                isTesting={isTestingTeams}
                onChange={(field, value) => setSettings((prev) => ({ ...prev, [field]: value }))}
                onToggle={() => handleToggle('teamsEnabled')}
                onTest={handleTestTeams}
              />
            </div>
          </div>

          {/* 알림 토글 섹션 (Slack/Teams 공유) */}
          <SlackToggleSection settings={settings} onToggle={handleToggle} />

          {/* 고급 옵션 섹션 */}
          <SlackAdvancedSection
            mentionOnUrgent={settings.mentionOnUrgent}
            dailyReportTime={settings.dailyReportTime}
            onToggleMention={() => handleToggle('mentionOnUrgent')}
            onChangeTime={(val) => setSettings((prev) => ({ ...prev, dailyReportTime: val }))}
          />

          {/* 백그라운드 모니터 섹션 */}
          <MonitorJobSection
            settings={settings}
            onSettingsChange={(field, value) =>
              setSettings((prev) => ({ ...prev, [field]: value }))
            }
          />

          {/* 저장 버튼 */}
          <div className="flex justify-end pt-2 pb-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isSaving ? t('saving') : t('saveSettings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
