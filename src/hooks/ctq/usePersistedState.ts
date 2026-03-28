/**
 * @file src/hooks/ctq/usePersistedState.ts
 * @description localStorage에 자동 저장/복원하는 useState 대체 훅
 *
 * 초보자 가이드:
 * 1. useState와 동일하게 사용하되, 값이 localStorage에 자동 저장됨
 * 2. 페이지 전환이나 새로고침해도 마지막 설정값이 유지됨
 * 3. key: localStorage에 저장할 키 이름
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;
      const parsed = JSON.parse(saved) as T;
      if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...parsed };
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [key, state]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  return [state, setValue];
}
