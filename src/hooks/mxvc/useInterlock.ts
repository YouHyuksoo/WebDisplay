/**
 * @file src/hooks/mxvc/useInterlock.ts
 * @description 인터락호출이력 폴링 훅 — 서버 페이징 지원
 * 초보자 가이드:
 * 1. /api/mxvc/interlock?page=N&pageSize=30 에서 데이터 fetch
 * 2. fetchData를 useCallback으로 안정화
 * 3. 에러 시 이전 data 유지
 */
"use client";

import { useState, useCallback } from "react";
import type { InterlockResponse } from "@/types/mxvc/interlock";

export function useInterlock(page: number = 1, pageSize: number = 30) {
  const [data, setData] = useState<InterlockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mxvc/interlock?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InterlockResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  return { data, loading, error, fetchData };
}
