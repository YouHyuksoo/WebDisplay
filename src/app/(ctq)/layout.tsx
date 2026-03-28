/**
 * @file src/app/(ctq)/layout.tsx
 * @description CTQ 이상점 모니터링 레이아웃.
 * 초보자 가이드:
 * - LocaleProvider: next-intl의 NextIntlClientProvider를 제공 (useTranslations 사용 가능)
 * - LineFilterProvider: 페이지별 라인 선택 상태 관리
 * - 다크 테마 고정 (bg-gray-950)
 */
import type { Metadata } from 'next';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import '../globals.css';

export const metadata: Metadata = {
  title: 'SOLUM CTQ - 이상점 모니터링',
  description: 'CTQ Anomaly Monitoring System',
};

export default function CtqLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
