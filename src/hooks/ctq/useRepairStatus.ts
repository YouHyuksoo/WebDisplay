/**
 * @file src/hooks/ctq/useRepairStatus.ts
 * @description 수리상태 데이터 조회 훅 -- 날짜 범위 필수, 수동 새로고침 전용
 *
 * 초보자 가이드:
 * 1. fetchData() 호출 시 /api/ctq/repair-status 1회 조회
 * 2. dateFrom/dateTo 필수 (YYYY-MM-DD) -- 시작일 08:00 ~ 종료일 익일 08:00 범위
 * 3. 자동 갱신 없음
 */

"use client";

import { useState, useCallback } from "react";
import type { RepairStatusResponse } from "@/types/ctq/repair-status";

export function useRepairStatus(
  selectedLines: string,
  pidFilter: string = "",
  dateFrom: string = "",
  dateTo: string = ""
) {
  const [data, setData] = useState<RepairStatusResponse | null>(null);
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
      if (pidFilter.trim()) {
        params.set("pid", pidFilter.trim());
      }
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/ctq/repair-status?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RepairStatusResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines, pidFilter, dateFrom, dateTo]);

  return { data, error, loading, fetchData };
}
