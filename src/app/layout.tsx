/**
 * @file layout.tsx
 * @description 루트 레이아웃. 100vh 고정, 다크 테마 기본, 글로우 테마 CSS 변수 적용.
 * 모든 페이지(메뉴/디스플레이)가 이 레이아웃을 공유한다.
 */
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLUM MES Display",
  description: "Manufacturing Execution System Display Monitor",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-white text-zinc-900 antialiased dark:bg-[#050508] dark:text-white">
        <ThemeProvider>
          <LocaleProvider>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
