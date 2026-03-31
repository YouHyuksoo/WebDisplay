/**
 * @file src/hooks/u1/useU1QualityDashboard.ts
 * @description U1 품질 분석 대시보드 데이터 조회 훅 — QC + RAW 병렬 조회
 *
 * 초보자 가이드:
 * 1. /api/u1/quality-dashboard — QC 테이블 집계 (U1 RAW FPY 포함)
 * 2. /api/u1/quality-dashboard-raw — U1 RAW 검사 테이블 집계
 * 3. 두 API 병렬 호출
 * 4. CTQ 훅과 동일한 인터페이스, 엔드포인트만 u1으로 변경
 */

"use client";

import { useState, useCallback } from "react";
import type { QualityDashboardResponse, RawInsightsResponse } from "@/types/ctq/quality-dashboard";

export function useU1QualityDashboard(selectedLines: string) {
  const [data, setData] = useState<QualityDashboardResponse | null>(null);
  const [rawData, setRawData] = useState<RawInsightsResponse | null>(null);
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
      const qs = params.toString();
      const [qcRes, rawRes] = await Promise.all([
        fetch(`/api/u1/quality-dashboard?${qs}`),
        fetch(`/api/u1/quality-dashboard-raw?${qs}`),
      ]);
      if (!qcRes.ok) throw new Error(`QC API HTTP ${qcRes.status}`);
      if (!rawRes.ok) throw new Error(`RAW API HTTP ${rawRes.status}`);
      const [qcJson, rawJson] = await Promise.all([qcRes.json(), rawRes.json()]);
      setData(qcJson);
      setRawData(rawJson);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines]);

  return { data, rawData, error, loading, fetchData };
}
