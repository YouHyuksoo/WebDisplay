/**
 * @file src/components/ctq/CtqProviders.tsx
 * @description CTQ 모니터링 클라이언트 Provider 래퍼.
 * 초보자 가이드: 서버 레이아웃에서 클라이언트 Context(LineFilterProvider)를
 * 사용하기 위한 중간 컴포넌트. 서버→클라이언트 경계 브릿지 역할.
 */
'use client';

import { LineFilterProvider } from '@/hooks/ctq/LineFilterContext';

export default function CtqProviders({ children }: { children: React.ReactNode }) {
  return (
    <LineFilterProvider>
      {children}
    </LineFilterProvider>
  );
}
