/**
 * @file src/hooks/ctq/useAutoRolling.ts
 * @description 모니터링 화면 자동 롤링 훅
 *
 * 초보자 가이드:
 * 1. **페이지 분할**: 전체 카드를 N개씩 나눠 페이지별로 표시
 * 2. **자동 전환**: 설정된 간격(기본 10초)마다 다음 페이지로 전환
 * 3. **루프**: 마지막 페이지 → 첫 페이지로 순환
 * 4. **진행바**: 남은 시간을 시각적으로 표시
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseAutoRollingOptions {
  totalItems: number;
  itemsPerPage: number;
  intervalMs: number;
  enabled: boolean;
}

export function useAutoRolling({
  totalItems,
  itemsPerPage,
  intervalMs,
  enabled,
}: UseAutoRollingOptions) {
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const goToNext = useCallback(() => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
    startTimeRef.current = Date.now();
    setProgress(0);
  }, [totalPages]);

  /* 페이지 수 변경 시 범위 보정 */
  useEffect(() => {
    setCurrentPage((prev) => (prev >= totalPages ? 0 : prev));
  }, [totalPages]);

  /** 모달이 열려있으면 true (DOM 속성 기반 감지) */
  const isModalOpen = useCallback(() => {
    return typeof document !== "undefined" && document.querySelector("[data-ng-modal]") !== null;
  }, []);

  /* 자동 전환 타이머 */
  useEffect(() => {
    if (!enabled || totalPages <= 1) {
      setProgress(0);
      return;
    }

    startTimeRef.current = Date.now();

    const pageTimer = setInterval(() => {
      if (!isModalOpen()) goToNext();
    }, intervalMs);
    const progressTimer = setInterval(() => {
      if (isModalOpen()) return;
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / intervalMs) * 100, 100));
    }, 100);

    return () => {
      clearInterval(pageTimer);
      clearInterval(progressTimer);
    };
  }, [enabled, intervalMs, totalPages, goToNext, isModalOpen]);

  const startIdx = currentPage * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);

  return {
    currentPage,
    totalPages,
    startIdx,
    endIdx,
    progress,
    setCurrentPage,
  };
}
