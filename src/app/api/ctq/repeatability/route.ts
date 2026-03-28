/**
 * @file src/app/api/ctq/repeatability/route.ts
 * @description 반복성 모니터링 API - 동일불량 연속발생 동일 Location
 *
 * 초보자 가이드:
 * 1. **대상 공정**: FT, ATE
 * 2. **판정 기준**: 수리등록된 NG 중 시간순 연속 2건이 동일 Location → A급, 아니면 OK
 * 3. **테이블/컬럼**: FT/ATE: PID + INSPECT_DATE(VARCHAR, 시간포함)
 * 4. **매일 08:00 ~ 다음날 08:00** 하루치만 대상, QC_CONFIRM_YN='Y' 제외
 *
 * 성능 최적화:
 * - Connection Pool 사용 (oracle.ts)
 * - SQL 집계로 요약 데이터만 전송 (수만건 → 수십건)
 * - 반복 Location 감지도 SQL에서 처리
 * - 날짜 상하한 조건으로 인덱스 레인지 스캔 최적화
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause, getVietnamTimeRange } from "@/lib/ctq/line-filter";
import type {
  RepeatProcessType,
  RepeatProcessStatus,
  RepeatLineCardData,
  RepeatGrade,
} from "@/types/ctq/repeatability";

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

/** LINE별 검사 요약 (SQL 집계) */
interface LineSummaryRow {
  LINE_CODE: string;
  TOTAL_COUNT: number;
  NG_COUNT: number;
  PENDING_COUNT: number;
  LAST_INSPECT: string;
}

/** 반복 Location 감지 결과 (SQL 집계) */
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

/** 날짜 조건 생성 (VARCHAR/DATE 대응, 상하한 포함) */
function buildDateCondition(config: ProcessConfig, alias: string): {
  condition: string;
  params: Record<string, string>;
} {
  const col = `${alias}.${config.dateCol}`;
  if (config.dateType === "varchar") {
    return {
      condition: `${col} >= :tsStart AND ${col} < :tsEnd`,
      params: {},
    };
  }
  return {
    condition: `${col} >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS') AND ${col} < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')`,
    params: {},
  };
}

/** 공정별 LINE 요약 집계 (JOIN 없이 단순 GROUP BY → 고속) */
async function getLineSummary(
  config: ProcessConfig,
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<LineSummaryRow[]> {
  const { condition } = buildDateCondition(config, "t");
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
 * 공정별 동일 Location 연속불량 감지 (LAG 윈도우 함수)
 *
 * 시간순으로 정렬된 NG 레코드에서 연속 2건이 동일 Location이면 A급.
 * LOC_COUNT: 해당 라인에서 연속 동일위치 발생 횟수.
 */
async function getRepeatLocations(
  config: ProcessConfig,
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<RepeatLocationRow[]> {
  const { condition } = buildDateCondition(config, "t");

  const sql = `
    SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE, COUNT(*) AS LOC_COUNT
    FROM (
      SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE
      FROM (
        SELECT base.LINE_CODE,
               base.MODEL_NAME,
               r.LOCATION_CODE,
               base.SORT_DATE,
               LAG(r.LOCATION_CODE) OVER (
                 PARTITION BY base.LINE_CODE, base.MODEL_NAME ORDER BY base.SORT_DATE
               ) AS PREV_LOC,
               LAG(base.SORT_DATE) OVER (
                 PARTITION BY base.LINE_CODE, base.MODEL_NAME ORDER BY base.SORT_DATE
               ) AS PREV_SORT_DATE
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
      ) sub
      WHERE sub.LOCATION_CODE = sub.PREV_LOC
        AND NOT EXISTS (
          SELECT 1 FROM ${config.table} t_chk
          WHERE t_chk.LINE_CODE = sub.LINE_CODE
            AND t_chk.${config.dateCol} > sub.PREV_SORT_DATE
            AND t_chk.${config.dateCol} < sub.SORT_DATE
            AND t_chk.${config.resultCol} IN ('PASS', 'GOOD', 'OK', 'Y')
            ${(config.extraWhere ?? "").replace(/t\./g, "t_chk.")}
        )
    )
    GROUP BY LINE_CODE, MODEL_NAME, LOCATION_CODE
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

    /* 1. 2공정 × 2쿼리 = 4개 쿼리 병렬 실행 (요약 + 반복Location) */
    const [summaries, repeatLocs] = await Promise.all([
      Promise.all(PROCESS_TYPES.map((pt) => getLineSummary(PROCESS_CONFIG[pt], timeRange, lineFilter))),
      Promise.all(PROCESS_TYPES.map((pt) => getRepeatLocations(PROCESS_CONFIG[pt], timeRange, lineFilter))),
    ]);

    /* 2. 공정별 요약 및 반복Location → Map 변환 */
    const summaryByProcess = new Map<RepeatProcessType, Map<string, LineSummaryRow>>();
    const repeatByProcess = new Map<RepeatProcessType, Map<string, RepeatLocationRow>>();
    const allLineCodes = new Set<string>();

    PROCESS_TYPES.forEach((pt, i) => {
      const sMap = new Map<string, LineSummaryRow>();
      for (const row of summaries[i]) {
        sMap.set(row.LINE_CODE, row);
        allLineCodes.add(row.LINE_CODE);
      }
      summaryByProcess.set(pt, sMap);

      const rMap = new Map<string, RepeatLocationRow>();
      for (const row of repeatLocs[i]) {
        allLineCodes.add(row.LINE_CODE);
        const existing = rMap.get(row.LINE_CODE);
        if (!existing || row.LOC_COUNT > existing.LOC_COUNT) {
          rMap.set(row.LINE_CODE, row);
        }
      }
      repeatByProcess.set(pt, rMap);
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
        const repeat = repeatByProcess.get(pt)?.get(lineCode);
        const grade: RepeatGrade = repeat ? "A" : "OK";

        processes.push({
          process: pt,
          processLabel: PROCESS_LABELS[pt],
          grade,
          ngCount: summary?.NG_COUNT ?? 0,
          locationCode: repeat?.LOCATION_CODE ?? null,
          modelName: repeat?.MODEL_NAME ?? null,
          detail: repeat ? `consecutive:${repeat.LOC_COUNT}(${repeat.LOCATION_CODE})` : null,
          lastInspectDate: summary?.LAST_INSPECT ?? null,
          pendingCount: summary?.PENDING_COUNT ?? 0,
        });

        if (grade === "A") overallGrade = "A";
      }

      lineCards.push({
        lineCode,
        lineName: lineNameMap.get(lineCode) || lineCode,
        processes,
        overallGrade,
      });
    }

    /* NG 라인 상단 정렬 */
    lineCards.sort((a, b) => {
      const order: Record<RepeatGrade, number> = { A: 0, B: 1, OK: 2 };
      return order[a.overallGrade] - order[b.overallGrade];
    });

    return NextResponse.json({
      lines: lineCards,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Repeatability API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
