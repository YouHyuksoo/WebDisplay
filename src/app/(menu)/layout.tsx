/**
 * @file layout.tsx
 * @description (menu) 전용 레이아웃. 기존 mydesktop 글로우 테마와 CSS 변수를 로드합니다.
 */
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import "../globals.css";
import "./menu-theme.css";

export const metadata: Metadata = {
  title: "SOLUM MES Display - Menu",
  description: "Manufacturing Execution System Display Monitor Menu",
};

export default function MenuLayout({
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
