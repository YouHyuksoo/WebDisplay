/**
 * @file src/components/ctq/AnalysisDetailReport.tsx
 * @description 종합분석 상세 보고서 — 8개 모니터링 섹션별 이상 라인 테이블
 *
 * 초보자 가이드:
 * 1. 8개 섹션이 순서대로 렌더링 (반복성 → 설비)
 * 2. 각 섹션에 id="report-{key}"로 스크롤 앵커 제공
 * 3. 이상 라인만 테이블 표시, 없으면 "이상 없음"
 * 4. useTranslations('ctq')로 다국어 처리
 */

"use client";

import { useTranslations } from "next-intl";
import type { MonitorSummary, MonitorKey, AbnormalLine } from "@/types/ctq/analysis";

/** 섹션 표시 순서 */
const SECTION_ORDER: MonitorKey[] = [
  "repeatability",
  "nonConsecutive",
  "accident",
  "material",
  "openShort",
  "indicator",
  "fpy",
  "equipment",
];

/** 모니터링 키 → i18n 페이지 타이틀 키 매핑 */
const SECTION_TITLE_KEYS: Record<MonitorKey, string> = {
  repeatability: "pages.repeatability.title",
  nonConsecutive: "pages.nonConsecutive.title",
  accident: "pages.accident.title",
  material: "pages.material.title",
  openShort: "pages.openShort.title",
  indicator: "pages.indicator.title",
  fpy: "pages.fpy.title",
  equipment: "pages.equipment.title",
};

const GRADE_BADGE: Record<string, string> = {
  A: "bg-red-600",
  B: "bg-orange-600",
  C: "bg-purple-600",
  OK: "bg-green-700",
};

interface Props {
  summaries: MonitorSummary[];
}

export default function AnalysisDetailReport({ summaries }: Props) {
  const t = useTranslations("ctq");

  const summaryMap = new Map(summaries.map((s) => [s.key, s]));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {t("pages.analysis.section")}
      </h2>

      {SECTION_ORDER.map((key, idx) => {
        const s = summaryMap.get(key);
        if (!s) return null;
        const badgeClass = GRADE_BADGE[s.highestGrade] ?? GRADE_BADGE.OK;

        return (
          <section
            key={key}
            id={`report-${key}`}
            className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden"
          >
            {/* 섹션 헤더 */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50">
              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {idx + 1}
              </span>
              <span className="text-sm font-bold text-white">
                {t(SECTION_TITLE_KEYS[key])}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${badgeClass}`}
              >
                {s.highestGrade}
              </span>
              {s.error && (
                <span className="text-xs text-red-400 ml-auto">
                  {t("pages.analysis.fetchError")}
                </span>
              )}
            </div>

            {/* 섹션 본문 */}
            <div className="px-4 py-3">
              {s.error ? (
                <p className="text-sm text-red-400">{s.error}</p>
              ) : s.abnormalLines.length === 0 ? (
                <p className="text-sm text-green-400 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {t("pages.analysis.noIssues")}
                </p>
              ) : key === "indicator" ? (
                <IndicatorMatrix lines={s.abnormalLines} />
              ) : (
                <AbnormalTable lines={s.abnormalLines} t={t} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** 일반 이상 라인 테이블 */
function AbnormalTable({
  lines,
  t,
}: {
  lines: AbnormalLine[];
  t: ReturnType<typeof useTranslations<"ctq">>;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <th className="text-left py-1.5 px-2">{t("common.line")}</th>
          <th className="text-left py-1.5 px-2">{t("table.process")}</th>
          <th className="text-left py-1.5 px-2">{t("table.gradeCol")}</th>
          <th className="text-right py-1.5 px-2">{t("table.count")}</th>
          <th className="text-left py-1.5 px-2">Detail</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, li) =>
          line.details.length > 0 ? (
            line.details.map((d, di) => (
              <tr key={`${li}-${di}`} className="border-b border-gray-800/50">
                {di === 0 && (
                  <td
                    className="py-1.5 px-2 text-gray-300 font-medium"
                    rowSpan={line.details.length}
                  >
                    {line.lineName}
                  </td>
                )}
                <td className="py-1.5 px-2 text-gray-400">{d.process}</td>
                <td className="py-1.5 px-2">
                  <span
                    className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${
                      GRADE_BADGE[d.grade] ?? "bg-gray-600"
                    }`}
                  >
                    {d.grade}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right text-gray-300">
                  {d.ngCount.toLocaleString()}
                </td>
                <td className="py-1.5 px-2 text-gray-500 text-[11px]">{d.detail}</td>
              </tr>
            ))
          ) : (
            <tr key={li} className="border-b border-gray-800/50">
              <td className="py-1.5 px-2 text-gray-300 font-medium">{line.lineName}</td>
              <td className="py-1.5 px-2 text-gray-400">-</td>
              <td className="py-1.5 px-2">
                <span
                  className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${
                    GRADE_BADGE[line.grade] ?? "bg-gray-600"
                  }`}
                >
                  {line.grade}
                </span>
              </td>
              <td className="py-1.5 px-2 text-right text-gray-300">-</td>
              <td className="py-1.5 px-2 text-gray-500">-</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

/** 지표 전용 매트릭스 테이블: 모델(행) x 공정(열) */
const IND_PROCESSES = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

function IndicatorMatrix({ lines }: { lines: AbnormalLine[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <th className="text-left py-1.5 px-2">
            {lines.length > 0 ? "Model" : ""}
          </th>
          {IND_PROCESSES.map((p) => (
            <th key={p} className="text-center py-1.5 px-2">
              {p} <span className="text-gray-600">PPM</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, li) => {
          const detailMap = new Map(line.details.map((d) => [d.process, d]));
          return (
            <tr key={li} className="border-b border-gray-800/50">
              <td className="py-1.5 px-2 text-gray-300 font-medium whitespace-nowrap">
                {line.lineName}
              </td>
              {IND_PROCESSES.map((p) => {
                const d = detailMap.get(p);
                return (
                  <td
                    key={p}
                    className={`py-1.5 px-2 text-center ${
                      d ? "text-red-400 font-bold" : "text-gray-700"
                    }`}
                  >
                    {d ? `${d.ngCount.toLocaleString()} ${d.detail}` : "-"}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
