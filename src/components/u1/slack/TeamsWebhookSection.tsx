/**
 * @file src/components/u1/slack/TeamsWebhookSection.tsx
 * @description
 * Microsoft Teams 웹훅 URL과 채널명 입력 섹션 컴포넌트입니다.
 *
 * 초보자 가이드:
 * 1. webhookUrl: Teams 채널의 Incoming Webhook URL
 *    (채널 → ... → 커넥터 → Incoming Webhook → 구성)
 * 2. channelName: 표시용 채널명, 실제 채널은 웹훅에서 결정
 * 3. 테스트 버튼으로 연동 확인 가능
 */

'use client';

interface TeamsWebhookSectionProps {
  webhookUrl: string;
  channelName: string;
  isEnabled: boolean;
  isTesting: boolean;
  onChange: (field: 'teamsWebhookUrl' | 'teamsChannelName', value: string) => void;
  onToggle: () => void;
  onTest: () => void;
}

/**
 * Teams 웹훅 URL + 채널명 입력 + ON/OFF + 테스트 버튼 섹션
 */
export default function TeamsWebhookSection({
  webhookUrl,
  channelName,
  isEnabled,
  isTesting,
  onChange,
  onToggle,
  onTest,
}: TeamsWebhookSectionProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-4">
      {/* 헤더: 타이틀 + ON/OFF 토글 */}
      <div className="flex items-center justify-between">
        <h3 className="text-gray-200 font-semibold flex items-center gap-2">
          <span className="text-purple-400">🔷</span>
          Microsoft Teams 웹훅 설정
        </h3>
        <button
          onClick={onToggle}
          className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
            isEnabled ? 'bg-purple-600' : 'bg-gray-600'
          }`}
          aria-label="Teams 알림 ON/OFF"
          type="button"
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            isEnabled ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* 웹훅 URL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Teams 웹훅 URL <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => onChange('teamsWebhookUrl', e.target.value)}
          placeholder="https://your-org.webhook.office.com/webhookb2/..."
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder:text-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono text-sm"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Teams 채널 → ⋯ → 커넥터 → Incoming Webhook → 구성 → URL 복사
        </p>
      </div>

      {/* 채널명 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          채널명 <span className="text-gray-500">(선택)</span>
        </label>
        <input
          type="text"
          value={channelName}
          onChange={(e) => onChange('teamsChannelName', e.target.value)}
          placeholder="MES-알림"
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder:text-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          표시용 채널명입니다. 실제 전송 채널은 웹훅 설정에서 결정됩니다.
        </p>
      </div>

      {/* 테스트 버튼 */}
      <button
        onClick={onTest}
        disabled={isTesting || !webhookUrl}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-600"
      >
        <span>{isTesting ? '⏳' : '📨'}</span>
        {isTesting ? '전송 중...' : 'Teams 테스트 메시지 전송'}
      </button>
    </div>
  );
}
