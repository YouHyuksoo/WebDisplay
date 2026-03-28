/**
 * @file src/app/api/ctq/non-consecutive/route.ts
 * @description B급 모니터링 API - 동일위치 비연속불량
 *
 * 초보자 가이드:
 * 1. **대상 공정**: FT, ATE
 * 2. **판정 기준**: 동일 Location 2건 이상이지만 연속은 아닌 경우 -> B급
 * 3. **A급 제외**: 연속불량(A급)에 해당하는 Location은 B급에서 제외
 * 4. **매일 08:00 ~ 다음날 08:00** 하루치만 대상
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { parseLines, buildLineInClause, getVietnamTimeRange } from "@/lib/ctq/line-filter";
import { executeQuery } from "@/lib/db";
import type {
  RepeatProcessType,
  RepeatProcessStatus,
  RepeatLineCardData,
  RepeatGrade,
} from "@/types/ctq/non-consecutive";

export const dynamic = "force-dynamic";

interface ProcessConfig {
  table: string;
  pidCol: string;
  dateCol: string;
  resultCol: string;
  dateType: "varchar" | "date";
  extraWhere?: string;
}

const PROCESS_CONFIG: Record<RepeatProcessType, ProcessConfig> = {
  FT: {
    table: "IQ_MACHINE_FT1_SMPS_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    dateType: "varchar",
    extraWhere: "AND t.LAST_FLAG = 'Y'",
  },
  ATE: {
    table: "IQ_MACHINE_ATE_SERVER_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    dateType: "varchar",
    extraWhere: "AND t.LAST_FLAG = 'Y'",
  },
};

const PROCESS_LABELS: Record<RepeatProcessType, string> = {
  FT: "FT#1",
  ATE: "ATE",
};

const PROCESS_TYPES: RepeatProcessType[] = ["FT", "ATE"];

interface LineSummaryRow {
  LINE_CODE: string;
  NG_COUNT: number;
  PENDING_COUNT: number;
  LAST_INSPECT: string;
}

interface RepeatLocationRow {
  LINE_CODE: string;
  MODEL_NAME: string;
  LOCATION_CODE: string;
  LOC_COUNT: number;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

function buildDateCondition(config: ProcessConfig, alias: string): string {
  const col = `${alias}.${config.dateCol}`;
  if (config.dateType === "varchar") {
    return `${col} >= :tsStart AND ${col} < :tsEnd`;
  }
  return `${col} >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS') AND ${col} < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')`;
}

/** LINE별 NG 요약 집계 */
async function getLineSummary(
  config: ProcessConfig,
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<LineSummaryRow[]> {
  const condition = buildDateCondition(config, "t");
  const lastInspectExpr =
    config.dateType === "date"
      ? `TO_CHAR(MAX(t.${config.dateCol}), 'YYYY/MM/DD HH24:MI:SS')`
      : `MAX(t.${config.dateCol})`;

  const sql = `
    SELECT t.LINE_CODE,
           COUNT(*) AS NG_COUNT,
           0 AS PENDING_COUNT,
           ${lastInspectExpr} AS LAST_INSPECT
    FROM ${config.table} t
    JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
      AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    WHERE ${condition}
      AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
      AND t.${config.resultCol} NOT IN ('PASS', 'GOOD', 'OK', 'Y')
      AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
      ${config.extraWhere ?? ""}
      AND t.LINE_CODE IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM IP_PRODUCT_WORK_QC q
        WHERE q.SERIAL_NO = t.${config.pidCol} AND q.RECEIPT_DEFICIT = '2' AND q.QC_RESULT = 'O'
      )
      ${lineFilter.clause}
    GROUP BY t.LINE_CODE
  `;
  return executeQuery<LineSummaryRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
    ...lineFilter.params,
  });
}

/**
 * B급 감지: 동일 Location 2건+ 이지만 연속은 아닌 경우
 *
 * 전체 동일Location(2건+)에서 연속불량(A급) Location을 제외
 */
async function getNonConsecutiveLocations(
  config: ProcessConfig,
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<RepeatLocationRow[]> {
  const condition = buildDateCondition(config, "t");
  const conditionSub = buildDateCondition(config, "t2");

  const sql = `
    SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE, LOC_COUNT
    FROM (
      SELECT base.LINE_CODE,
             base.MODEL_NAME,
             r.LOCATION_CODE,
             COUNT(*) AS LOC_COUNT
      FROM (
        SELECT t.LINE_CODE,
               t.${config.pidCol} AS PID_VAL,
               t.${config.dateCol} AS SORT_DATE,
               F_GET_MODEL_NAME_BY_PID(t.${config.pidCol}) AS MODEL_NAME
        FROM ${config.table} t
        JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
          AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
        WHERE ${condition}
          AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
          AND t.${config.resultCol} NOT IN ('PASS', 'GOOD', 'OK', 'Y')
          AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
          ${config.extraWhere ?? ""}
          AND t.LINE_CODE IS NOT NULL
          ${lineFilter.clause}
      ) base
      JOIN (
        SELECT SERIAL_NO, LOCATION_CODE
        FROM (
          SELECT rr.SERIAL_NO, rr.LOCATION_CODE,
                 ROW_NUMBER() OVER (PARTITION BY rr.SERIAL_NO ORDER BY rr.QC_DATE DESC) AS RN
          FROM IP_PRODUCT_WORK_QC rr
          WHERE rr.RECEIPT_DEFICIT = '2'
            AND rr.QC_RESULT != 'O'
            AND rr.LOCATION_CODE IS NOT NULL
            AND rr.LOCATION_CODE <> '*'
        ) WHERE RN = 1
      ) r ON r.SERIAL_NO = base.PID_VAL
      GROUP BY base.LINE_CODE, base.MODEL_NAME, r.LOCATION_CODE
      HAVING COUNT(*) >= 2
    ) total_loc
    WHERE (LINE_CODE, MODEL_NAME, LOCATION_CODE) NOT IN (
      SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE
      FROM (
        SELECT base2.LINE_CODE,
               base2.MODEL_NAME,
               r2.LOCATION_CODE,
               base2.SORT_DATE,
               LAG(r2.LOCATION_CODE) OVER (
                 PARTITION BY base2.LINE_CODE, base2.MODEL_NAME ORDER BY base2.SORT_DATE
               ) AS PREV_LOC,
               LAG(base2.SORT_DATE) OVER (
                 PARTITION BY base2.LINE_CODE, base2.MODEL_NAME ORDER BY base2.SORT_DATE
               ) AS PREV_SORT_DATE
        FROM (
          SELECT t2.LINE_CODE,
                 t2.${config.pidCol} AS PID_VAL,
                 t2.${config.dateCol} AS SORT_DATE,
                 F_GET_MODEL_NAME_BY_PID(t2.${config.pidCol}) AS MODEL_NAME
          FROM ${config.table} t2
          JOIN IP_PRODUCT_2D_BARCODE b2 ON b2.SERIAL_NO = t2.${config.pidCol}
            AND b2.ITEM_CODE IS NOT NULL AND b2.ITEM_CODE <> '*'
          WHERE ${conditionSub}
            AND (t2.${config.pidCol} LIKE 'VN07%' OR t2.${config.pidCol} LIKE 'VNL1%' OR t2.${config.pidCol} LIKE 'VNA2%')
            AND t2.${config.resultCol} NOT IN ('PASS', 'GOOD', 'OK', 'Y')
            AND (t2.QC_CONFIRM_YN IS NULL OR t2.QC_CONFIRM_YN != 'Y')
            ${(config.extraWhere ?? "").replace(/t\./g, "t2.")}
            AND t2.LINE_CODE IS NOT NULL
            ${lineFilter.clause.replace(/t\./g, "t2.")}
        ) base2
        JOIN (
          SELECT SERIAL_NO, LOCATION_CODE
          FROM (
            SELECT rr2.SERIAL_NO, rr2.LOCATION_CODE,
                   ROW_NUMBER() OVER (PARTITION BY rr2.SERIAL_NO ORDER BY rr2.QC_DATE DESC) AS RN2
            FROM IP_PRODUCT_WORK_QC rr2
            WHERE rr2.RECEIPT_DEFICIT = '2'
              AND rr2.QC_RESULT != 'O'
              AND rr2.LOCATION_CODE IS NOT NULL
              AND rr2.LOCATION_CODE <> '*'
          ) WHERE RN2 = 1
        ) r2 ON r2.SERIAL_NO = base2.PID_VAL
      ) sub2
      WHERE sub2.LOCATION_CODE = sub2.PREV_LOC
        AND NOT EXISTS (
          SELECT 1 FROM ${config.table} t_chk
          WHERE t_chk.LINE_CODE = sub2.LINE_CODE
            AND t_chk.${config.dateCol} > sub2.PREV_SORT_DATE
            AND t_chk.${config.dateCol} < sub2.SORT_DATE
            AND t_chk.${config.resultCol} IN ('PASS', 'GOOD', 'OK', 'Y')
            ${(config.extraWhere ?? "").replace(/t\./g, "t_chk.")}
        )
    )
  `;
  return executeQuery<RepeatLocationRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
    ...lineFilter.params,
  });
}

/** LINE_CODE 이름 조회 */
async function getLineNames(lineCodes: string[]): Promise<Map<string, string>> {
  if (lineCodes.length === 0) return new Map();
  const placeholders = lineCodes.map((_, i) => `:lc${i}`).join(",");
  const sql = `
    SELECT LINE_CODE, LINE_NAME
    FROM IP_PRODUCT_LINE
    WHERE LINE_CODE IN (${placeholders})
  `;
  const params: Record<string, string> = {};
  lineCodes.forEach((code, i) => {
    params[`lc${i}`] = code;
  });
  const rows = await executeQuery<LineNameRow>(sql, params);
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(r.LINE_CODE, r.LINE_NAME));
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");
    const timeRange = getVietnamTimeRange();

    /* 1. 2공정 x 2쿼리 병렬 실행 */
    const [summaries, bLocations] = await Promise.all([
      Promise.all(PROCESS_TYPES.map((pt) => getLineSummary(PROCESS_CONFIG[pt], timeRange, lineFilter))),
      Promise.all(PROCESS_TYPES.map((pt) => getNonConsecutiveLocations(PROCESS_CONFIG[pt], timeRange, lineFilter))),
    ]);

    /* 2. Map 변환 */
    const summaryByProcess = new Map<RepeatProcessType, Map<string, LineSummaryRow>>();
    const bLocByProcess = new Map<RepeatProcessType, Map<string, RepeatLocationRow>>();
    const allLineCodes = new Set<string>();

    PROCESS_TYPES.forEach((pt, i) => {
      const sMap = new Map<string, LineSummaryRow>();
      for (const row of summaries[i]) {
        sMap.set(row.LINE_CODE, row);
        allLineCodes.add(row.LINE_CODE);
      }
      summaryByProcess.set(pt, sMap);

      const bMap = new Map<string, RepeatLocationRow>();
      for (const row of bLocations[i]) {
        const existing = bMap.get(row.LINE_CODE);
        if (!existing || row.LOC_COUNT > existing.LOC_COUNT) {
          bMap.set(row.LINE_CODE, row);
        }
      }
      bLocByProcess.set(pt, bMap);
    });

    /* 3. 선택된 라인도 포함 (0건이어도 카드 표시) */
    for (const lc of lines) allLineCodes.add(lc);
    const sortedLineCodes = [...allLineCodes].sort();
    const lineNameMap = await getLineNames(sortedLineCodes);

    /* 4. 라인별 카드 데이터 생성 */
    const lineCards: RepeatLineCardData[] = [];

    for (const lineCode of sortedLineCodes) {
      const processes: RepeatProcessStatus[] = [];
      let overallGrade: RepeatGrade = "OK";

      for (const pt of PROCESS_TYPES) {
        const summary = summaryByProcess.get(pt)?.get(lineCode);
        const bLoc = bLocByProcess.get(pt)?.get(lineCode);
        const grade: RepeatGrade = bLoc ? "B" : "OK";

        processes.push({
          process: pt,
          processLabel: PROCESS_LABELS[pt],
          grade,
          ngCount: summary?.NG_COUNT ?? 0,
          locationCode: bLoc?.LOCATION_CODE ?? null,
          modelName: bLoc?.MODEL_NAME ?? null,
          detail: bLoc ? `sameLoc:${bLoc.LOC_COUNT}(${bLoc.LOCATION_CODE})` : null,
          lastInspectDate: summary?.LAST_INSPECT ?? null,
          pendingCount: 0,
        });

        if (grade === "B" && overallGrade === "OK") overallGrade = "B";
      }

      lineCards.push({
        lineCode,
        lineName: lineNameMap.get(lineCode) || lineCode,
        processes,
        overallGrade,
      });
    }

    /* B급 라인 상단 정렬 */
    lineCards.sort((a, b) => {
      const order: Record<RepeatGrade, number> = { A: 0, B: 1, OK: 2 };
      return order[a.overallGrade] - order[b.overallGrade];
    });

    return NextResponse.json({
      lines: lineCards,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Non-consecutive API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
