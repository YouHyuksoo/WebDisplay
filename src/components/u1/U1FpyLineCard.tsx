/**
 * @file src/components/u1/U1FpyLineCard.tsx
 * @description U1전용 직행율 라인 카드 - 공정별 전일/당일 2줄 게이지 비교
 *
 * 초보자 가이드:
 * 1. 라인별 카드에 U1 전용 5개 공정 직행율 표시
 * 2. 공정: HIPOT, ATE, 펌웨어(FW), ICT, BURNIN
 * 3. 각 공정마다 전일(위) / 당일(아래) 2줄 게이지
 * 4. 90% 미만 -> 빨간색(A급), 90~95% -> 노란색, 95%+ -> 초록색
 */

"use client";

import { useTranslations } from "next-intl";
import type {
  U1FpyLineData,
  U1FpyProcessKey,
  U1FpyProcessData,
  U1FpyProcessDayData,
} from "@/types/u1/fpy";

const PROCESS_KEYS: U1FpyProcessKey[] = ["HIPOT", "ATE", "FW", "ICT", "BURNIN"];

function getYieldColor(yieldRate: number): { text: string; bar: string } {
  if (yieldRate < 90) return { text: "text-red-400", bar: "bg-red-500" };
  if (yieldRate < 95) return { text: "text-yellow-400", bar: "bg-yellow-500" };
  return { text: "text-green-400", bar: "bg-green-500" };
}

interface U1FpyLineCardProps {
  line: U1FpyLineData;
  dateRange?: { yesterday: string; today: string };
  compact?: boolean;
}

export default function U1FpyLineCard({ line, dateRange }: U1FpyLineCardProps) {
  const t = useTranslations("ctq");

  const hasAnyProcess = PROCESS_KEYS.some((k) => line.processes[k] && Object.keys(line.processes[k]!).length > 0);

  return (
    <div className="rounded-lg border-2 border-gray-700 bg-gray-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-600/50">
        <div>
          <span className="font-bold text-white text-base">{line.lineName}</span>
          <span className="ml-1.5 text-xs text-gray-500">({line.lineCode})</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-sm font-bold ${
          line.overallGrade === "A" ? "bg-red-600 text-white" : "bg-green-700 text-white"
        }`}>
          {line.overallGrade === "A" ? t("grade.lineStop") : "OK"}
        </span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500 pb-0.5 border-b border-gray-700/50">
          <span className="w-14 shrink-0">{t("table.process")}</span>
          <div className="flex-1 flex items-center gap-1.5">
            <span className="w-10 shrink-0" />
            <span className="w-20 shrink-0 text-center">{t("pages.fpy.title")}</span>
            <span className="w-14 shrink-0" />
            <span className="shrink-0">Pass/Total</span>
          </div>
          <span className="w-12 shrink-0 text-right">+/-</span>
        </div>
        {!hasAnyProcess && (
          <div className="text-center text-gray-600 text-sm py-4">
            {t("table.noDefects")}
          </div>
        )}
        {PROCESS_KEYS.map((key) => {
          const procGroups = line.processes[key];
          if (!procGroups) return null;
          const entries = Object.entries(procGroups).sort(([a], [b]) => a.localeCompare(b));
          return entries.map(([groupName, data]) => (
            <ProcessRow key={`${key}-${groupName}`} label={groupName} data={data} dateRange={dateRange} />
          ));
        })}
      </div>
    </div>
  );
}

function GaugeBar({ data, label, barColorClass }: { data: U1FpyProcessData; label: string; barColorClass: string }) {
  const color = getYieldColor(data.yield);
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 text-xs text-gray-500 shrink-0 text-right">{label}</span>
      <div className="w-20 h-3 bg-gray-800 rounded-full overflow-hidden relative shrink-0">
        <div
          className={`h-full ${barColorClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(data.yield, 100)}%` }}
        />
        <div className="absolute top-0 bottom-0 border-l border-dashed border-red-500/40" style={{ left: "90%" }} />
      </div>
      <span className={`w-14 text-right text-xs font-bold shrink-0 ${color.text}`}>
        {data.yield.toFixed(1)}%
      </span>
      <span className="text-right text-xs text-gray-500 shrink-0">
        {data.pass}/{data.total}
      </span>
    </div>
  );
}

function ProcessRow({ label, data, dateRange }: { label: string; data: U1FpyProcessDayData; dateRange?: { yesterday: string; today: string } }) {
  const yesterday = data.yesterday;
  const today = data.today;
  if (!yesterday && !today) return null;

  /** "03/11 08:00 ~ 03/12 08:00" -> "03/11" */
  const shortDate = (range?: string) => range?.split(" ")[0] ?? "";
  const ydLabel = dateRange ? shortDate(dateRange.yesterday) : "Y";
  const tdLabel = dateRange ? shortDate(dateRange.today) : "T";

  const yieldDiff = yesterday && today ? today.yield - yesterday.yield : null;

  return (
    <div className="flex items-start gap-2">
      <div className="w-14 text-sm font-medium text-gray-300 shrink-0 pt-0.5 truncate" title={label}>
        {label}
      </div>
      <div className="flex-1 space-y-0.5">
        {yesterday ? (
          <GaugeBar data={yesterday} label={ydLabel} barColorClass="bg-gray-500" />
        ) : (
          <div className="flex items-center gap-1.5 h-3">
            <span className="w-10 text-xs text-gray-600 shrink-0 text-right">{ydLabel}</span>
            <span className="text-xs text-gray-600">--</span>
          </div>
        )}
        {today ? (
          <GaugeBar data={today} label={tdLabel} barColorClass={getYieldColor(today.yield).bar} />
        ) : (
          <div className="flex items-center gap-1.5 h-3">
            <span className="w-10 text-xs text-gray-600 shrink-0 text-right">{tdLabel}</span>
            <span className="text-xs text-gray-600">--</span>
          </div>
        )}
      </div>
      <div className="w-12 shrink-0 text-right pt-0.5">
        {yieldDiff !== null ? (
          <span className={`text-xs font-bold ${yieldDiff >= 0 ? "text-green-500" : "text-red-400"}`}>
            {yieldDiff >= 0 ? "+" : ""}{Math.abs(yieldDiff).toFixed(1)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
