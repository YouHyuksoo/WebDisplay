/**
 * @file src/app/(ctq)/ctq/equipment-history/page.tsx
 * @description 설비점검이력 페이지 — 날짜 구간 선택 + 이력 테이블
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useEquipmentHistory } from "@/hooks/ctq/useEquipmentHistory";
import EquipmentHistoryTable from "@/components/ctq/EquipmentHistoryTable";

const SCREEN_ID = "ctq-equip-hist";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EquipmentHistoryPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  const readLines = useCallback(() => {
    try {
      const saved = localStorage.getItem(`display-lines-${SCREEN_ID}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedLines(parsed.includes("%") ? [] : parsed);
        }
      }
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => {
    readLines();
    const handler = () => readLines();
    window.addEventListener(`line-config-changed-${SCREEN_ID}`, handler);
    return () => window.removeEventListener(`line-config-changed-${SCREEN_ID}`, handler);
  }, [readLines]);

  const [fromDate, setFromDate] = useState(getToday());
  const [toDate, setToDate] = useState(getToday());

  const { data, error, loading, fetchData } = useEquipmentHistory(selectedLines, fromDate, toDate);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setToday = () => {
    const today = getToday();
    setFromDate(today);
    setToDate(today);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <DisplayHeader title={t("pages.equipmentHistory.title")} screenId={SCREEN_ID} />

      <header className="shrink-0 bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>IP_LINE_DAILY_OPERATION_HIST</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 rounded bg-gray-900 border border-gray-600 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            />
            <span className="text-gray-500 text-sm">~</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 rounded bg-gray-900 border border-gray-600 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={setToday}
              className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 transition-colors"
            >
              Today
            </button>
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
      </header>

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
              <div className="text-6xl mb-5">📋</div>
              <h2 className="text-2xl font-bold text-gray-200 mb-4">
                {t("pages.equipmentHistory.title")}
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                {fromDate} ~ {toDate} — {t("pages.equipmentHistory.noData")}
              </p>
            </div>
          </div>
        )}
        {data && data.rows.length > 0 && (
          <EquipmentHistoryTable rows={data.rows} />
        )}
      </main>

      <DisplayFooter 
        loading={loading} 
        lastUpdated={data?.lastUpdated} 
        statusText={`${fromDate} ~ ${toDate} (${data?.rows.length ?? 0}${t("pages.equipmentHistory.rowCount")})`}
      />
    </div>
  );
}
