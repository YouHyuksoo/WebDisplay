/**
 * @file src/app/(u1)/u1/ate-analysis/page.tsx
 * @description ATE 분석 대시보드 — 6개 차트 3x2 그리드 레이아웃
 *
 * 초보자 가이드:
 * 1. 3개 API를 기간별 다른 폴링 주기로 조회 (daily:30초, weekly:5분, monthly:10분)
 * 2. 6개 차트를 3열x2행 균등 그리드에 배치
 * 3. DisplayHeader/Footer는 기존 U1 FPY 페이지 패턴 따름
 * 4. 각 차트 카드에 제목 + 기간 뱃지 표시
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import AteDailyPassRate from "@/components/u1/ate/AteDailyPassRate";
import AteYesterdayCompare from "@/components/u1/ate/AteYesterdayCompare";
import AteHourlyTrend from "@/components/u1/ate/AteHourlyTrend";
import AteWeeklyTrend from "@/components/u1/ate/AteWeeklyTrend";
import AteMonthlyHeatmap from "@/components/u1/ate/AteMonthlyHeatmap";
import AteMachineNg from "@/components/u1/ate/AteMachineNg";
import type { AteDailyResponse, AteWeeklyResponse, AteMonthlyResponse } from "@/types/u1/ate-analysis";

const SCREEN_ID = "u1-ate";
const POLL_DAILY = 30_000;
const POLL_WEEKLY = 300_000;
const POLL_MONTHLY = 600_000;

function ChartCard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  const badgeColor: Record<string, string> = {
    "당일": "bg-blue-900/50 text-blue-300 border border-blue-700/30",
    "전일/당일": "bg-purple-900/50 text-purple-300 border border-purple-700/30",
    "주간": "bg-green-900/50 text-green-300 border border-green-700/30",
    "월간": "bg-amber-900/50 text-amber-300 border border-amber-700/30",
  };
  return (
    <div className="bg-gray-900/80 dark:bg-gray-900/80 border border-gray-700/60 dark:border-gray-700/60 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm shadow-lg shadow-black/20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/30 bg-gray-800/30">
        <span className="text-base font-semibold text-gray-100">{title}</span>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeColor[badge] ?? "bg-gray-700 text-gray-400"}`}>{badge}</span>
      </div>
      <div className="flex-1 p-2 min-h-0">{children}</div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full bg-gray-800/50 rounded animate-pulse" />;
}

export default function AteAnalysisPage() {
  const t = useTranslations("common");
  const [daily, setDaily] = useState<AteDailyResponse | null>(null);
  const [weekly, setWeekly] = useState<AteWeeklyResponse | null>(null);
  const [monthly, setMonthly] = useState<AteMonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ate-analysis/daily");
      if (!res.ok) throw new Error(`Daily API: HTTP ${res.status}`);
      setDaily(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ate-analysis/weekly");
      if (!res.ok) throw new Error(`Weekly API: HTTP ${res.status}`);
      setWeekly(await res.json());
    } catch (e) {
      console.error("Weekly fetch error:", e);
    }
  }, []);

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ate-analysis/monthly");
      if (!res.ok) throw new Error(`Monthly API: HTTP ${res.status}`);
      setMonthly(await res.json());
    } catch (e) {
      console.error("Monthly fetch error:", e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDaily(), fetchWeekly(), fetchMonthly()]).then(() => setLoading(false));
    const dailyId = setInterval(fetchDaily, POLL_DAILY);
    const weeklyId = setInterval(fetchWeekly, POLL_WEEKLY);
    const monthlyId = setInterval(fetchMonthly, POLL_MONTHLY);
    return () => { clearInterval(dailyId); clearInterval(weeklyId); clearInterval(monthlyId); };
  }, [fetchDaily, fetchWeekly, fetchMonthly]);

  return (
    <div className="h-screen bg-gray-950 dark:bg-gray-950 text-white flex flex-col overflow-hidden">
      <DisplayHeader title="ATE 분석" screenId={SCREEN_ID} />
      {error && (
        <div className="mx-4 mt-1 p-2 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-3 py-2 overflow-hidden">
        {loading && !daily ? (
          <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <ChartCard key={i} title={t("loading")} badge="-"><ChartSkeleton /></ChartCard>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full">
            <ChartCard title="당일 라인별 합격률" badge="당일">
              {daily ? <AteDailyPassRate lineStats={daily.lineStats} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="전일 vs 당일 합격률 비교" badge="전일/당일">
              {daily ? <AteYesterdayCompare lineStats={daily.lineStats} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="시간대별 검사수량 / 합격률" badge="당일">
              {daily ? <AteHourlyTrend hourlyTrend={daily.hourlyTrend} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="주간 일별 합격률 추이" badge="주간">
              {weekly ? <AteWeeklyTrend dailyTrend={weekly.dailyTrend} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="월간 ZONE별 히트맵" badge="월간">
              {monthly ? <AteMonthlyHeatmap heatmapData={monthly.heatmapData} zones={monthly.zones} /> : <ChartSkeleton />}
            </ChartCard>
            <ChartCard title="머신별 NG 분포" badge="당일">
              {daily ? <AteMachineNg machineNg={daily.machineNg} /> : <ChartSkeleton />}
            </ChartCard>
          </div>
        )}
      </main>
      <DisplayFooter loading={loading} lastUpdated={daily?.lastUpdated} />
    </div>
  );
}
