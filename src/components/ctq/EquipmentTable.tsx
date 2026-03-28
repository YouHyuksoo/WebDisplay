/**
 * @file src/components/ctq/EquipmentTable.tsx
 * @description 설비이상 테이블 - 라인 x 공정 매트릭스, 정지시간(분) 표시
 *
 * 초보자 가이드:
 * 1. 행=라인, 열=공정(ICT~ATE)
 * 2. 셀: 정지시간(분), 60분 이상 -> C급(빨강)
 * 3. border-separate로 sticky thead 렌더링 이슈 방지
 */

"use client";

import { useTranslations } from "next-intl";
import type { EquipmentLineData, EquipmentProcessKey, ProcessStopData } from "@/types/ctq/equipment";

const PROCESS_KEYS: EquipmentProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

const PROCESS_LABELS: Record<EquipmentProcessKey, string> = {
  ICT: "ICT",
  HIPOT: "Hi-Pot",
  FT: "FT",
  BURNIN: "Burn-In",
  ATE: "ATE",
};

const GRADE_C_THRESHOLD = 60;

/** 정지시간에 따른 색상 */
function getStopColor(minutes: number): string {
  if (minutes >= GRADE_C_THRESHOLD) return "text-red-400 font-bold";
  if (minutes > 0) return "text-yellow-400";
  return "text-gray-600";
}

/** 정지시간에 따른 셀 배경 */
function getStopBg(minutes: number): string {
  if (minutes >= GRADE_C_THRESHOLD) return "bg-red-950/40";
  return "";
}

interface Props {
  lines: EquipmentLineData[];
}

export default function EquipmentTable({ lines }: Props) {
  const t = useTranslations("ctq");

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-base border-separate border-spacing-0">
        <thead className="sticky top-0 z-20" style={{ boxShadow: "0 2px 0 0 #1f2937" }}>
          <tr className="bg-gray-800">
            <th className="text-left px-4 py-1.5 border border-gray-700 bg-gray-800 sticky left-0 z-30 text-lg">
              {t("common.line")}
            </th>
            {PROCESS_KEYS.map((key) => (
              <th
                key={key}
                className="text-center px-6 py-1.5 border border-gray-700 bg-gray-800 font-bold text-lg"
              >
                {PROCESS_LABELS[key]}
              </th>
            ))}
            <th className="text-center px-6 py-1.5 border border-gray-700 bg-gray-800 font-bold text-lg">
              {t("table.totalCount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={PROCESS_KEYS.length + 2} className="px-4 py-8 text-center text-gray-500">
                {t("pages.equipment.noData")}
              </td>
            </tr>
          )}
          {lines.map((line) => {
            const totalStop = Object.values(line.processes).reduce(
              (s, p) => s + (p?.stopMinutes ?? 0), 0
            );
            return (
              <tr key={line.lineCode} className="border-t border-gray-800 hover:bg-gray-800/30">
                <td className="px-4 py-1 font-medium text-gray-200 whitespace-nowrap border border-gray-800 sticky left-0 bg-gray-950 z-10 text-base">
                  {line.lineName}
                  <span className="ml-1.5 text-sm text-gray-500">({line.lineCode})</span>
                </td>
                {PROCESS_KEYS.map((key) => {
                  const d: ProcessStopData = line.processes[key] ?? { stopMinutes: 0 };
                  return (
                    <td
                      key={key}
                      className={`px-6 py-1 text-center text-lg border border-gray-800 whitespace-nowrap ${getStopColor(d.stopMinutes)} ${getStopBg(d.stopMinutes)}`}
                    >
                      {d.stopMinutes > 0 ? `${d.stopMinutes}${t("pages.equipment.minuteUnit")}` : "-"}
                      {d.stopMinutes >= GRADE_C_THRESHOLD && (
                        <span className="ml-1.5 text-sm text-red-500">C</span>
                      )}
                    </td>
                  );
                })}
                <td className={`px-6 py-1 text-center text-lg border border-gray-800 font-bold ${getStopColor(totalStop)} ${getStopBg(totalStop)}`}>
                  {totalStop > 0 ? `${totalStop}${t("pages.equipment.minuteUnit")}` : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
