/**
 * @file src/app/(mxvc)/layout.tsx
 * @description 멕시코전장모니터링 레이아웃.
 * 초보자 가이드:
 * - ThemeProvider로 라이트/다크 테마 전환 지원
 * - display-theme.css로 CSS 변수 기반 테마 적용
 * - display 레이아웃과 동일한 구조
 */
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { FooterProvider } from '@/components/providers/FooterProvider';
import '../globals.css';
import '../(display)/display-theme.css';

export const metadata: Metadata = {
  title: 'SOLUM MES - 멕시코전장모니터링',
  description: 'Mexico VC Monitoring',
};

export default function MxvcLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-background text-foreground antialiased dark:bg-background-dark dark:text-white">
        <ThemeProvider>
          <LocaleProvider>
            <FooterProvider>
              {children}
            </FooterProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
