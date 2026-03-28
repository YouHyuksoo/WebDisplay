/**
 * @file src/components/ctq/OpenShortLineCard.tsx
 * @description 공용부품 Open/Short 라인 카드
 *
 * 초보자 가이드:
 * 1. **등급별 스타일**: B(주황/출하중지), OK(초록/가동중)
 * 2. **NG 툴팁**: 마우스 호버 시 최근 NG 상세 표시
 * 3. **NG 모달**: 클릭 시 전체 NG 레코드 조회 모달 열림
 */

"use client";

import { useState } from "react";
import type { OpenShortLineCardData, OpenShortGrade } from "@/types/ctq/open-short";
import NgTooltip from "@/components/ctq/NgTooltip";
import NgDetailModal from "@/components/ctq/NgDetailModal";
import { useTranslations } from "next-intl";

const GRADE_STYLES: Record<OpenShortGrade, { card: string; badge: string }> = {
  B: {
    card: "border-gray-700 bg-gray-900/50",
    badge: "bg-orange-600 text-white",
  },
  OK: {
    card: "border-gray-700 bg-gray-900/50",
    badge: "bg-green-700 text-white",
  },
};

export default function OpenShortLineCard({ line, compact = false }: { line: OpenShortLineCardData; compact?: boolean }) {
  const t = useTranslations("ctq");
  const style = GRADE_STYLES[line.overallGrade];

  const GRADE_TEXT: Record<OpenShortGrade, string> = {
    B: t("grade.shipmentStop"),
    OK: t("grade.running"),
  };
  const [tooltip, setTooltip] = useState<{
    idx: number;
    pos: { x: number; y: number };
  } | null>(null);
  const [modal, setModal] = useState<{ defectType: string; badReasonCode: string } | null>(null);

  return (
    <div className={`rounded-lg border-2 ${style.card} p-0 overflow-hidden`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between bg-black/40 ${compact ? "px-4 py-2" : "px-4 py-3"}`}>
        <div>
          <span className={`text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>Line: </span>
          <span className={`font-bold text-white ${compact ? "text-base" : "text-lg"}`}>{line.lineName}</span>
          <span className={`ml-2 text-gray-500 ${compact ? "text-xs" : "text-xs"}`}>({line.lineCode})</span>
        </div>
        <span className={`rounded font-bold ${style.badge} ${compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
          {GRADE_TEXT[line.overallGrade]}
        </span>
      </div>

      {/* 불량 테이블 */}
      <table className={`w-full ${compact ? "text-xs" : "text-base"}`}>
        <thead>
          <tr className={`bg-gray-600/50 text-gray-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <th className={`text-left ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>{t("table.component")}</th>
            <th className={`text-center w-20 ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>{t("table.type")}</th>
            <th className={`text-center w-16 ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>{t("table.count")}</th>
            <th className={`text-right ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>{t("table.lastInspect")}</th>
          </tr>
        </thead>
        <tbody>
          {line.defects.map((d, i) => (
            <tr
              key={`${d.defectItem}-${d.badReasonCode}-${i}`}
              className={`border-t border-gray-800 ${d.ngDetails?.length > 0 ? "cursor-pointer" : ""}`}
              onMouseEnter={(e) => d.ngDetails?.length > 0 && setTooltip({ idx: i, pos: { x: e.clientX, y: e.clientY } })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => d.count > 0 && setModal({ defectType: d.defectType, badReasonCode: d.badReasonCode })}
            >
              <td className={`font-medium text-gray-200 whitespace-nowrap ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>
                {d.defectItem}
              </td>
              <td className={`text-center ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  d.defectType === "SHORT" ? "bg-red-900/60 text-red-300" : "bg-blue-900/60 text-blue-300"
                }`}>
                  {d.defectType}
                </span>
              </td>
              <td className={`text-center ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>
                <span className={`font-bold ${d.count >= 2 ? "text-orange-400" : "text-gray-400"}`}>
                  {d.count}
                </span>
              </td>
              <td className={`text-right font-mono text-xs text-gray-400 whitespace-nowrap ${compact ? "px-3 py-1.5" : "px-4 py-3"}`}>
                {d.lastInspectTime?.length > 10 ? d.lastInspectTime.slice(5, 16) : d.lastInspectTime || "-"}
              </td>
            </tr>
          ))}
          {line.defects.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-center text-gray-600 text-xs">
                {t("table.noDefectsToday")}
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
            title={`${d.defectType} ${t("table.ngDetail")}`}
            totalCount={d.count}
            position={tooltip.pos}
          />
        );
      })()}

      <NgDetailModal
        open={modal !== null}
        title={modal ? `${line.lineName} - ${modal.defectType} ${t("table.ngAll")}` : ""}
        fetchUrl={modal ? `/api/ctq/ng-details?type=open-short&lineCode=${encodeURIComponent(line.lineCode)}&badReasonCode=${encodeURIComponent(modal.badReasonCode)}` : ""}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
