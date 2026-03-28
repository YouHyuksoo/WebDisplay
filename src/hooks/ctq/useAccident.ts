/**
 * @file src/hooks/ctq/useAccident.ts
 * @description 사고성 모니터링 데이터 폴링 훅
 *
 * 초보자 가이드:
 * - intervalMs 주기로 /api/ctq/accident 엔드포인트를 폴링
 * - selectedLines: 라인 필터 (쉼표 구분 문자열)
 * - enabled=false 시 폴링 중지
 */

import { useState, useEffect, useCallback } from "react";
import type { AccidentResponse } from "@/types/ctq/accident";

export function useAccident(intervalMs: number, selectedLines: string[] = [], enabled = true) {
  const [data, setData] = useState<AccidentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const linesParam = selectedLines.length > 0 ? `?lines=${selectedLines.join(",")}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ctq/accident${linesParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AccidentResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [linesParam]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs, enabled]);

  return { data, error, loading };
}
