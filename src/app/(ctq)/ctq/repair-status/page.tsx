/**
 * @file src/app/(ctq)/ctq/repair-status/page.tsx
 * @description 수리상태 페이지 -- IP_PRODUCT_WORK_QC 당일 불량 PID 수리 현황
 *
 * 초보자 가이드:
 * 1. 당일 불량 감지된 PID의 수리 상태를 목록으로 표시
 * 2. DisplayHeader + useDisplayTiming + useAutoRolling 패턴 적용
 * 3. h-screen flex 레이아웃 -- 테이블만 스크롤
 * 4. PID 검색 필터 지원
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useSelectedLines } from "@/hooks/ctq/useSelectedLines";
import { useRepairStatus } from "@/hooks/ctq/useRepairStatus";
import CriteriaTooltip from "@/components/ctq/CriteriaTooltip";
import RepairStatusTable from "@/components/ctq/RepairStatusTable";

const SCREEN_ID = "ctq-repair";

export default function RepairStatusPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  const selectedLines = useSelectedLines(SCREEN_ID);

  /* -- PID 검색 필터 -- */
  const [pidInput, setPidInput] = useState("");
  const [pidFilter, setPidFilter] = useState("");

  /* -- 데이터 조회 -- */
  const { data, error, loading, fetchData } = useRepairStatus(selectedLines, pidFilter);

  /* -- 자동 폴링 -- */
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* -- WebDisplay 공통 헤더 -- */}
      <DisplayHeader title={t("pages.repairStatus.title")} screenId={SCREEN_ID} />

      {/* -- PID 검색 바 -- */}
      <div className="shrink-0 bg-gray-900 border-b border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <CriteriaTooltip pageKey="repairStatus" />
            <span>{t("pages.repairStatus.tableSource")}</span>
            <span>{t("pages.repairStatus.periodDesc")}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pidInput}
                onChange={(e) => setPidInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPidFilter(pidInput); } }}
                placeholder="PID..."
                className="w-56 px-3 py-1.5 rounded bg-gray-900 border border-gray-600 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {pidFilter && (
                <button
                  onClick={() => { setPidInput(""); setPidFilter(""); }}
                  className="px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300"
                >
                  X
                </button>
              )}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                  {t("common.dataLoading")}
                </span>
              ) : (
                t("common.refresh")
              )}
            </button>
          </div>
        </div>
      </div>

      {/* -- 본문 -- */}
      <main className="flex-1 min-h-0 max-w-[1920px] w-full mx-auto">
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {t("common.dataError")}: {error}
          </div>
        )}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
            <span className="w-8 h-8 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
            {t("common.dataLoading")}
          </div>
        )}
        {data && data.rows.length === 0 && (
          <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 200px)" }}>
            <div className="text-center p-12 bg-gray-900/60 border border-gray-700 rounded-2xl max-w-lg">
              <h2 className="text-2xl font-bold text-gray-200 mb-4">
                {t("pages.repairStatus.title")}
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                {t("pages.repairStatus.noData")}
              </p>
            </div>
          </div>
        )}
        {data && data.rows.length > 0 && (
          <RepairStatusTable rows={data.rows} />
        )}
      </main>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
