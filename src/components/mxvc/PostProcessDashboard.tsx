/**
 * @file src/components/mxvc/PostProcessDashboard.tsx
 * @description 후공정생산현황 대시보드 — 항상 당일 실시간 기준
 * 초보자 가이드:
 * 1. DisplayHeader: 상단 제목 + 화면 ID 기반 설정 연동
 * 2. PostProcessKpiCards: 생산달성율/계획/실적/불량율/재검사율/수리 KPI 카드
 * 3. PostProcessDefectChart: 공정별 불량율/재검사율 바차트
 * 4. PostProcessFpyChart: 5개 검사공정 직행율 바차트
 * 5. PostProcessMagazineTable: 매거진 대기재공 현황
 * 6. DisplayFooter: 마지막 갱신 시각
 * * 날짜 필터 없음 — API에서 항상 당일 08:00 ~ 현재로 자동 설정
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import PostProcessKpiCards from './PostProcessKpiCards';
import PostProcessDefectChart from './PostProcessDefectChart';
import PostProcessFpyChart from './PostProcessFpyChart';
import PostProcessEolDefectPie from './PostProcessEolDefectPie';
import PostProcessMagazinePanel from './PostProcessMagazinePanel';
import type { PostProcessResponse } from '@/types/mxvc/post-process';

const SCREEN_ID = 'mxvc-post-process';

const EMPTY_KPI = {
  planQty: 0, targetQty: 0, actualQty: 0, achievementRate: 0,
  defectRate: 0, retestRate: 0, retestCount: 0, repairWaiting: 0, repairDone: 0,
};

export default function PostProcessDashboard() {
  const timing = useDisplayTiming();

  const [data,    setData]    = useState<PostProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mxvc/post-process');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  /* 자동 갱신 */
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  const kpi = data?.kpi ?? EMPTY_KPI;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="후공정생산현황" screenId={SCREEN_ID} />

      {/* ── 콘텐츠 영역: 좌 80% 메인 / 우 20% 매거진 패널 ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* 좌측 메인 (80%) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-auto" style={{ minWidth: 0 }}>
          {/* KPI 카드 */}
          <PostProcessKpiCards kpi={kpi} />

          {/* 오류 표시 */}
          {error && (
            <div className="mx-6 my-2 px-4 py-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              조회 오류: {error}
            </div>
          )}

          {/* 로딩 */}
          {loading && !data && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
              <span className="w-8 h-8 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
              데이터 조회 중...
            </div>
          )}

          {/* 차트 */}
          {data && (
            <>
              <PostProcessDefectChart defectByTable={data.defectByTable} />
              {/* 직행율 차트 + EOL 불량 파이 — 가로 배치 */}
              <div className="flex items-start gap-0 shrink-0">
                <div className="flex-1 min-w-0">
                  <PostProcessFpyChart fpyChart={data.fpyChart} />
                </div>
                <PostProcessEolDefectPie eolStepDefects={data.eolStepDefects} />
              </div>
            </>
          )}
        </div>

        {/* 우측 매거진 패널 (22%, 최소 200px) */}
        <div className="shrink-0 overflow-hidden" style={{ width: '22%', minWidth: 200 }}>
          <PostProcessMagazinePanel magazine={data?.magazine ?? []} />
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
