/**
 * @file src/hooks/ctq/useNonConsecutive.ts
 * @description B급 비연속 동일위치 불량 데이터 폴링 훅
 *
 * 초보자 가이드:
 * - 비연속 불량 API를 주기적으로 폴링하여 데이터를 갱신
 * - RepeatabilityResponse 타입을 반복성과 동일하게 재사용
 */

import { useState, useEffect, useCallback } from "react";
import type { RepeatabilityResponse } from "@/types/ctq/non-consecutive";

export function useNonConsecutive(intervalMs: number, selectedLines: string[] = [], enabled = true) {
  const [data, setData] = useState<RepeatabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const linesParam = selectedLines.length > 0 ? `?lines=${selectedLines.join(",")}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ctq/non-consecutive${linesParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RepeatabilityResponse = await res.json();
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
