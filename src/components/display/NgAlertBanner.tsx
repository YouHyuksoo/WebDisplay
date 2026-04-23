/**
 * @file NgAlertBanner.tsx
 * @description NG(불량) 경고 배너 — 제네릭 공통 컴포넌트.
 * 초보자 가이드: NG 건수가 1건 이상일 때 빨간색 배경 + animate-pulse(번쩍임)로 시각 경고를 표시한다.
 * PB 원본에서는 f_play_sound()로 사운드를 재생했으나, 웹에서는 이 시각적 배너로 대체한다.
 *
 * 기존에 5개 화면(MSL, Solder, TempHumidity, SmtPickupRateBase, SmtPickupRateHead)마다
 * 별도 배너 파일이 있었으나, 메시지만 다르고 구조가 동일해 이 컴포넌트로 통합했다.
 *
 * @example
 * // 아이콘 있는 배너 (MSL, Solder, TempHumidity 스타일)
 * <NgAlertBanner message={`MSL NG 경고: ${count}건 발생`} />
 *
 * // 아이콘 없는 배너 (SmtPickupRate 스타일)
 * <NgAlertBanner message={`Pickup Rate NG Warning: ${count} line(s) detected`} showIcon={false} compact />
 */
'use client';

/** NgAlertBanner에 전달하는 Props */
export interface NgAlertBannerProps {
  /** 배너에 표시할 메시지 텍스트 */
  message: string;
  /** 양쪽에 경고 아이콘(삼각형) 표시 여부 (기본: true) */
  showIcon?: boolean;
  /** true이면 콤팩트 스타일 (SmtPickupRate 용) — 패딩/폰트가 작아진다 (기본: false) */
  compact?: boolean;
}

/** 경고 삼각형 SVG 아이콘 */
function WarningIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

/** NG 경고 배너 — 빨간 배경 + animate-pulse로 번쩍임 */
export default function NgAlertBanner({
  message,
  showIcon = true,
  compact = false,
}: NgAlertBannerProps) {
  if (compact) {
    return (
      <div className="animate-pulse bg-pink-600 px-4 py-2 text-center text-lg font-bold text-white dark:bg-pink-700">
        {message}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 animate-pulse items-center justify-center gap-6 bg-pink-600 px-6 py-3 text-2xl font-black text-white">
      {showIcon && <WarningIcon />}
      {message}
      {showIcon && <WarningIcon />}
    </div>
  );
}
