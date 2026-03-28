/**
 * @file src/components/ctq/NgTooltip.tsx
 * @description NG 상세 툴팁 - createPortal로 body에 렌더링하여 overflow 잘림 방지
 *
 * 초보자 가이드:
 * 1. **문제**: 카드에 overflow-hidden이 있어 내부 absolute 툴팁이 잘림
 * 2. **해결**: createPortal로 document.body에 렌더링 + 마우스 위치 기반 배치
 * 3. **사용법**: 호버 대상 요소에 onMouseEnter/Leave로 show/hide + 좌표 전달
 */

"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export interface NgDetail {
  time: string;
  pid: string;
  model: string;
  receiptDeficit: string;
  locationCode: string;
  repairResult: string;
  qcHandling: string;
  defectItem: string;
}

interface NgTooltipProps {
  details: NgDetail[];
  title: string;
  totalCount?: number;
  position: { x: number; y: number };
}

export default function NgTooltip({ details, title, totalCount, position }: NgTooltipProps) {
  const t = useTranslations("ctq");
  if (details.length === 0) return null;

  const tooltipWidth = 580;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const left = position.x + tooltipWidth > viewportWidth
    ? viewportWidth - tooltipWidth - 16
    : position.x;

  const rdLabel = (v: string) => {
    if (v === "1") return t("table.receipt");
    if (v === "2") return t("table.repairLabel");
    return v || "-";
  };

  return createPortal(
    <div
      className="fixed z-[99999] pointer-events-none"
      style={{ left, top: position.y + 12 }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-3" style={{ width: tooltipWidth }}>
        <div className="text-xs font-bold text-yellow-400 mb-2">
          {title}
          {totalCount != null && ` (${totalCount}${t("table.ofTotal")} ${details.length}${t("table.cases")})`}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left pb-1 pr-2">{t("table.time")}</th>
              <th className="text-left pb-1 pr-2">{t("table.model")}</th>
              <th className="text-left pb-1 pr-2">PID</th>
              <th className="text-left pb-1 pr-2">{t("table.category")}</th>
              <th className="text-left pb-1 pr-2">{t("table.location")}</th>
              <th className="text-left pb-1 pr-2">{t("table.defectPart")}</th>
              <th className="text-left pb-1 pr-2">{t("table.repair")}</th>
              <th className="text-left pb-1">{t("table.handling")}</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i} className="text-gray-300 border-b border-gray-800/50">
                <td className="py-0.5 pr-2 font-mono whitespace-nowrap">
                  {d.time.length > 10 ? d.time.slice(5, 16) : d.time}
                </td>
                <td className="py-0.5 pr-2 whitespace-nowrap ">{d.model}</td>
                <td className="py-0.5 pr-2 font-mono text-gray-400 whitespace-nowrap ">{d.pid}</td>
                <td className="py-0.5 pr-2 whitespace-nowrap">{rdLabel(d.receiptDeficit)}</td>
                <td className="py-0.5 pr-2 whitespace-nowrap text-blue-300 ">{d.locationCode || "-"}</td>
                <td className="py-0.5 pr-2 whitespace-nowrap ">{d.defectItem || "-"}</td>
                <td className="py-0.5 pr-2 whitespace-nowrap">{d.repairResult || "-"}</td>
                <td className="py-0.5 whitespace-nowrap">{d.qcHandling || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,
    document.body
  );
}
