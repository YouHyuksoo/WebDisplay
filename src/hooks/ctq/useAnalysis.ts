/**
 * @file src/hooks/ctq/useAnalysis.ts
 * @description 종합분석 데이터 훅 — 8개 API 병렬 호출 + 집계
 *
 * 초보자 가이드:
 * 1. fetchAll() 호출 시 8개 모니터링 API를 Promise.allSettled로 병렬 호출
 * 2. 각 API 응답에서 이상 라인 추출 + 등급 집계
 * 3. 부분 실패 시 해당 모니터링만 에러 표시, 나머지 정상 렌더링
 * 4. selectedLines: localStorage에서 읽은 라인 문자열 ("%" 또는 쉼표 구분)
 */

import { useState, useCallback } from "react";
import type {
  MonitorKey,
  MonitorSummary,
  AnalysisData,
  OverallStatus,
  AbnormalLine,
  ProcessDetail,
} from "@/types/ctq/analysis";

/** 8개 모니터링 엔드포인트 정의 */
const API_ENDPOINTS: { key: MonitorKey; path: string }[] = [
  { key: "repeatability", path: "/api/ctq/repeatability" },
  { key: "nonConsecutive", path: "/api/ctq/non-consecutive" },
  { key: "accident", path: "/api/ctq/accident" },
  { key: "material", path: "/api/ctq/material" },
  { key: "openShort", path: "/api/ctq/open-short" },
  { key: "indicator", path: "/api/ctq/indicator" },
  { key: "fpy", path: "/api/ctq/fpy" },
  { key: "equipment", path: "/api/ctq/equipment" },
];

function gradePriority(g: string): number {
  if (g === "A") return 3;
  if (g === "B") return 2;
  if (g === "C") return 1;
  return 0;
}

function higherGrade(a: string, b: string): string {
  return gradePriority(a) >= gradePriority(b) ? a : b;
}

/** 일반 모니터링 (반복성/비연속/사고성/원자재/공용부품) 응답 파싱 */
function parseStandardResponse(json: Record<string, unknown>): {
  highestGrade: string;
  abnormalLines: AbnormalLine[];
} {
  const lines = (json.lines ?? []) as Record<string, unknown>[];
  let highest = "OK";
  const abnormal: AbnormalLine[] = [];

  for (const line of lines) {
    const grade = (line.overallGrade as string) ?? "OK";
    if (grade === "OK") continue;
    highest = higherGrade(highest, grade);

    const details: ProcessDetail[] = [];
    const procs = Array.isArray(line.processes) ? line.processes : [];
    for (const p of procs as Record<string, unknown>[]) {
      if (p.grade && p.grade !== "OK") {
        details.push({
          process: (p.processLabel as string) ?? (p.process as string) ?? "",
          grade: p.grade as string,
          ngCount: (p.ngCount as number) ?? 0,
          detail: (p.detail as string) ?? "",
        });
      }
    }
    abnormal.push({
      lineName: line.lineName as string,
      lineCode: line.lineCode as string,
      grade,
      details,
    });
  }

  return { highestGrade: highest, abnormalLines: abnormal };
}

/** FPY 응답 파싱 — overallGrade="A" 라인만 */
function parseFpyResponse(json: Record<string, unknown>): {
  highestGrade: string;
  abnormalLines: AbnormalLine[];
} {
  const lines = (json.lines ?? []) as Record<string, unknown>[];
  let highest = "OK";
  const abnormal: AbnormalLine[] = [];

  for (const line of lines) {
    if (line.overallGrade !== "A") continue;
    highest = "A";
    const details: ProcessDetail[] = [];
    const procs = (line.processes ?? {}) as Record<string, Record<string, unknown>>;
    for (const [key, val] of Object.entries(procs)) {
      const today = val?.today as Record<string, number> | undefined;
      if (today && today.yield < 90) {
        details.push({
          process: key,
          grade: "A",
          ngCount: today.ng ?? 0,
          detail: `${today.yield.toFixed(1)}%`,
        });
      }
    }
    abnormal.push({
      lineName: line.lineName as string,
      lineCode: line.lineCode as string,
      grade: "A",
      details,
    });
  }

  return { highestGrade: highest, abnormalLines: abnormal };
}

/** 설비 응답 파싱 — 공정별 60분+ 정지 = Grade C */
function parseEquipmentResponse(json: Record<string, unknown>): {
  highestGrade: string;
  abnormalLines: AbnormalLine[];
} {
  const lines = (json.lines ?? []) as Record<string, unknown>[];
  let highest = "OK";
  const abnormal: AbnormalLine[] = [];

  for (const line of lines) {
    const procs = (line.processes ?? {}) as Record<string, Record<string, unknown>>;
    const details: ProcessDetail[] = [];

    for (const [key, val] of Object.entries(procs)) {
      if (!val) continue;
      const mins = (val.stopMinutes as number) ?? 0;
      if (mins >= 60) {
        details.push({ process: key, grade: "C", ngCount: mins, detail: `${mins}분` });
      }
    }

    if (details.length > 0) {
      highest = higherGrade(highest, "C");
      abnormal.push({
        lineName: line.lineName as string,
        lineCode: line.lineCode as string,
        grade: "C",
        details,
      });
    }
  }

  return { highestGrade: highest, abnormalLines: abnormal };
}

/** 지표 응답 파싱 — 전월 대비 200%+ = Grade C */
const INDICATOR_PROCESS_ORDER: Record<string, number> = {
  ICT: 0,
  HIPOT: 1,
  FT: 2,
  BURNIN: 3,
  ATE: 4,
};

function parseIndicatorResponse(json: Record<string, unknown>): {
  highestGrade: string;
  abnormalLines: AbnormalLine[];
} {
  const models = (json.models ?? []) as Record<string, unknown>[];
  let highest = "OK";
  const abnormal: AbnormalLine[] = [];

  for (const model of models) {
    const procs = (model.processes ?? {}) as Record<string, Record<string, unknown>>;
    const details: ProcessDetail[] = [];

    for (const [key, val] of Object.entries(procs)) {
      if (!val) continue;
      const last = (val.lastWeek as number) ?? 0;
      const curr = (val.thisWeek as number) ?? 0;
      if (last > 0 && curr >= last * 2) {
        const rate = Math.round((curr / last) * 100);
        details.push({ process: key, grade: "C", ngCount: curr, detail: `${rate}%` });
      }
    }

    details.sort(
      (a, b) =>
        (INDICATOR_PROCESS_ORDER[a.process] ?? 99) -
        (INDICATOR_PROCESS_ORDER[b.process] ?? 99)
    );

    if (details.length > 0) {
      highest = higherGrade(highest, "C");
      abnormal.push({
        lineName: (model.itemCode as string) ?? "",
        lineCode: "",
        grade: "C",
        details,
      });
    }
  }

  return { highestGrade: highest, abnormalLines: abnormal };
}

function parseResponse(key: MonitorKey, json: Record<string, unknown>) {
  if (key === "fpy") return parseFpyResponse(json);
  if (key === "equipment") return parseEquipmentResponse(json);
  if (key === "indicator") return parseIndicatorResponse(json);
  return parseStandardResponse(json);
}

/**
 * 종합분석 훅 — 8개 CTQ API를 병렬 호출하여 등급 집계
 * @param selectedLines - 쉼표 구분 라인 코드 또는 "%" (전체)
 */
export function useAnalysis(selectedLines: string = "%") {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);

  const buildUrl = useCallback(
    (path: string, key: MonitorKey) => {
      const params = new URLSearchParams();
      if (selectedLines !== "%") params.set("lines", selectedLines);
      if (key === "indicator") params.set("period", "monthly");
      const qs = params.toString();
      return `${path}${qs ? `?${qs}` : ""}`;
    },
    [selectedLines]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled(
      API_ENDPOINTS.map(async ({ key, path }) => {
        const controller = new AbortController();
        const timeoutMs = key === "indicator" ? 120000 : 30000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(buildUrl(path, key), {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          return { key, json };
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    const summaries: MonitorSummary[] = API_ENDPOINTS.map(({ key }, i) => {
      const result = results[i];
      if (result.status === "rejected") {
        return {
          key,
          highestGrade: "OK" as const,
          abnormalCount: 0,
          abnormalLines: [],
          error: String(result.reason),
        };
      }
      const { json } = result.value;
      const parsed = parseResponse(key, json);
      return {
        key,
        highestGrade: parsed.highestGrade as "A" | "B" | "C" | "OK",
        abnormalCount: parsed.abnormalLines.length,
        abnormalLines: parsed.abnormalLines,
      };
    });

    const overall: OverallStatus = { gradeA: 0, gradeB: 0, gradeC: 0, ok: 0 };
    for (const s of summaries) {
      if (s.error) continue;
      for (const line of s.abnormalLines) {
        if (line.grade === "A") overall.gradeA++;
        else if (line.grade === "B") overall.gradeB++;
        else if (line.grade === "C") overall.gradeC++;
      }
    }

    setData({ summaries, overall, lastUpdated: new Date().toISOString() });
    setLoading(false);
  }, [buildUrl]);

  return { data, loading, fetchAll };
}
