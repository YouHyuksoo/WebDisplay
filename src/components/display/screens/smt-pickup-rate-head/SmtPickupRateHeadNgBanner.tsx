/**
 * @file SmtPickupRateHeadNgBanner.tsx
 * @description SMT 픽업률(HEAD) NG 경고 배너. NG 건수가 1 이상이면 빨간 배경 + 깜빡임으로 경고.
 * 초보자 가이드: PB 원본에서는 NG 시 사운드를 재생했으나, 웹에서는 시각적 배너로 대체.
 */
'use client';

interface SmtPickupRateHeadNgBannerProps {
  count: number;
}

export default function SmtPickupRateHeadNgBanner({ count }: SmtPickupRateHeadNgBannerProps) {
  return (
    <div className="animate-pulse bg-red-600 px-4 py-2 text-center text-lg font-bold text-white dark:bg-red-700">
      Pickup Rate (Head) NG Warning: {count} line(s) detected
    </div>
  );
}
