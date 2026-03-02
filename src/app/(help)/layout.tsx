/**
 * @file layout.tsx
 * @description (help) 도움말 페이지 전용 레이아웃.
 * 초보자 가이드: 다크 테마 기반이며, 디스플레이와 달리 스크롤이 가능한 레이아웃.
 */
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import "../globals.css";

export const metadata: Metadata = {
  title: "SOLUM MES Display - Help",
  description: "MES Display System Help & Documentation",
};

export default function HelpLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 text-zinc-200 antialiased dark:bg-zinc-950 dark:text-zinc-200">
        <ThemeProvider>
          <LocaleProvider>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
