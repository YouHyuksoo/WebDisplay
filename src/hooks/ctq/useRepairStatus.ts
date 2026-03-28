/**
 * @file src/hooks/ctq/useRepairStatus.ts
 * @description 수리상태 데이터 조회 훅 -- 수동 새로고침 전용
 *
 * 초보자 가이드:
 * 1. fetchData() 호출 시 API 1회 조회
 * 2. 자동 갱신 없음
 */

"use client";

import { useState, useCallback } from "react";
import type { RepairStatusResponse } from "@/types/ctq/repair-status";

export function useRepairStatus(selectedLines: string[], pidFilter: string = "") {
  const [data, setData] = useState<RepairStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedLines.length > 0) {
        params.set("lines", selectedLines.join(","));
      }
      if (pidFilter.trim()) {
        params.set("pid", pidFilter.trim());
      }
      const res = await fetch(`/api/ctq/repair-status?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RepairStatusResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines, pidFilter]);

  return { data, error, loading, fetchData };
}
