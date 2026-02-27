/**
 * @file useAutoScroll.ts
 * @description 자동 스크롤 훅. 데이터 테이블이 화면을 초과할 때 자동으로 페이지 단위 스크롤.
 * 초보자 가이드: 공장 모니터에서 데이터가 많으면 자동으로 스크롤하여 모든 데이터를 보여준다.
 * 맨 아래 도달 시 맨 위로 되돌아간다 (PB Gvi_scroll_timer 패턴 유지).
 */
'use client';

import { useEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  /** 스크롤할 컨테이너의 ref */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 자동 스크롤 활성화 여부 */
  enabled?: boolean;
  /** 스크롤 간격 (ms) */
  interval?: number;
}

/**
 * 데이터 영역 자동 스크롤 훅.
 * 컨테이너의 높이를 초과하는 콘텐츠가 있을 때 주기적으로 페이지 단위 스크롤한다.
 * @param {UseAutoScrollOptions} options - 스크롤 옵션
 */
export function useAutoScroll({
  containerRef,
  enabled = true,
  interval = 5000,
}: UseAutoScrollOptions) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    timerRef.current = setInterval(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      /* 스크롤이 불필요하면 무시 */
      if (scrollHeight <= clientHeight) return;

      /* 맨 아래 도달 시 맨 위로 복귀 */
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ top: clientHeight, behavior: 'smooth' });
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [containerRef, enabled, interval]);
}
