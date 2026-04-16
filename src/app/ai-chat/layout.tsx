/**
 * @file src/app/ai-chat/layout.tsx
 * @description AI 챗 페이지 독립 레이아웃 — html/body + ThemeProvider + LocaleProvider.
 *
 * 초보자 가이드:
 * - Next.js App Router에서 route group 밖 경로는 자체 root layout 필요
 * - (display)/(menu) 등과 같은 패턴으로 Providers를 감싸야 다국어·테마 동작
 */
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { TooltipProvider } from '@/components/providers/TooltipProvider';
import { FooterProvider } from '@/components/providers/FooterProvider';
import '../globals.css';
import '../(display)/display-theme.css';

export const metadata: Metadata = {
  title: 'SOLUM MES - AI 어시스턴트',
};

export default function AiChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-background text-foreground antialiased dark:bg-background-dark dark:text-white">
        <ThemeProvider>
          <LocaleProvider>
            <TooltipProvider>
              <FooterProvider>
                {children}
              </FooterProvider>
            </TooltipProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
