/**
 * @file src/hooks/ctq/LineFilterContext.tsx
 * @description 모니터링 라인 필터 -- 페이지별 독립 저장 (Context + localStorage)
 *
 * 초보자 가이드:
 * 1. **페이지별 저장**: pathname 기반 키로 각 페이지 라인 선택 독립 유지
 *    예: ctq-lines-repeatability, ctq-lines-fpy 등
 * 2. **localStorage**: 새로고침/재방문 시에도 유지
 * 3. **isInitialized**: localStorage 로드 완료 여부 (hydration 보호)
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "ctq-lines-";

/** pathname에서 페이지 키 추출: /monitoring/fpy → fpy */
function getPageKey(pathname: string): string {
  const segments = pathname.replace(/\/$/, "").split("/");
  return segments[segments.length - 1] || "default";
}

interface LineFilterContextType {
  selectedLines: string[];
  setSelectedLines: (lines: string[]) => void;
  isInitialized: boolean;
  hasSelection: boolean;
}

const LineFilterContext = createContext<LineFilterContextType | null>(null);

export function LineFilterProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageKey = getPageKey(pathname);
  const storageKey = `${STORAGE_PREFIX}${pageKey}`;

  const [selectedLines, setSelectedLinesState] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentKey, setCurrentKey] = useState(storageKey);

  /* 페이지 이동 시 해당 페이지의 저장된 라인 로드 (구 키 마이그레이션 포함) */
  useEffect(() => {
    setIsInitialized(false);
    setCurrentKey(storageKey);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedLinesState(parsed);
          setIsInitialized(true);
          return;
        }
      }
      /* per-page 키에 없으면 구 공통 키(ctq-lines)에서 마이그레이션 */
      const legacy = localStorage.getItem("ctq-lines");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedLinesState(parsed);
          localStorage.setItem(storageKey, legacy);
          setIsInitialized(true);
          return;
        }
      }
    } catch {
      /* 파싱 실패 시 무시 */
    }
    /* 해당 페이지 저장값 없으면 빈 배열 → 모달 강제 팝업 */
    setSelectedLinesState([]);
    setIsInitialized(true);
  }, [storageKey]);

  /* 변경 시 현재 페이지 키로 localStorage 저장 */
  const setSelectedLines = useCallback((lines: string[]) => {
    setSelectedLinesState(lines);
    try {
      localStorage.setItem(currentKey, JSON.stringify(lines));
    } catch {
      /* 저장 실패 시 무시 */
    }
  }, [currentKey]);

  return (
    <LineFilterContext.Provider
      value={{
        selectedLines,
        setSelectedLines,
        isInitialized,
        hasSelection: selectedLines.length > 0,
      }}
    >
      {children}
    </LineFilterContext.Provider>
  );
}

export function useLineFilter(): LineFilterContextType {
  const ctx = useContext(LineFilterContext);
  if (!ctx) {
    throw new Error("useLineFilter must be used within LineFilterProvider");
  }
  return ctx;
}
