/**
 * @file src/components/ctq/EquipmentHistoryTable.tsx
 * @description 설비점검이력 테이블 — 개별 이력 레코드 목록 표시
 *
 * 초보자 가이드:
 * 1. 행=개별 이력 레코드 (시작~종료 시간, 정지시간 등)
 * 2. 60분 이상 정지 -> 빨강 강조
 * 3. border-separate로 sticky thead 렌더링 이슈 방지
 */

"use client";

import { useTranslations } from "next-intl";
import type { EquipmentHistoryRow } from "@/types/ctq/equipment-history";

const GRADE_C_THRESHOLD = 60;

/** 정지시간에 따른 색상 */
function getStopColor(minutes: number): string {
  if (minutes >= GRADE_C_THRESHOLD) return "text-red-400 font-bold";
  if (minutes > 0) return "text-yellow-400";
  return "text-gray-400";
}

/** 정지시간에 따른 셀 배경 */
function getStopBg(minutes: number): string {
  if (minutes >= GRADE_C_THRESHOLD) return "bg-red-950/40";
  return "";
}

/** LINE_STATUS_CODE에 따른 배지 색상 */
function getStatusBadge(code: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    ICT: { color: "bg-blue-600", label: "ICT" },
    HIPOT: { color: "bg-purple-600", label: "Hi-Pot" },
    FT: { color: "bg-green-600", label: "FT" },
    BURNIN: { color: "bg-orange-600", label: "Burn-In" },
    ATE: { color: "bg-cyan-600", label: "ATE" },
  };
  return map[code] ?? { color: "bg-gray-600", label: code };
}

interface Props {
  rows: EquipmentHistoryRow[];
}

export default function EquipmentHistoryTable({ rows }: Props) {
  const t = useTranslations("ctq");

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-20" style={{ boxShadow: "0 2px 0 0 #1f2937" }}>
          <tr className="bg-gray-800">
            <th className="text-left px-3 py-2 border border-gray-700 bg-gray-800 sticky left-0 z-30">
              {t("common.line")}
            </th>
            <th className="text-center px-3 py-2 border border-gray-700 bg-gray-800">
              {t("table.process")}
            </th>
            <th className="text-center px-3 py-2 border border-gray-700 bg-gray-800">
              {t("pages.equipmentHistory.startTime")}
            </th>
            <th className="text-center px-3 py-2 border border-gray-700 bg-gray-800">
              {t("pages.equipmentHistory.endTime")}
            </th>
            <th className="text-center px-3 py-2 border border-gray-700 bg-gray-800">
              {t("pages.equipmentHistory.duration")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const badge = getStatusBadge(row.lineStatusCode);
            return (
              <tr key={idx} className="border-t border-gray-800 hover:bg-gray-800/30">
                <td className="px-3 py-1.5 font-medium text-gray-200 whitespace-nowrap border border-gray-800 sticky left-0 bg-gray-950 z-10">
                  {row.lineName}
                  <span className="ml-1 text-xs text-gray-500">({row.lineCode})</span>
                </td>
                <td className="px-3 py-1.5 text-center border border-gray-800">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${badge.color}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                  {row.startDate}
                </td>
                <td className="px-3 py-1.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                  {row.endDate}
                </td>
                <td className={`px-3 py-1.5 text-center border border-gray-800 whitespace-nowrap ${getStopColor(row.stopMinutes)} ${getStopBg(row.stopMinutes)}`}>
                  {row.stopMinutes > 0 ? `${row.stopMinutes}${t("pages.equipment.minuteUnit")}` : "0"}
                  {row.stopMinutes >= GRADE_C_THRESHOLD && (
                    <span className="ml-1 text-xs text-red-500">C</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
