/**
 * @file src/app/(u1)/u1/ict-analysis/page.tsx
 * @description ICT 분석 대시보드 — 7개 차트 (C5 불량종류 포함), 2-2-3 레이아웃
 *
 * 초보자 가이드:
 * 1. ATE와 다른 레이아웃: 상단2 + 중단2 + 하단3 (총 7개 차트)
 * 2. C5 불량종류별 분포 차트가 ICT 전용으로 추가
 * 3. 3개 API를 기간별 다른 폴링 주기로 조회
 * 4. DisplayHeader/Footer 공통 사용
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import IctDailyPassRate from "@/components/u1/ict/IctDailyPassRate";
import IctYesterdayCompare from "@/components/u1/ict/IctYesterdayCompare";
import IctHourlyTrend from "@/components/u1/ict/IctHourlyTrend";
import IctWeeklyTrend from "@/components/u1/ict/IctWeeklyTrend";
import IctMonthlyHeatmap from "@/components/u1/ict/IctMonthlyHeatmap";
import IctMachineNg from "@/components/u1/ict/IctMachineNg";
import IctDefectType from "@/components/u1/ict/IctDefectType";
import type { IctDailyResponse, IctWeeklyResponse, IctMonthlyResponse } from "@/types/u1/ict-analysis";

const SCREEN_ID = "u1-ict";
const POLL_DAILY = 30_000;
const POLL_WEEKLY = 300_000;
const POLL_MONTHLY = 600_000;

function ChartCard({ title, badge, children, className = "" }: {
  title: string; badge: string; children: React.ReactNode; className?: string;
}) {
  const badgeColor: Record<string, string> = {
    "당일": "bg-blue-900/50 text-blue-300 border border-blue-700/30",
    "전일/당일": "bg-purple-900/50 text-purple-300 border border-purple-700/30",
    "주간": "bg-green-900/50 text-green-300 border border-green-700/30",
    "월간": "bg-amber-900/50 text-amber-300 border border-amber-700/30",
  };
  return (
    <div className={`bg-gray-900/80 dark:bg-gray-900/80 border border-gray-700/60 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm shadow-lg shadow-black/20 ${className}`}>
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

export default function IctAnalysisPage() {
  const [daily, setDaily] = useState<IctDailyResponse | null>(null);
  const [weekly, setWeekly] = useState<IctWeeklyResponse | null>(null);
  const [monthly, setMonthly] = useState<IctMonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ict-analysis/daily");
      if (!res.ok) throw new Error(`Daily API: HTTP ${res.status}`);
      setDaily(await res.json());
      setError(null);
    } catch (e) { setError(String(e)); }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ict-analysis/weekly");
      if (!res.ok) throw new Error(`Weekly API: HTTP ${res.status}`);
      setWeekly(await res.json());
    } catch (e) { console.error("Weekly fetch error:", e); }
  }, []);

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await fetch("/api/u1/ict-analysis/monthly");
      if (!res.ok) throw new Error(`Monthly API: HTTP ${res.status}`);
      setMonthly(await res.json());
    } catch (e) { console.error("Monthly fetch error:", e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchDaily(), fetchWeekly(), fetchMonthly()]).then(() => setLoading(false));
    const d = setInterval(fetchDaily, POLL_DAILY);
    const w = setInterval(fetchWeekly, POLL_WEEKLY);
    const m = setInterval(fetchMonthly, POLL_MONTHLY);
    return () => { clearInterval(d); clearInterval(w); clearInterval(m); };
  }, [fetchDaily, fetchWeekly, fetchMonthly]);

  return (
    <div className="h-screen bg-gray-950 dark:bg-gray-950 text-white flex flex-col overflow-hidden">
      <DisplayHeader title="ICT 분석" screenId={SCREEN_ID} />
      {error && (
        <div className="mx-4 mt-1 p-2 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-3 py-2 overflow-hidden flex flex-col gap-2">
        {loading && !daily ? (
          <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <ChartCard key={i} title="로딩중..." badge="-"><ChartSkeleton /></ChartCard>
            ))}
          </div>
        ) : (
          <>
            {/* Row 1: 넓은 차트 2개 */}
            <div className="grid grid-cols-2 gap-2" style={{ flex: "1 1 0" }}>
              <ChartCard title="당일 라인별 합격률" badge="당일">
                {daily ? <IctDailyPassRate lineStats={daily.lineStats} /> : <ChartSkeleton />}
              </ChartCard>
              <ChartCard title="전일 vs 당일 합격률 비교" badge="전일/당일">
                {daily ? <IctYesterdayCompare lineStats={daily.lineStats} /> : <ChartSkeleton />}
              </ChartCard>
            </div>

            {/* Row 2: 넓은 차트 2개 (시간대별 + C5 불량종류) */}
            <div className="grid grid-cols-2 gap-2" style={{ flex: "1 1 0" }}>
              <ChartCard title="시간대별 검사수량 / 합격률" badge="당일">
                {daily ? <IctHourlyTrend hourlyTrend={daily.hourlyTrend} /> : <ChartSkeleton />}
              </ChartCard>
              <ChartCard title="불량종류(C5)별 NG 분포" badge="당일">
                {daily ? <IctDefectType defectTypes={daily.defectTypes} /> : <ChartSkeleton />}
              </ChartCard>
            </div>

            {/* Row 3: 차트 3개 */}
            <div className="grid grid-cols-3 gap-2" style={{ flex: "1 1 0" }}>
              <ChartCard title="주간 일별 합격률 추이" badge="주간">
                {weekly ? <IctWeeklyTrend dailyTrend={weekly.dailyTrend} /> : <ChartSkeleton />}
              </ChartCard>
              <ChartCard title="월간 ZONE별 히트맵" badge="월간">
                {monthly ? <IctMonthlyHeatmap heatmapData={monthly.heatmapData} zones={monthly.zones} /> : <ChartSkeleton />}
              </ChartCard>
              <ChartCard title="머신별 NG 분포" badge="당일">
                {daily ? <IctMachineNg machineNg={daily.machineNg} /> : <ChartSkeleton />}
              </ChartCard>
            </div>
          </>
        )}
      </main>
      <DisplayFooter loading={loading} lastUpdated={daily?.lastUpdated} />
    </div>
  );
}
