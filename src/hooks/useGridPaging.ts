/**
 * @file useGridPaging.ts
 * @description 모니터링 그리드의 자동 페이지 순환 훅.
 * 초보자 가이드: 컨테이너 높이를 측정하여 페이지당 행 수를 자동 계산하고,
 * scrollSeconds 간격으로 페이지를 자동 순환한다. 모든 모니터링 그리드에서 공용으로 사용.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

/** 행 높이 추정값 (px) — py-2(16) + text-xl line-height(~32) */
const ROW_HEIGHT = 44;

interface UseGridPagingOptions {
  /** 전체 행 수 */
  totalRows: number;
  /** 자동 순환 간격(초). 0이면 순환 안 함 */
  scrollSeconds: number;
}

interface UseGridPagingResult {
  /** 데이터 행 영역에 연결할 ref */
  bodyRef: React.RefObject<HTMLDivElement | null>;
  /** 현재 페이지에 표시할 시작 인덱스 */
  startIndex: number;
  /** 현재 페이지에 표시할 끝 인덱스 (exclusive) */
  endIndex: number;
  /** 현재 페이지 번호 (0-based) */
  page: number;
  /** 전체 페이지 수 */
  totalPages: number;
}

export function useGridPaging({ totalRows, scrollSeconds }: UseGridPagingOptions): UseGridPagingResult {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);

  /** 컨테이너 높이를 측정하여 페이지당 행 수를 계산 */
  const measure = useCallback(() => {
    if (!bodyRef.current) return;
    const h = bodyRef.current.clientHeight;
    const count = Math.max(1, Math.floor(h / ROW_HEIGHT));
    setRowsPerPage(count);
  }, []);

  useEffect(() => {
    measure();
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => { clearTimeout(timer); timer = setTimeout(measure, 150); };
    window.addEventListener('resize', handler);
    return () => { clearTimeout(timer); window.removeEventListener('resize', handler); };
  }, [measure]);

  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  /** 자동 페이지 순환 */
  useEffect(() => {
    if (totalPages <= 1 || scrollSeconds <= 0) {
      setPage(0);
      return;
    }
    const timer = setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, scrollSeconds * 1000);
    return () => clearInterval(timer);
  }, [totalPages, scrollSeconds]);

  /** 데이터 갱신 시 페이지 범위 초과 보정 */
  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [page, totalPages]);

  return {
    bodyRef,
    startIndex: page * rowsPerPage,
    endIndex: (page + 1) * rowsPerPage,
    page,
    totalPages,
  };
}
