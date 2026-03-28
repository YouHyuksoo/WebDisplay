/**
 * @file src/hooks/ctq/useEquipment.ts
 * @description 설비이상 데이터 조회 훅 - 수동 새로고침 전용
 *
 * 초보자 가이드:
 * 1. fetchData() 호출 시 API 1회 조회
 * 2. selectedLines 변경 시 fetchData 함수가 재생성됨
 */

"use client";

import { useState, useCallback } from "react";
import type { EquipmentResponse } from "@/types/ctq/equipment";

export function useEquipment(selectedLines: string) {
  const [data, setData] = useState<EquipmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedLines && selectedLines !== "%") {
        params.set("lines", selectedLines);
      }
      const res = await fetch(`/api/ctq/equipment?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EquipmentResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines]);

  return { data, error, loading, fetchData };
}
