/**
 * @file src/hooks/mxvc/useMxvcPChart.ts
 * @description 멕시코전장 p 관리도 데이터 fetch 훅
 *
 * 초보자 가이드:
 * 1. /api/mxvc/p-chart에서 13개 테이블 바코드 단위 불량률 관리도 조회
 * 2. dateFrom/dateTo를 쿼리 파라미터로 전달
 */
"use client";

import { useState, useCallback } from "react";

export interface DailyP {
  date: string;
  dateLabel: string;
  total: number;
  pass: number;
  p: number;
  ucl: number;
  lcl: number;
}

export interface TablePData {
  daily: DailyP[];
  stats: {
    total: number;
    pass: number;
    pBar: number;
    oocCount: number;
  };
}

export interface PChartResponse {
  tables: Record<string, TablePData>;
  workDay: { start: string; end: string };
  lastUpdated: string;
}

export function useMxvcPChart(dateFrom: string, dateTo: string) {
  const [data, setData] = useState<PChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();
      const res = await fetch(`/api/mxvc/p-chart${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PChartResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  return { data, loading, error, fetchData };
}
