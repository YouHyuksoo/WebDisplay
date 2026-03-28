/**
 * @file src/app/api/ctq/fpy/route.ts
 * @description 직행율(First Pass Yield) API - 라인별 x 공정별 전일/당일 직행율 조회
 *
 * 초보자 가이드:
 * 1. 5개 RAW 테이블에서 제품(PID)별 최초 검사 결과만 추출
 * 2. 직행율 = 최초검사 PASS 제품수 / 고유 제품수 x 100
 * 3. 당일 기준 90% 미만이면 A급
 * 4. ROW_NUMBER()로 제품별 첫 번째 검사만 필터링 (재검사 제외)
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause } from "@/lib/ctq/line-filter";
import type {
  FpyProcessKey,
  FpyProcessData,
  FpyLineData,
} from "@/types/ctq/fpy";

export const dynamic = "force-dynamic";

interface ProcessConfig {
  table: string;
  dateCol: string;
  pidCol: string;
  resultCol: string;
  dateType: "varchar" | "date";
  passValues: string[];
  extraWhere?: string;
}

const PROCESS_CONFIG: Record<FpyProcessKey, ProcessConfig> = {
  ICT:    { table: "IQ_MACHINE_ICT_SERVER_DATA_RAW",    dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", dateType: "varchar", passValues: ["PASS", "GOOD", "OK", "Y"], extraWhere: "" },
  HIPOT:  { table: "IQ_MACHINE_HIPOT_POWER_DATA_RAW",   dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", dateType: "varchar", passValues: ["PASS", "GOOD", "OK", "Y"], extraWhere: "" },
  FT:     { table: "IQ_MACHINE_FT1_SMPS_DATA_RAW",      dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", dateType: "varchar", passValues: ["PASS", "GOOD", "OK", "Y"], extraWhere: "" },
  BURNIN: { table: "IQ_MACHINE_BURNIN_SMPS_DATA_RAW",   dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", dateType: "varchar", passValues: ["PASS", "GOOD", "OK", "Y"], extraWhere: "" },
  ATE:    { table: "IQ_MACHINE_ATE_SERVER_DATA_RAW",     dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", dateType: "varchar", passValues: ["PASS", "GOOD", "OK", "Y"], extraWhere: "" },
};

const PROCESS_KEYS: FpyProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

interface FpyRow {
  LINE_CODE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

/**
 * 2일치 날짜 범위 WHERE 절 (전일 10:00 ~ 당일+1 10:00)
 * 근무일 기준: TRUNC(SYSDATE-10/24) - 10시를 일 경계로 사용
 */
function buildDateRange2Days(col: string, dateType: "varchar" | "date"): string {
  if (dateType === "varchar") {
    return `${col} >= TO_CHAR(TRUNC(SYSDATE-10/24)-1, 'YYYY/MM/DD') || ' 10:00:00' AND ${col} < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'`;
  }
  return `${col} >= TRUNC(SYSDATE-10/24)-1 + 10/24 AND ${col} < TRUNC(SYSDATE-10/24)+1 + 10/24`;
}

/** DAY_TYPE 분류 CASE 절 (Y=전일, T=당일) */
function buildDayCase(col: string, dateType: "varchar" | "date"): string {
  if (dateType === "varchar") {
    return `CASE WHEN ${col} < TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00' THEN 'Y' ELSE 'T' END`;
  }
  return `CASE WHEN ${col} < TRUNC(SYSDATE-10/24) + 10/24 THEN 'Y' ELSE 'T' END`;
}

interface FpyRow2Days extends FpyRow {
  DAY_TYPE: string;
}

/**
 * 전일+당일 1쿼리로 공정별 직행율 조회
 *
 * 튜닝 포인트:
 * 1. 전일+당일 1쿼리 (14->7 DB 호출)
 * 2. JOIN -> EXISTS (존재 확인만 필요)
 * 3. MIN KEEP (DENSE_RANK FIRST) (Oracle 집계, 서브쿼리 1단계 제거)
 */
async function queryProcess2Days(
  key: FpyProcessKey,
  config: ProcessConfig,
  lineFilter: { clause: string; params: Record<string, string> },
): Promise<{ key: FpyProcessKey; rows: FpyRow2Days[] }> {
  const col = `t.${config.dateCol}`;
  const passIn = config.passValues.map(v => `'${v}'`).join(",");
  const dayCase = buildDayCase(col, config.dateType);

  const sql = `
    SELECT sub.LINE_CODE, sub.DAY_TYPE,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN sub.FIRST_RESULT IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM (
      SELECT t.LINE_CODE,
             ${dayCase} AS DAY_TYPE,
             MIN(t.${config.resultCol}) KEEP (DENSE_RANK FIRST ORDER BY t.${config.dateCol}) AS FIRST_RESULT
      FROM ${config.table} t
      WHERE ${buildDateRange2Days(col, config.dateType)}
        ${config.extraWhere ?? ""}
        AND t.LINE_CODE IS NOT NULL
        ${lineFilter.clause}
        AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
        AND EXISTS (
          SELECT 1 FROM IP_PRODUCT_2D_BARCODE b
          WHERE b.SERIAL_NO = t.${config.pidCol}
            AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
        )
      GROUP BY t.LINE_CODE, t.${config.pidCol}, ${dayCase}
    ) sub
    GROUP BY sub.LINE_CODE, sub.DAY_TYPE
  `;

  const rows = await executeQuery<FpyRow2Days>(sql, lineFilter.params);
  return { key, rows };
}

/** LINE_CODE -> LINE_NAME 매핑 조회 */
async function fetchLineNames(lineCodes: string[]): Promise<Map<string, string>> {
  if (lineCodes.length === 0) return new Map();
  const placeholders = lineCodes.map((_, i) => `:lc${i}`).join(",");
  const sql = `SELECT LINE_CODE, LINE_NAME FROM IP_PRODUCT_LINE WHERE LINE_CODE IN (${placeholders})`;
  const params: Record<string, string> = {};
  lineCodes.forEach((code, i) => { params[`lc${i}`] = code; });
  const rows = await executeQuery<LineNameRow>(sql, params);
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(r.LINE_CODE, r.LINE_NAME));
  return map;
}

function toProcessData(row: FpyRow): FpyProcessData {
  const yieldRate = row.TOTAL_CNT > 0 ? Math.round((row.PASS_CNT / row.TOTAL_CNT) * 10000) / 100 : 100;
  return { total: row.TOTAL_CNT, pass: row.PASS_CNT, ng: row.TOTAL_CNT - row.PASS_CNT, yield: yieldRate };
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");

    /* DB 기준 날짜 범위 조회 (베트남 SYSDATE 기준, 10시 근무일 경계) */
    const dateRangeRows = await executeQuery<{ YD_START: string; YD_END: string; TD_START: string; TD_END: string }>(
      `SELECT TO_CHAR(TRUNC(SYSDATE-10/24)-1, 'MM/DD') || ' 10:00' AS YD_START,
              TO_CHAR(TRUNC(SYSDATE-10/24),   'MM/DD') || ' 10:00' AS YD_END,
              TO_CHAR(TRUNC(SYSDATE-10/24),   'MM/DD') || ' 10:00' AS TD_START,
              TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'MM/DD') || ' 10:00' AS TD_END
       FROM DUAL`, {}
    );
    const dr = dateRangeRows[0];

    /* 5공정 x 2일치를 1쿼리씩 병렬 조회 */
    const allResults = await Promise.all(
      PROCESS_KEYS.map((key) => queryProcess2Days(key, PROCESS_CONFIG[key], lineFilter)),
    );

    /* 라인코드 수집 */
    const allLineCodes = new Set<string>();
    for (const { rows } of allResults) {
      for (const row of rows) {
        if (row.LINE_CODE) allLineCodes.add(row.LINE_CODE);
      }
    }
    for (const lc of lines) allLineCodes.add(lc);
    const lineNames = await fetchLineNames([...allLineCodes]);

    /* 라인별 merge */
    const lineMap = new Map<string, FpyLineData>();

    function ensureLine(code: string): FpyLineData {
      if (!lineMap.has(code)) {
        lineMap.set(code, {
          lineCode: code,
          lineName: lineNames.get(code) ?? code,
          overallGrade: "OK",
          processes: {},
        });
      }
      return lineMap.get(code)!;
    }

    /* 전일+당일 데이터 병합 (DAY_TYPE: Y=전일, T=당일) */
    for (const { key, rows } of allResults) {
      for (const row of rows) {
        if (!row.LINE_CODE) continue;
        const line = ensureLine(row.LINE_CODE);
        if (!line.processes[key]) line.processes[key] = {};
        const pd = toProcessData(row);
        if (row.DAY_TYPE === "Y") {
          line.processes[key]!.yesterday = pd;
        } else if (row.DAY_TYPE === "T") {
          line.processes[key]!.today = pd;
          if (pd.yield < 90) line.overallGrade = "A";
        }
      }
    }

    /* A급 우선, 그다음 라인명 정렬 */
    const sortedLines = [...lineMap.values()].sort((a, b) => {
      if (a.overallGrade !== b.overallGrade) return a.overallGrade === "A" ? -1 : 1;
      return a.lineName.localeCompare(b.lineName);
    });

    return NextResponse.json({
      lines: sortedLines,
      dateRange: {
        yesterday: `${dr.YD_START} ~ ${dr.YD_END}`,
        today: `${dr.TD_START} ~ ${dr.TD_END}`,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("FPY API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
