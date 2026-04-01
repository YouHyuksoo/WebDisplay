/**
 * @file src/hooks/ctq/useFpy.ts
 * @description 직행율 데이터 fetch 훅
 *
 * 초보자 가이드:
 * 1. fetchData() 호출 시 /api/ctq/fpy 에서 데이터 조회
 * 2. 외부에서 polling 주기를 제어 (useEffect + setInterval)
 */

import { useState, useCallback } from "react";
import type { FpyResponse } from "@/types/ctq/fpy";

export function useFpy(selectedLines: string = "%") {
  const [data, setData] = useState<FpyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedLines && selectedLines !== "%" ? `?lines=${encodeURIComponent(selectedLines)}` : "";
      const res = await fetch(`/api/ctq/fpy${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FpyResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines]);

  return { data, error, loading, fetchData };
}
