/**
 * @file ThemeProvider.tsx
 * @description next-themes 기반 테마 프로바이더. 라이트/다크 모드 지원.
 */
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
