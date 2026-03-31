/**
 * @file src/app/(u1)/layout.tsx
 * @description U1전용 모니터링 레이아웃.
 * 초보자 가이드:
 * - LocaleProvider: next-intl의 NextIntlClientProvider를 제공 (useTranslations 사용 가능)
 * - FooterProvider: 글로벌 푸터 상태 관리
 * - 다크 테마 고정 (bg-gray-950)
 */
import type { Metadata } from 'next';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { FooterProvider } from '@/components/providers/FooterProvider';
import '../globals.css';

export const metadata: Metadata = {
  title: 'SOLUM U1 - 전용 모니터링',
  description: 'U1 Dedicated Monitoring System',
};

export default function U1Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <LocaleProvider>
          <FooterProvider>
            {children}
          </FooterProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
