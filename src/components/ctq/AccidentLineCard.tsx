/**
 * @file src/components/ctq/AccidentLineCard.tsx
 * @description 사고성 라인 카드 - HIPOT/BURNIN/ATE 공정별 NG 건수 기반 등급 표시
 *
 * 초보자 가이드:
 * 1. **등급별 스타일**: A(빨강/라인정지), B(노랑/경고), OK(초록/가동중)
 * 2. **NG 모달**: NG 수 클릭 시 전체 NG 레코드 조회 모달 열림
 * 3. **pendingCount**: 판정대기 건수 표시 (등급에는 미반영)
 */

"use client";

import { useState } from "react";
import type { AccidentLineCardData, AccidentGrade } from "@/types/ctq/accident";
import NgDetailModal from "@/components/ctq/NgDetailModal";
import { useTranslations } from "next-intl";
import { translateDetail } from "@/lib/ctq/translate-detail";

const GRADE_STYLES: Record<AccidentGrade, { card: string; badge: string }> = {
  A: {
    card: "border-gray-700 bg-gray-900/50",
    badge: "bg-red-600 text-white",
  },
  B: {
    card: "border-gray-700 bg-gray-900/50",
    badge: "bg-yellow-600 text-white",
  },
  OK: {
    card: "border-gray-700 bg-gray-900/50",
    badge: "bg-green-700 text-white",
  },
};

const ROW_GRADE_STYLES: Record<AccidentGrade, string> = {
  A: "bg-red-900/40 text-red-200",
  B: "bg-yellow-900/40 text-yellow-200",
  OK: "",
};

/** "2026/02/12 03:55:23" -> "02/12 03:55" */
function formatShortDate(dt: string): string {
  const parts = dt.split(" ");
  if (parts.length < 2) return dt;
  const date = parts[0].slice(5);
  const time = parts[1].slice(0, 5);
  return `${date} ${time}`;
}

export default function AccidentLineCard({ line, compact = false }: { line: AccidentLineCardData; compact?: boolean }) {
  const t = useTranslations("ctq");
  const style = GRADE_STYLES[line.overallGrade];

  const GRADE_TEXT: Record<AccidentGrade, string> = {
    A: t("grade.lineStop"),
    B: t("grade.warning"),
    OK: t("grade.running"),
  };
  const [modal, setModal] = useState<{ process: string; label: string } | null>(null);

  return (
    <div className={`rounded-lg border-2 ${style.card} p-0 overflow-hidden`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between bg-black/40 ${compact ? "px-4 py-2" : "px-4 py-2"}`}>
        <div>
          <span className={`text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>Line: </span>
          <span className={`font-bold text-white ${compact ? "text-base" : "text-base"}`}>{line.lineName}</span>
          <span className={`ml-2 text-gray-500 ${compact ? "text-xs" : "text-xs"}`}>({line.lineCode})</span>
        </div>
        <span className={`rounded font-bold ${style.badge} ${compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
          {GRADE_TEXT[line.overallGrade]}
        </span>
      </div>

      {/* 공정 테이블 */}
      <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
        <thead>
          <tr className={`bg-gray-600/50 text-gray-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <th className={`text-left w-24 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>{t("table.process")}</th>
            <th className={`text-left w-32 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>{t("table.status")}</th>
            <th className={`text-left w-28 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>{t("table.lastNgInspect")}</th>
            <th className={`text-center w-14 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>NG</th>
            <th className={`text-center w-20 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>{t("table.gradeCol")}</th>
          </tr>
        </thead>
        <tbody>
          {line.processes.map((p) => (
            <tr
              key={p.process}
              className={`border-t border-gray-800 ${ROW_GRADE_STYLES[p.grade]}`}
            >
              <td className={`font-medium text-gray-200 whitespace-nowrap bg-gray-600/50 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>
                {p.processLabel}
              </td>
              <td className={compact ? "px-3 py-1.5" : "px-4 py-2"} title={translateDetail(p.detail, t) || ""}>
                {p.detail ? (
                  <span className={`font-bold text-xs ${p.grade === "A" ? "text-red-400" : "text-yellow-400"}`}>
                    {translateDetail(p.detail, t)}
                  </span>
                ) : (
                  <span className="text-green-400">OK</span>
                )}
              </td>
              <td className={`text-gray-400 text-xs font-mono whitespace-nowrap ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>
                {p.lastInspectDate ? formatShortDate(p.lastInspectDate) : "-"}
              </td>
              <td
                className={`text-center ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}
                onClick={() => p.ngCount > 0 && setModal({ process: p.process, label: p.processLabel })}
              >
                {p.ngCount > 0 ? (
                  <span className="text-red-400 font-bold cursor-pointer">
                    {p.ngCount}
                    {p.pendingCount > 0 && (
                      <span className="text-orange-400 text-xs ml-0.5" title={t("table.pendingJudgment")}>
                        ({p.pendingCount})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-600">0</span>
                )}
              </td>
              <td className={`text-center whitespace-nowrap ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>
                {p.grade === "A" && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${GRADE_STYLES.A.badge}`}>
                    {t("grade.a")}
                  </span>
                )}
                {p.grade === "B" && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${GRADE_STYLES.B.badge}`}>
                    {t("grade.b")}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <NgDetailModal
        open={modal !== null}
        title={modal ? `${line.lineName} - ${modal.label} ${t("table.ngAll")}` : ""}
        fetchUrl={modal ? `/api/ctq/ng-details?type=${modal.process}&lineCode=${encodeURIComponent(line.lineCode)}` : ""}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
