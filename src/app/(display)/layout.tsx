/**
 * @file layout.tsx
 * @description (display) 현황판 모니터링 전용 레이아웃.
 * WBS Master DESIGN_GUIDELINE 테마를 로드하고 100vh 스크롤 고정을 적용합니다.
 */
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { FooterProvider } from "@/components/providers/FooterProvider";
import DisplayFooter from "@/components/display/DisplayFooter";
import "../globals.css";
import "./display-theme.css";

export const metadata: Metadata = {
  title: "SOLUM MES Display - Monitoring",
  description: "Manufacturing Execution System Display Monitor Screens",
};

export default function DisplayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-background text-foreground antialiased dark:bg-background-dark dark:text-white">
        <ThemeProvider>
          <LocaleProvider>
            <TooltipProvider>
              <FooterProvider>
                <div className="flex flex-col h-screen overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    {children}
                  </div>
                  <DisplayFooter />
                </div>
              </FooterProvider>
            </TooltipProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
