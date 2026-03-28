/**
 * @file src/app/(ctq)/ctq/equipment/page.tsx
 * @description CTQ 설비이상 모니터링 - 라인별 x 공정별 일일 정지시간 매트릭스
 *
 * 초보자 가이드:
 * 1. **대상 공정**: ICT, Hi-Pot, FT, Burn-In, ATE
 * 2. **판정 기준**: 일 정지시간 60분 이상 -> C급 (불량개선)
 * 3. **DisplayHeader**: WebDisplay 공통 헤더 사용 (라인선택, 타이밍 설정 통합)
 * 4. **라인 선택**: display-lines-ctq-equipment localStorage 키 사용
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useEquipment } from "@/hooks/ctq/useEquipment";
import EquipmentTable from "@/components/ctq/EquipmentTable";
import EquipmentWeeklyChart from "@/components/ctq/EquipmentWeeklyChart";
import EquipmentPieChart from "@/components/ctq/EquipmentPieChart";

const SCREEN_ID = "ctq-equipment";

export default function EquipmentPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  /* -- 라인 선택 상태 (localStorage + window event) -- */
  const [selectedLines, setSelectedLines] = useState<string>("%");

  const readLines = useCallback(() => {
    try {
      const saved = localStorage.getItem(`display-lines-${SCREEN_ID}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedLines(parsed.includes("%") ? "%" : parsed.join(","));
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

  /* -- 데이터 폴링 -- */
  const { data, error, loading, fetchData } = useEquipment(selectedLines);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  /* -- C급 카운트 (정지시간 60분+) -- */
  const cCount = data?.lines.filter((line) => {
    const total = Object.values(line.processes).reduce(
      (s, p) => s + (p?.stopMinutes ?? 0), 0
    );
    return total >= 60;
  }).length ?? 0;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* -- WebDisplay 공통 헤더 -- */}
      <DisplayHeader title={t("pages.equipment.title")} screenId={SCREEN_ID} />

      {/* -- 요약 바 -- */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{t("table.process")}: ICT, Hi-Pot, FT, Burn-In, ATE</span>
            <span>
              <span className="text-purple-400 font-bold">{t("grade.c")}</span>: {t("pages.equipment.gradeDesc")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {data && data.lines.length > 0 && (
              <SummaryBadge label={t("pages.equipment.gradeDesc")} count={cCount} color="bg-purple-600" />
            )}
          </div>
        </div>
      </div>

      {/* -- 본문 -- */}
      <main className="flex-1 min-h-0 max-w-[1920px] w-full mx-auto flex flex-col">
        {error && (
          <div className="mx-6 mt-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm shrink-0">
            {t("common.dataError")}: {error}
          </div>
        )}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-3">
            <span className="w-8 h-8 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
            {t("common.dataLoading")}
          </div>
        )}
        {data && (
          <div className="flex-1 min-h-0 overflow-auto">
            <EquipmentTable lines={data.lines} />
          </div>
        )}
        {/* -- 하단 차트 영역 -- */}
        <div className="shrink-0 px-4 py-2 border-t border-gray-800 flex gap-4" style={{ height: "260px" }}>
          <div className="flex-[2] min-w-0 flex flex-col">
            <h3 className="text-sm font-bold text-gray-300 mb-1">
              7-Day {t("pages.equipment.title")}
            </h3>
            <div className="flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-lg p-2">
              <EquipmentWeeklyChart selectedLines={selectedLines} />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-sm font-bold text-gray-300 mb-1">
              {t("table.process")}
            </h3>
            <div className="flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-lg p-2">
              <EquipmentPieChart selectedLines={selectedLines} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{count}</span>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
}
