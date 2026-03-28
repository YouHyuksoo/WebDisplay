/**
 * @file src/components/ctq/MaterialLineCard.tsx
 * @description 원자재 동일부품 라인 카드 - 부품별 일/90일 NG 건수 기반 등급 표시
 *
 * 초보자 가이드:
 * 1. **등급별 스타일**: A(빨강/라인정지), C(보라/불량개선), OK(초록/가동중)
 * 2. **툴팁**: 행 hover 시 NG 상세 표시
 * 3. **모달**: 행 클릭 시 전체 NG 레코드 조회
 */

"use client";

import { useState } from "react";
import type { MaterialLineCardData, MaterialGrade } from "@/types/ctq/material";
import NgTooltip from "@/components/ctq/NgTooltip";
import NgDetailModal from "@/components/ctq/NgDetailModal";
import { useTranslations } from "next-intl";

const GRADE_STYLES: Record<MaterialGrade, { card: string; badge: string }> = {
  A: {
    card: "border-red-500 bg-red-950/30",
    badge: "bg-red-600 text-white",
  },
  C: {
    card: "border-purple-500 bg-purple-950/30",
    badge: "bg-purple-600 text-white",
  },
  OK: {
    card: "border-gray-700 bg-gray-900/50",
    badge: "bg-green-700 text-white",
  },
};

export default function MaterialLineCard({ line, compact = false }: { line: MaterialLineCardData; compact?: boolean }) {
  const t = useTranslations("ctq");
  const style = GRADE_STYLES[line.overallGrade];

  const GRADE_TEXT: Record<MaterialGrade, string> = {
    A: t("grade.lineStop"),
    C: t("grade.qualityImprove"),
    OK: t("grade.running"),
  };
  const [tooltip, setTooltip] = useState<{
    idx: number;
    pos: { x: number; y: number };
  } | null>(null);
  const [modal, setModal] = useState<{ defectItem: string } | null>(null);

  return (
    <div className={`rounded-lg border-2 ${style.card} p-0 overflow-hidden min-h-[180px] flex flex-col`}>
      <div className={`flex items-center justify-between bg-black/40 ${compact ? "px-4 py-2" : "px-4 py-2"}`}>
        <div>
          <span className={`text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>Line: </span>
          <span className={`font-bold text-white ${compact ? "text-base" : "text-base"}`}>{line.lineName}</span>
          <span className={`ml-2 text-gray-500 ${compact ? "text-xs" : "text-xs"}`}>({line.lineCode})</span>
        </div>
        <span className={`rounded font-bold ${style.badge} ${compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
          {GRADE_TEXT[line.overallGrade]}
        </span>
      </div>

      <table className={`w-full flex-1 ${compact ? "text-xs" : "text-sm"}`}>
        <thead>
          <tr className={`bg-black/30 text-gray-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <th className={`text-left ${compact ? "px-3 py-1.5" : "px-3 py-1.5"}`}>{t("table.component")}</th>
            <th className={`text-center w-16 ${compact ? "px-3 py-1.5" : "px-3 py-1.5"}`}>{t("table.dailyNg")}</th>
            <th className={`text-center w-20 ${compact ? "px-3 py-1.5" : "px-3 py-1.5"}`}>{t("table.cumNg")}</th>
          </tr>
        </thead>
        <tbody>
          {line.defects.map((d, i) => (
            <tr
              key={`${d.defectItem}-${i}`}
              className={`border-t border-gray-800 ${d.ngDetails?.length > 0 ? "cursor-pointer" : ""}`}
              onMouseEnter={(e) => d.ngDetails?.length > 0 && setTooltip({ idx: i, pos: { x: e.clientX, y: e.clientY } })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => d.cumulativeCount > 0 && setModal({ defectItem: d.defectItem })}
            >
              <td className={`font-medium text-gray-200 whitespace-nowrap ${compact ? "px-3 py-1.5" : "px-3 py-1.5"}`}>
                {d.defectItem}
              </td>
              <td className={`text-center ${compact ? "px-3 py-1.5" : "px-3 py-1.5"}`}>
                {d.dailyCount > 0 ? (
                  <span className={`font-bold ${d.dailyCount >= 3 ? "text-red-400" : "text-yellow-400"}`}>
                    {d.dailyCount}
                  </span>
                ) : (
                  <span className="text-gray-600">0</span>
                )}
              </td>
              <td className={`text-center ${compact ? "px-3 py-1.5" : "px-3 py-1.5"}`}>
                {d.cumulativeCount > 0 ? (
                  <span className={`font-bold ${d.cumulativeCount >= 3 ? "text-orange-400" : "text-yellow-400"}`}>
                    {d.cumulativeCount}
                  </span>
                ) : (
                  <span className="text-gray-600">0</span>
                )}
              </td>
            </tr>
          ))}
          {line.defects.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-gray-600 text-xs">
                {t("table.noDefects")}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {tooltip != null && (() => {
        const d = line.defects[tooltip.idx];
        if (!d?.ngDetails?.length) return null;
        return (
          <NgTooltip
            details={d.ngDetails}
            title={`${d.defectItem} ${t("table.ngDetail")}`}
            totalCount={d.cumulativeCount}
            position={tooltip.pos}
          />
        );
      })()}

      <NgDetailModal
        open={modal !== null}
        title={modal ? `${line.lineName} - ${modal.defectItem} ${t("table.ngAll")}` : ""}
        fetchUrl={modal ? `/api/ctq/ng-details?type=material&lineCode=${encodeURIComponent(line.lineCode)}&defectItem=${encodeURIComponent(modal.defectItem)}` : ""}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
