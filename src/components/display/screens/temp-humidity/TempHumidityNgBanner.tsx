/**
 * @file TempHumidityNgBanner.tsx
 * @description 온습도 NG/WN 경고 배너. 이상 건수가 1건 이상이면 빨간색 번쩍이는 배너를 표시.
 * 초보자 가이드: PB 원본의 f_play_sound('temparture.wav') 대신 시각적 경고 배너로 대체.
 */
'use client';

interface TempHumidityNgBannerProps {
  count: number;
}

/** 온습도 NG 경고 배너 — 빨간 배경 + animate-pulse로 번쩍임 */
export default function TempHumidityNgBanner({ count }: TempHumidityNgBannerProps) {
  return (
    <div className="flex shrink-0 animate-pulse items-center justify-center gap-6 bg-red-600 px-6 py-3 text-2xl font-black text-white">
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      Temperature / Humidity NG: {count}건 발생
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
  );
}
