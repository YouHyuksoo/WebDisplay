/**
 * @file src/app/(ctq)/ctq/indicator/page.tsx
 * @description CTQ 지표 모니터링 페이지 -- 월간 전용
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useIndicator } from "@/hooks/ctq/useIndicator";
import CriteriaTooltip from "@/components/ctq/CriteriaTooltip";
import IndicatorTable from "@/components/ctq/IndicatorTable";
import type {
  IndicatorComparisonMode,
  IndicatorProcessKey,
  MonthlyProcessData,
  ProcessPpmThresholds,
} from "@/types/ctq/indicator";
import { DEFAULT_PPM_THRESHOLDS } from "@/types/ctq/indicator";

const SCREEN_ID = "ctq-indicator";

export default function IndicatorPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();
  const [minPrevMonthVolume, setMinPrevMonthVolume] = useState(1000);
  const [ppmThresholds, setPpmThresholds] = useState<ProcessPpmThresholds>(DEFAULT_PPM_THRESHOLDS);
  const [comparisonMode, setComparisonMode] = useState<IndicatorComparisonMode>("last-vs-current");
  const [showSettings, setShowSettings] = useState(false);
  // 설정 팝오버 임시 상태
  const [tempVolume, setTempVolume] = useState(String(minPrevMonthVolume));
  const [tempPpm, setTempPpm] = useState<ProcessPpmThresholds>(DEFAULT_PPM_THRESHOLDS);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { data, error, loading, fetchData, registerCountermeasure } = useIndicator(minPrevMonthVolume, comparisonMode);

  const PROCESS_KEYS: IndicatorProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

  /** 대책서 등록/미등록 건수 (200% 초과 + PPM 한도 이상 공정만) */
  const countermeasureCounts = useMemo(() => {
    if (!data) return { registered: 0, unregistered: 0 };
    let registered = 0;
    let unregistered = 0;
    for (const model of data.models) {
      for (const key of PROCESS_KEYS) {
        const prev = (model.monthBefore[key] as MonthlyProcessData | undefined)?.ppm ?? 0;
        const curr = (model.lastMonth[key] as MonthlyProcessData | undefined)?.ppm ?? 0;
        // PPM 한도 미만이면 지표 Logic 제외
        if (prev < ppmThresholds[key] && curr < ppmThresholds[key]) continue;
        if (prev > 0 && curr > 0 && (curr / prev) * 100 >= 200) {
          if (model.lastMonth[key]?.countermeasureNo) {
            registered++;
          } else {
            unregistered++;
          }
        }
      }
    }
    return { registered, unregistered };
  }, [data, ppmThresholds]);

  /* 초기 로딩 */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* 설정 팝오버 외부 클릭 닫기 */
  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSettings]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* WebDisplay 공통 헤더 */}
      <DisplayHeader title={t("pages.indicator.title")} screenId={SCREEN_ID} />

      {/* 네비게이션 + 액션 바 */}
      <header className="shrink-0 bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <CriteriaTooltip pageKey="indicator" widthClass="w-[440px]" />
            <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-900/80 p-1">
              <span className="px-2 text-xs text-gray-500 whitespace-nowrap">비교 기준</span>
              <button
                onClick={() => setComparisonMode("last-vs-current")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  comparisonMode === "last-vs-current"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                전월 / 당월
              </button>
              <button
                onClick={() => setComparisonMode("before-vs-last")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  comparisonMode === "before-vs-last"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                전전월 / 전월
              </button>
            </div>
            {data && data.models.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>
                  {data.monthBefore.displayLabel}: {data.monthBefore.month}
                </span>
                <span>
                  {data.lastMonth.displayLabel}: {data.lastMonth.month}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* 대책서 등록/미등록 건수 */}
            {data && (countermeasureCounts.registered > 0 || countermeasureCounts.unregistered > 0) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">{t('pages.indicator.countermeasure')}</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-900/50 border border-green-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-green-300 font-medium">{t('pages.indicator.registered', { count: countermeasureCounts.registered })}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/50 border border-red-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-red-300 font-medium">{t('pages.indicator.unregistered', { count: countermeasureCounts.unregistered })}</span>
                </span>
              </div>
            )}
            {/* 재생성 버튼 (주황색) */}
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-sm text-white font-medium transition-colors disabled:opacity-50"
            >
              {t("pages.indicator.regenerate")}
            </button>
            {/* 새로고침 버튼 */}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                  {t("common.dataLoading")}
                </span>
              ) : (
                t("pages.indicator.refreshBtn")
              )}
            </button>
            {/* 설정 아이콘 + 팝오버 */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setTempVolume(String(minPrevMonthVolume));
                  setTempPpm({ ...ppmThresholds });
                }}
                className={`p-1.5 rounded transition-colors ${
                  showSettings
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                }`}
                title="지표 설정"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-4 space-y-4">
                  {/* 공정별 PPM 한도 */}
                  <div>
                    <div className="text-sm font-medium text-gray-200 mb-0.5">공정별 PPM 한도</div>
                    <p className="text-xs text-gray-500 mb-2">이 PPM 이상인 공정만 지표 Logic 적용</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {(["ICT", "HIPOT", "FT", "BURNIN", "ATE"] as IndicatorProcessKey[]).map((key) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 w-14 shrink-0">
                            {key === "HIPOT" ? "Hi-Pot" : key === "BURNIN" ? "Burn-in" : key}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={tempPpm[key]}
                            onChange={(e) => setTempPpm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-600 text-xs text-gray-200 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 전월 최소 생산수량 */}
                  <div>
                    <div className="text-sm font-medium text-gray-200 mb-0.5">전월 최소 생산수량</div>
                    <p className="text-xs text-gray-500 mb-2">이 수량 미만 모델은 지표 Logic에서 제외</p>
                    <input
                      type="number"
                      min={1}
                      value={tempVolume}
                      onChange={(e) => setTempVolume(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-gray-900 border border-gray-600 text-sm text-gray-200 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setTempPpm({ ...DEFAULT_PPM_THRESHOLDS });
                        setTempVolume("1000");
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300"
                    >
                      초기화
                    </button>
                    <button
                      onClick={() => {
                        const v = Number(tempVolume);
                        if (v > 0) {
                          setPpmThresholds({ ...tempPpm });
                          setMinPrevMonthVolume(v);
                          setShowSettings(false);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium"
                    >
                      {t("pages.indicator.apply")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 본문 -- 남은 공간 전체 사용, 테이블만 스크롤 */}
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
        {data && data.models.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {t("pages.indicator.noData")}
          </div>
        )}
        {data && data.models.length > 0 && (
          <IndicatorTable
            models={data.models}
            monthBefore={data.monthBefore}
            lastMonth={data.lastMonth}
            ppmThresholds={ppmThresholds}
            onRegister={registerCountermeasure}
          />
        )}
      </main>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
