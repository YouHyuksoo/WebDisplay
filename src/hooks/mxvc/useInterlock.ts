/**
 * @file src/hooks/mxvc/useInterlock.ts
 * @description 인터락호출이력 훅 — 공정별 카드 + 상세 이력 페이징
 * 초보자 가이드:
 * 1. useInterlock: 전체 공정 카드 목록 폴링 (각 카드에 최근 10건)
 * 2. useInterlockDetail: 특정 공정 이력 페이징 조회
 */
"use client";

import { useState, useCallback } from "react";
import type {
  InterlockResponse,
  InterlockDetailResponse,
} from "@/types/mxvc/interlock";

/** 전체 공정 카드 목록 */
export function useInterlock() {
  const [data, setData] = useState<InterlockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mxvc/interlock");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InterlockResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
}

/** 특정 공정 이력 페이징 */
export function useInterlockDetail(workstageCode: string, page: number = 1, pageSize: number = 10) {
  const [data, setData] = useState<InterlockDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/mxvc/interlock?workstage=${encodeURIComponent(workstageCode)}&page=${page}&pageSize=${pageSize}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InterlockDetailResponse = await res.json();
      setData(json);
    } catch {
      /* 상세 로드 실패 시 무시 */
    } finally {
      setLoading(false);
    }
  }, [workstageCode, page, pageSize]);

  return { data, loading, fetchData };
}
