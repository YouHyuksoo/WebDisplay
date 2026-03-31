/**
 * @file src/app/(u1)/u1/slack-settings/page.tsx
 * @description
 * SOLUM MES Slack 알림 설정 페이지입니다.
 * 웹훅 URL, 채널명, 알림 조건 등을 설정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **웹훅 URL**: Slack 앱에서 생성한 Incoming Webhook URL 입력
 * 2. **마스터 ON/OFF**: 모든 알림을 한 번에 켜거나 끕니다
 * 3. **개별 토글**: 각 이벤트별 알림 수신 여부 선택
 * 4. **테스트**: 저장 전 웹훅 연동 상태를 확인합니다
 */

'use client';

import { useState, useEffect } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import SlackWebhookSection from '@/components/u1/slack/SlackWebhookSection';
import SlackToggleSection from '@/components/u1/slack/SlackToggleSection';
import SlackAdvancedSection from '@/components/u1/slack/SlackAdvancedSection';

const SCREEN_ID = 'u1-slack';

/** Slack 설정 타입 */
export interface SlackSettings {
  webhookUrl: string;
  channelName: string;
  isEnabled: boolean;
  notifyPassRateDrop: boolean;
  notifyNgSpike: boolean;
  notifyLineStop: boolean;
  notifyEquipmentDown: boolean;
  notifyDailyReport: boolean;
  mentionOnUrgent: boolean;
  dailyReportTime: string;
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
};

export default function SlackSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState<SlackSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<StatusMsg | null>(null);

  // 상태 메시지 자동 제거 (3초 후)
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  // 설정 불러오기
  useEffect(() => {
    fetch('/api/slack-settings')
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => setStatus({ type: 'error', text: '설정을 불러오는데 실패했습니다.' }))
      .finally(() => setIsLoading(false));
  }, []);

  // 설정 저장
  const handleSave = async () => {
    if (settings.webhookUrl && !settings.webhookUrl.startsWith('https://hooks.slack.com/')) {
      setStatus({ type: 'error', text: '유효하지 않은 Slack 웹훅 URL입니다.' });
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
        setStatus({ type: 'success', text: 'Slack 설정이 저장되었습니다.' });
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.error || '저장에 실패했습니다.' });
      }
    } catch {
      setStatus({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 테스트 메시지 전송
  const handleTest = async () => {
    if (!settings.webhookUrl) {
      setStatus({ type: 'error', text: '웹훅 URL을 먼저 입력해주세요.' });
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch('/api/slack-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.webhookUrl }),
      });
      if (res.ok) {
        setStatus({ type: 'success', text: '테스트 메시지를 전송했습니다. Slack을 확인해주세요!' });
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.error || '테스트 전송에 실패했습니다.' });
      }
    } catch {
      setStatus({ type: 'error', text: '테스트 중 오류가 발생했습니다.' });
    } finally {
      setIsTesting(false);
    }
  };

  // 토글 핸들러
  const handleToggle = (field: keyof SlackSettings) => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <DisplayHeader title="Slack 알림 설정" screenId={SCREEN_ID} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <DisplayHeader title="Slack 알림 설정" screenId={SCREEN_ID} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4">

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

          {/* 마스터 ON/OFF */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-200 font-semibold">Slack 알림</p>
                <p className="text-gray-400 text-sm mt-0.5">전체 알림 기능을 켜거나 끕니다</p>
              </div>
              <button
                onClick={() => handleToggle('isEnabled')}
                className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
                  settings.isEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
                aria-label="알림 ON/OFF"
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.isEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* 웹훅 설정 섹션 */}
          <SlackWebhookSection
            webhookUrl={settings.webhookUrl}
            channelName={settings.channelName}
            isTesting={isTesting}
            onChange={(field, value) => setSettings((prev) => ({ ...prev, [field]: value }))}
            onTest={handleTest}
          />

          {/* 알림 토글 섹션 */}
          <SlackToggleSection settings={settings} onToggle={handleToggle} />

          {/* 고급 옵션 섹션 */}
          <SlackAdvancedSection
            mentionOnUrgent={settings.mentionOnUrgent}
            dailyReportTime={settings.dailyReportTime}
            onToggleMention={() => handleToggle('mentionOnUrgent')}
            onChangeTime={(val) => setSettings((prev) => ({ ...prev, dailyReportTime: val }))}
          />

          {/* 저장 버튼 */}
          <div className="flex justify-end pt-2 pb-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isSaving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
