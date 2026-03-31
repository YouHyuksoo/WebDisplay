/**
 * @file src/components/u1/slack/SlackToggleSection.tsx
 * @description
 * Slack 알림 조건 토글 섹션 컴포넌트입니다.
 * MES 이벤트별로 알림 수신 여부를 개별 설정합니다.
 *
 * 초보자 가이드:
 * 1. 각 토글은 독립적으로 ON/OFF 가능
 * 2. 마스터 스위치(isEnabled)가 OFF이면 모든 알림이 차단됨
 * 3. 설명 텍스트로 각 알림의 발생 조건 안내
 */

'use client';

import type { SlackSettings } from '@/app/(u1)/u1/slack-settings/page';

interface SlackToggleSectionProps {
  settings: SlackSettings;
  onToggle: (field: keyof SlackSettings) => void;
}

/** 알림 항목 정의 */
const NOTIFY_ITEMS = [
  {
    field: 'notifyPassRateDrop' as keyof SlackSettings,
    emoji: '📉',
    label: '합격률 급락 알림',
    desc: '합격률이 임계값(90%) 미만일 때',
    color: 'text-red-400',
  },
  {
    field: 'notifyNgSpike' as keyof SlackSettings,
    emoji: '⚡',
    label: 'NG 급증 알림',
    desc: 'NG 건수가 급격히 증가할 때',
    color: 'text-yellow-400',
  },
  {
    field: 'notifyLineStop' as keyof SlackSettings,
    emoji: '🛑',
    label: '라인 정지 알림',
    desc: '생산 라인 정지 발생 시',
    color: 'text-red-500',
  },
  {
    field: 'notifyEquipmentDown' as keyof SlackSettings,
    emoji: '🔧',
    label: '설비 이상 알림',
    desc: '설비 장시간(60분 이상) 정지 시',
    color: 'text-purple-400',
  },
  {
    field: 'notifyDailyReport' as keyof SlackSettings,
    emoji: '📋',
    label: '일일 요약 리포트',
    desc: '매일 지정 시간에 생산 요약 발송',
    color: 'text-green-400',
  },
];

/**
 * 알림 조건 토글 목록 섹션
 */
export default function SlackToggleSection({ settings, onToggle }: SlackToggleSectionProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-2">
      <h3 className="text-gray-200 font-semibold flex items-center gap-2 mb-3">
        <span className="text-blue-400">🔔</span>
        알림 조건
      </h3>
      <p className="text-gray-500 text-sm -mt-1 mb-3">
        어떤 이벤트가 발생했을 때 Slack 알림을 받을지 선택하세요
      </p>

      {NOTIFY_ITEMS.map((item) => (
        <label
          key={item.field}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className={`text-lg ${item.color}`}>{item.emoji}</span>
            <div>
              <p className="text-gray-200 text-sm font-medium">{item.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          </div>
          <button
            onClick={() => onToggle(item.field)}
            className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none flex-shrink-0 ${
              settings[item.field] ? 'bg-blue-600' : 'bg-gray-600'
            }`}
            aria-label={item.label}
            type="button"
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings[item.field] ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>
      ))}
    </div>
  );
}
