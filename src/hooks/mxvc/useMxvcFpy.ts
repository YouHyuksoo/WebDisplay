/**
 * @file src/hooks/mxvc/useMxvcFpy.ts
 * @description 멕시코전장 직행율 데이터 fetch 훅
 *
 * 초보자 가이드:
 * 1. /api/mxvc/fpy에서 13개 테이블 직행율 조회
 * 2. selectedEquipments, dayOffset을 쿼리 파라미터로 전달
 * 3. fetchData를 useCallback으로 안정화하여 useEffect 의존성 관리
 */
"use client";

import { useState, useCallback } from "react";
import type { MxvcFpyResponse } from "@/types/mxvc/fpy";

export function useMxvcFpy(selectedEquipments: string[], dayOffset: number) {
  const [data, setData] = useState<MxvcFpyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eqKey = selectedEquipments.sort().join(",");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eqKey) params.set("equipments", eqKey);
      if (dayOffset !== 0) params.set("dayOffset", String(dayOffset));
      const qs = params.toString();
      const res = await fetch(`/api/mxvc/fpy${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MxvcFpyResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [eqKey, dayOffset]);

  return { data, loading, error, fetchData };
}
