/**
 * @file src/components/u1/slack/SlackAdvancedSection.tsx
 * @description
 * Slack 알림 고급 옵션 섹션 컴포넌트입니다.
 * @channel 멘션과 일일 리포트 전송 시간을 설정합니다.
 *
 * 초보자 가이드:
 * 1. **mentionOnUrgent**: 긴급 상황 시 채널 전체에 @channel 멘션 전송
 * 2. **dailyReportTime**: 매일 이 시간에 일일 리포트가 발송됨 (비어있으면 비활성)
 */

'use client';

import { useTranslations } from 'next-intl';

interface SlackAdvancedSectionProps {
  mentionOnUrgent: boolean;
  dailyReportTime: string;
  onToggleMention: () => void;
  onChangeTime: (value: string) => void;
}

/**
 * 고급 옵션 (멘션 + 일일 리포트 시간) 섹션
 */
export default function SlackAdvancedSection({
  mentionOnUrgent,
  dailyReportTime,
  onToggleMention,
  onChangeTime,
}: SlackAdvancedSectionProps) {
  const t = useTranslations('ctq.pages.slackSettings');

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-4">
      <h3 className="text-gray-200 font-semibold flex items-center gap-2">
        <span className="text-blue-400">⚙️</span>
        {t('advancedOptions')}
      </h3>

      {/* 긴급 시 @channel 멘션 */}
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-lg text-orange-400">📢</span>
          <div>
            <p className="text-gray-200 text-sm font-medium">{t('mentionOnUrgent')}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {t('mentionOnUrgentDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={onToggleMention}
          className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none flex-shrink-0 ${
            mentionOnUrgent ? 'bg-blue-600' : 'bg-gray-600'
          }`}
          aria-label={t('mentionOnUrgent')}
          type="button"
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            mentionOnUrgent ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* 일일 리포트 시간 */}
      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg text-green-400">📅</span>
          <div>
            <p className="text-gray-200 text-sm font-medium">{t('dailyReportTime')}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {t('dailyReportTimeDesc')}
            </p>
          </div>
        </div>
        <input
          type="time"
          value={dailyReportTime}
          onChange={(e) => onChangeTime(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
        />
      </div>
    </div>
  );
}
