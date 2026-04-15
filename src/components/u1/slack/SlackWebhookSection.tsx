/**
 * @file src/components/u1/slack/SlackWebhookSection.tsx
 * @description
 * Slack 웹훅 URL과 채널명 입력 섹션 컴포넌트입니다.
 *
 * 초보자 가이드:
 * 1. webhookUrl: https://hooks.slack.com/services/... 형식
 * 2. channelName: 표시용 채널명 (#alerts 등), 실제 채널은 웹훅에서 결정
 * 3. 테스트 버튼으로 연동 확인 가능
 */

'use client';

import { useTranslations } from 'next-intl';

interface SlackWebhookSectionProps {
  webhookUrl: string;
  channelName: string;
  isTesting: boolean;
  onChange: (field: 'webhookUrl' | 'channelName', value: string) => void;
  onTest: () => void;
}

/**
 * 웹훅 URL + 채널명 입력 + 테스트 버튼 섹션
 */
export default function SlackWebhookSection({
  webhookUrl,
  channelName,
  isTesting,
  onChange,
  onTest,
}: SlackWebhookSectionProps) {
  const t = useTranslations('ctq.pages.slackSettings');

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-4">
      <h3 className="text-gray-200 font-semibold flex items-center gap-2">
        <span className="text-blue-400">🔗</span>
        {t('webhookSettings')}
      </h3>

      {/* 웹훅 URL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {t('webhookUrl')} <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => onChange('webhookUrl', e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          {t('webhookUrlDesc')}
        </p>
      </div>

      {/* 채널명 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {t('channelName')} <span className="text-gray-500">{t('optional')}</span>
        </label>
        <input
          type="text"
          value={channelName}
          onChange={(e) => onChange('channelName', e.target.value)}
          placeholder="#mes-alerts"
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          {t('channelNameDesc')}
        </p>
      </div>

      {/* 테스트 버튼 */}
      <button
        onClick={onTest}
        disabled={isTesting || !webhookUrl}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-600"
      >
        <span>{isTesting ? '⏳' : '📨'}</span>
        {isTesting ? t('sending') : t('testMessageSend')}
      </button>
    </div>
  );
}
