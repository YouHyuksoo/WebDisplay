/**
 * @file src/app/settings/layout.tsx
 * @description 설정 페이지 레이아웃 — 라이트/다크 테마 + 좌측 탭 네비.
 *
 * 초보자 가이드:
 * 1. ThemeProvider/LocaleProvider로 테마·다국어 컨텍스트 제공
 * 2. 좌측 SettingsTabNav + 우측 main으로 탭 구조 구성
 * 3. main은 overflow-y-auto로 본문 스크롤 처리
 */
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import SettingsTabNav from "./_components/SettingsTabNav";
import "../globals.css";

export const metadata: Metadata = {
  title: "SOLUM MES - 설정",
};

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white antialiased">
        <ThemeProvider>
          <LocaleProvider>
            <div className="flex h-screen">
              <SettingsTabNav />
              <main className="min-w-0 flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
