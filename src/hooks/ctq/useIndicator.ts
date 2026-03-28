/**
 * @file src/hooks/ctq/useIndicator.ts
 * @description 지표 데이터 fetch 훅 -- 월간 전용, 재생성/대책서 등록 지원
 *
 * 초보자 가이드:
 * 1. fetchData()로 /api/ctq/indicator에서 캐시 데이터 조회
 * 2. fetchData(true)로 RAW 테이블에서 재생성
 * 3. registerCountermeasure()로 대책서번호 등록
 */

import { useState, useCallback } from "react";
import type { IndicatorResponse } from "@/types/ctq/indicator";

export function useIndicator(minVolume: number = 200) {
  const [data, setData] = useState<IndicatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (regenerate = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (minVolume !== 200) params.set("minVolume", String(minVolume));
      if (regenerate) params.set("regenerate", "true");
      const qs = params.toString();
      const res = await fetch(`/api/ctq/indicator${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: IndicatorResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [minVolume]);

  const registerCountermeasure = useCallback(async (
    targetMonth: string,
    itemCode: string,
    processCode: string,
    countermeasureNo: string
  ) => {
    const res = await fetch("/api/ctq/indicator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetMonth, itemCode, processCode, countermeasureNo }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fetchData();
  }, [fetchData]);

  return { data, error, loading, fetchData, registerCountermeasure };
}
