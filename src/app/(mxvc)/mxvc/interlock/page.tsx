/**
 * @file src/app/(mxvc)/mxvc/interlock/page.tsx
 * @description 멕시코전장 설비호출이력분석 대시보드 페이지
 * 초보자 가이드:
 * 1. 좌측 35%: InterlockLogTable (실시간 로그) + 페이지네이션
 * 2. 우측 65%: InterlockCharts (2x2 분석 차트)
 * 3. 10초 폴링 (useDisplayTiming)
 * 4. 서버 페이징: page/pageSize 파라미터로 30건씩 조회
 */
"use client";

import { useState, useEffect } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useInterlock } from "@/hooks/mxvc/useInterlock";
import InterlockLogTable from "@/components/mxvc/InterlockLogTable";
import InterlockCharts from "@/components/mxvc/InterlockCharts";

const SCREEN_ID = "mxvc-interlock";
const PAGE_SIZE = 30;

export default function InterlockPage() {
  const timing = useDisplayTiming();
  const [page, setPage] = useState(1);
  const { data, loading, error, fetchData } = useInterlock(page, PAGE_SIZE);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  const totalPages = data?.pagination?.totalPages ?? 1;
  const totalCount = data?.pagination?.totalCount ?? 0;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="설비호출이력분석" screenId={SCREEN_ID} />

      {/* 에러 배너 */}
      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 본문: 좌 35% + 우 65% */}
      <div className="flex flex-1 min-h-0">
        {/* 좌측 로그 테이블 + 페이지네이션 */}
        <div className="w-[35%] min-w-[320px] border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {loading && !data && (
            <div className="flex items-center justify-center flex-1 text-gray-500 gap-2">
              <span className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-400 rounded-full animate-spin" />
              불러오는 중...
            </div>
          )}
          {data && (
            <>
              <div className="flex-1 min-h-0">
                <InterlockLogTable logs={data.logs} />
              </div>
              {/* 페이지네이션 */}
              <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {totalCount}건 중 {(page - 1) * PAGE_SIZE + 1}~{Math.min(page * PAGE_SIZE, totalCount)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                  >
                    &lsaquo;
                  </button>
                  <span className="px-2 text-gray-700 dark:text-gray-200 font-medium">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                  >
                    &rsaquo;
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 우측 차트 그리드 */}
        <div className="flex-1 min-w-0">
          {data && <InterlockCharts charts={data.charts} />}
          {!data && !loading && (
            <div className="flex items-center justify-center h-full text-gray-500">
              데이터 없음
            </div>
          )}
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
