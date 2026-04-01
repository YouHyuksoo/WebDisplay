/**
 * @file src/hooks/ctq/useEquipmentHistory.ts
 * @description 설비점검이력 데이터 조회 훅 — 날짜 구간 지원
 *
 * 초보자 가이드:
 * 1. fetchData() 호출 시 API 1회 조회
 * 2. from/to로 구간 조회, 미지정 시 당일
 */

"use client";

import { useState, useCallback } from "react";
import type { EquipmentHistoryResponse } from "@/types/ctq/equipment-history";

export function useEquipmentHistory(selectedLines: string, fromDate: string, toDate: string) {
  const [data, setData] = useState<EquipmentHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedLines && selectedLines !== "%") params.set("lines", selectedLines);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/ctq/equipment-history?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EquipmentHistoryResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines, fromDate, toDate]);

  return { data, error, loading, fetchData };
}
