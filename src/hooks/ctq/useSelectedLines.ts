/**
 * @file useSelectedLines.ts
 * @description 화면별 라인 선택 상태 훅 — localStorage + window event 패턴.
 * 초보자 가이드:
 * - DisplayHeader의 LineSelectModal에서 저장한 라인 선택을 읽어옴
 * - `display-lines-{screenId}` localStorage 키 사용
 * - `line-config-changed-{screenId}` 이벤트로 실시간 동기화
 * - 반환값: `"%"` (전체) 또는 `"S01,S02,S03"` (콤마 구분)
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 화면별 선택된 라인을 localStorage에서 읽고, 변경 이벤트를 구독하는 훅
 * @param screenId - 화면별 고유 ID (localStorage 키에 사용)
 * @returns 콤마 구분 라인 코드 문자열 또는 '%' (전체)
 */
export function useSelectedLines(screenId: string): string {
  const [selectedLines, setSelectedLines] = useState<string>('%');

  const readLines = useCallback(() => {
    try {
      const saved = localStorage.getItem(`display-lines-${screenId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedLines(parsed.includes('%') ? '%' : parsed.join(','));
        }
      }
    } catch { /* 무시 */ }
  }, [screenId]);

  useEffect(() => {
    readLines();
    const handler = () => readLines();
    window.addEventListener(`line-config-changed-${screenId}`, handler);
    return () => window.removeEventListener(`line-config-changed-${screenId}`, handler);
  }, [screenId, readLines]);

  return selectedLines;
}
