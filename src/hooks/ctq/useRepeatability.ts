/**
 * @file src/hooks/ctq/useRepeatability.ts
 * @description 반복성 모니터링 데이터 폴링 훅
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { RepeatabilityResponse } from "@/types/ctq/repeatability";

export function useRepeatability(intervalMs = 30000, selectedLines: string[] = [], enabled = true) {
  const [data, setData] = useState<RepeatabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const linesParam = selectedLines.length > 0 ? `?lines=${selectedLines.join(",")}` : "";

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/ctq/repeatability${linesParam}`, { cache: "no-store" });
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
    const timer = setInterval(fetchData, intervalMs);
    return () => clearInterval(timer);
  }, [fetchData, intervalMs, enabled]);

  return { data, error, loading };
}
