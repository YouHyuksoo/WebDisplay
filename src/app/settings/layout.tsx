/**
 * @file src/app/settings/layout.tsx
 * @description 설정 페이지 레이아웃 — 라이트/다크 테마 지원
 */
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
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
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
