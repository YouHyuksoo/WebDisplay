/**
 * @file src/app/(ctq)/ctq/repair-status/page.tsx
 * @description 수리상태 페이지 -- IP_PRODUCT_WORK_QC 불량 PID 수리 현황
 *
 * 초보자 가이드:
 * 1. 날짜 범위(QC_DATE) 조건 필수 -- 기본 당일~당일
 * 2. 시작일 08:00 ~ 종료일 익일 08:00 범위 조회
 * 3. DisplayHeader + useDisplayTiming + 자동 폴링 패턴
 * 4. PID 검색 필터 지원
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useServerTime } from "@/hooks/useServerTime";
import { useSelectedLines } from "@/hooks/ctq/useSelectedLines";
import { useRepairStatus } from "@/hooks/ctq/useRepairStatus";
import CriteriaTooltip from "@/components/ctq/CriteriaTooltip";
import RepairStatusTable from "@/components/ctq/RepairStatusTable";
import Spinner from "@/components/ui/Spinner";

const SCREEN_ID = "ctq-repair";

export default function RepairStatusPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();
  const serverToday = useServerTime();

  const selectedLines = useSelectedLines(SCREEN_ID);

  /* -- 날짜 범위 조건 (필수, 기본 당일~당일) -- */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* 서버 시간 로드 시 날짜 초기값 설정 */
  useEffect(() => {
    if (serverToday && !dateFrom) {
      setDateFrom(serverToday);
      setDateTo(serverToday);
    }
  }, [serverToday, dateFrom]);

  /* -- PID 검색 필터 -- */
  const [pidInput, setPidInput] = useState("");
  const [pidFilter, setPidFilter] = useState("");

  /* -- 데이터 조회 -- */
  const { data, error, loading, fetchData } = useRepairStatus(
    selectedLines, pidFilter, dateFrom, dateTo
  );

  /* -- 자동 폴링 -- */
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <DisplayHeader title={t("pages.repairStatus.title")} screenId={SCREEN_ID} />

      {/* -- 조회 조건 바 -- */}
      <div className="shrink-0 bg-gray-900 border-b border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <CriteriaTooltip pageKey="repairStatus" />
            <span>{t("pages.repairStatus.tableSource")}</span>
          </div>
          <div className="flex items-center gap-4">
            {/* 날짜 범위 선택 (필수) */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">{t("pages.repairStatus.dateLabel")}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (e.target.value > dateTo) setDateTo(e.target.value);
                }}
                className="px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-sm text-gray-200 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-sm text-gray-200 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
            {/* PID 검색 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pidInput}
                onChange={(e) => setPidInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPidFilter(pidInput); } }}
                placeholder="PID..."
                className="w-44 px-3 py-1.5 rounded bg-gray-800 border border-gray-600 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
            {/* 새로고침 */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Spinner size="sm" label={t("common.dataLoading")} labelClassName="text-white" className="gap-1.5" />
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
          <Spinner fullscreen size="lg" vertical label={t("common.dataLoading")} />
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
