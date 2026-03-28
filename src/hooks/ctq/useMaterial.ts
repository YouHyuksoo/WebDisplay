/**
 * @file src/hooks/ctq/useMaterial.ts
 * @description 원자재 동일부품 데이터 폴링 훅 (자동 갱신)
 *
 * 초보자 가이드:
 * 1. intervalMs 간격으로 자동 갱신
 * 2. enabled=false 면 폴링 차단 (라인 필터 초기화 전)
 */

import { useState, useEffect, useCallback } from "react";
import type { MaterialResponse } from "@/types/ctq/material";

export function useMaterial(intervalMs: number, selectedLines: string[] = [], enabled = true) {
  const [data, setData] = useState<MaterialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const linesParam = selectedLines.length > 0 ? `?lines=${selectedLines.join(",")}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ctq/material${linesParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MaterialResponse = await res.json();
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
