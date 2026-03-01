'use client';

import { useEffect } from 'react';
import { init, cleanup } from '@/lib/menu/tooltip';

/**
 * 전역 툴팁 시스템 초기화 제공자
 * 모든 페이지에서 커스텀 풍선 도움말이 작동하도록 합니다.
 */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 툴팁 시스템 초기화
    init();
    
    return () => {
      // 컴포넌트 언마운트 시 정리
      cleanup();
    };
  }, []);

  return <>{children}</>;
}
