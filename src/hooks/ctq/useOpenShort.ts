/**
 * @file src/hooks/ctq/useOpenShort.ts
 * @description 공용부품 Open/Short 데이터 폴링 훅
 *
 * 초보자 가이드:
 * 1. **폴링 주기**: refreshSeconds (useDisplayTiming에서 가져옴)
 * 2. **라인 필터**: selectedLines 파라미터로 라인 필터링
 * 3. **자동 갱신**: enabled가 true이면 intervalMs 간격으로 재조회
 */

import { useState, useEffect, useCallback } from "react";
import type { OpenShortResponse } from "@/types/ctq/open-short";

export function useOpenShort(intervalMs: number, selectedLines: string = "%") {
  const [data, setData] = useState<OpenShortResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const linesQs = selectedLines && selectedLines !== "%" ? `?lines=${encodeURIComponent(selectedLines)}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ctq/open-short${linesQs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: OpenShortResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLines]);

  useEffect(() => {
    let active = true;
    const doFetch = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ctq/open-short${linesQs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: OpenShortResponse = await res.json();
        if (active) { setData(json); setError(null); }
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    doFetch();
    const id = setInterval(doFetch, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [selectedLines, intervalMs]);

  return { data, error, loading };
}
