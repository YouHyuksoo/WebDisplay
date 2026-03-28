/**
 * @file src/components/ctq/RepairStatusTable.tsx
 * @description 수리상태 테이블 -- 불량 PID별 수리 현황 목록
 *
 * 초보자 가이드:
 * 1. 행=개별 불량 PID 레코드
 * 2. 코드값은 F_GET_BASECODE로 변환된 명칭으로 표시
 * 3. QC_RESULT, REPAIR_RESULT 등 모두 한글/영문 명칭 표시
 */

"use client";

import { useTranslations } from "next-intl";
import type { RepairStatusRow } from "@/types/ctq/repair-status";

interface Props {
  rows: RepairStatusRow[];
}

export default function RepairStatusTable({ rows }: Props) {
  const t = useTranslations("ctq");

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-20" style={{ boxShadow: "0 2px 0 0 #1f2937" }}>
          <tr className="bg-gray-800">
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.time")}
            </th>
            <th className="text-left px-2 py-1 border border-gray-700 bg-gray-800 sticky left-0 z-30">
              PID
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("common.line")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.model")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("pages.repairStatus.workstage")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("pages.repairStatus.repairWorkstage")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("pages.repairStatus.qcResult")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.repairLabel")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.receipt")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.location")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.defectPart")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.badReason")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("pages.repairStatus.badReasonName")}
            </th>
            <th className="text-center px-2 py-1 border border-gray-700 bg-gray-800">
              {t("table.handling")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isNewGroup = idx === 0 || rows[idx - 1].workstageName !== row.workstageName;
            return (
            <tr key={idx} className={`hover:bg-gray-800/30 ${isNewGroup ? "border-t-2 border-t-blue-600" : "border-t border-gray-800"}`}>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.qcDate}
              </td>
              <td className="px-2 py-0.5 font-mono text-gray-200 whitespace-nowrap border border-gray-800 sticky left-0 bg-gray-950 z-10">
                {row.pid}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.lineName}
                <span className="ml-1 text-xs text-gray-500">({row.lineCode})</span>
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.modelName}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.workstageName}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.repairWorkstageName}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 whitespace-nowrap">
                <span className={row.qcResultName === "-" ? "text-gray-500" : "text-yellow-400 font-bold"}>
                  {row.qcResultName}
                </span>
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 whitespace-nowrap">
                <span className={row.repairResultName === "-" ? "text-gray-500" : "text-green-400 font-bold"}>
                  {row.repairResultName}
                </span>
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.receiptName}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300">
                {row.locationCode}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.defectItemCode}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-400 whitespace-nowrap">
                {row.badReasonCode}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.badReasonName}
              </td>
              <td className="px-2 py-0.5 text-center border border-gray-800 text-gray-300 whitespace-nowrap">
                {row.handlingName}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
