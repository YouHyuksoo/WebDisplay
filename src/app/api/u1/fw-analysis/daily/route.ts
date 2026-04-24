/**
 * @file src/app/api/u1/fw-analysis/daily/route.ts
 * @description FW 분석 일간 API — 당일/전일 라인별 합격률, 시간대별 추이, 기계별 NG 현황
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_FW_U1_DATA_RAW 테이블에서 2일치 데이터를 조회
 * 2. 근무일 경계는 08:00 (TRUNC(SYSDATE))
 * 3. 4개 쿼리를 Promise.all로 병렬 실행하여 응답 속도 최적화
 * 4. LAST_YN = 'Y' 조건 필수 (최신 검사결과만 포함)
 * 5. 차트 #1(당일 합격률), #2(전일 비교), #3(시간대별 추이), #6(기계별 NG) 데이터 제공
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  FwLineStat,
  FwHourlyPoint,
  FwMachineNgItem,
  FwDailyResponse,
} from "@/types/u1/fw-analysis";

export const dynamic = "force-dynamic";

/** PASS로 인정되는 값 목록 */
const PASS_IN = `'PASS','GOOD','OK','Y'`;

/** 현재 날짜 — ACTUAL_DATE 비교용 (근무일 경계는 저장 시점에 반영됨) */
const WORKDAY = `TRUNC(SYSDATE)`;

/** 2일치 날짜 범위 WHERE 조건 (전일 + 당일, ACTUAL_DATE 사용) */
const DATE_RANGE_2DAYS = `ACTUAL_DATE IN (${WORKDAY} - 1, ${WORKDAY})`;

/** 당일 전용 날짜 범위 WHERE 조건 */
const DATE_RANGE_TODAY = `ACTUAL_DATE = ${WORKDAY}`;

/** DAY_TYPE 분류 CASE 절 (Y=전일, T=당일) */
const DAY_CASE = `CASE WHEN ACTUAL_DATE = ${WORKDAY} THEN 'T' ELSE 'Y' END`;

// ---------------------------------------------------------------------------
// DB row 인터페이스
// ---------------------------------------------------------------------------

interface LineStatRow {
  LINE_CODE: string;
  DAY_TYPE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface HourlyRow {
  HOUR: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface MachineNgRow {
  MACHINE_CODE: string;
  TOTAL_CNT: number;
  NG_CNT: number;
}

interface DateRangeRow {
  YESTERDAY: string;
  TODAY: string;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

// ---------------------------------------------------------------------------
// SQL 쿼리 함수
// ---------------------------------------------------------------------------

/** 라인별 전일/당일 합격률 조회 */
async function queryLineStats(): Promise<LineStatRow[]> {
  const sql = `
    SELECT LINE_CODE,
           ${DAY_CASE} AS DAY_TYPE,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM IQ_MACHINE_FW_U1_DATA_RAW
    WHERE ${DATE_RANGE_2DAYS}
      AND LINE_CODE IS NOT NULL
      AND PID IS NOT NULL
      AND NVL(SAMPLE_YN, 'N') <> 'Y'
      AND LENGTH(PID) >= 10
      AND LAST_YN = 'Y'
    GROUP BY LINE_CODE, ${DAY_CASE}
    ORDER BY LINE_CODE, DAY_TYPE
  `;
  return executeQuery<LineStatRow>(sql, {});
}

/** 시간대별 합격률 추이 조회 (당일 기준) */
async function queryHourly(): Promise<HourlyRow[]> {
  const sql = `
    SELECT SUBSTR(INSPECT_DATE, 12, 2) AS HOUR,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM IQ_MACHINE_FW_U1_DATA_RAW
    WHERE ${DATE_RANGE_TODAY}
      AND PID IS NOT NULL
      AND NVL(SAMPLE_YN, 'N') <> 'Y'
      AND LENGTH(PID) >= 10
      AND LAST_YN = 'Y'
    GROUP BY SUBSTR(INSPECT_DATE, 12, 2)
    ORDER BY HOUR
  `;
  return executeQuery<HourlyRow>(sql, {});
}

/** 기계별 NG 상위 10개 조회 */
async function queryMachineNg(): Promise<MachineNgRow[]> {
  const sql = `
    SELECT MACHINE_CODE,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT NOT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS NG_CNT
    FROM IQ_MACHINE_FW_U1_DATA_RAW
    WHERE ${DATE_RANGE_TODAY}
      AND MACHINE_CODE IS NOT NULL
      AND PID IS NOT NULL
      AND NVL(SAMPLE_YN, 'N') <> 'Y'
      AND LENGTH(PID) >= 10
      AND LAST_YN = 'Y'
    GROUP BY MACHINE_CODE
    HAVING SUM(CASE WHEN INSPECT_RESULT NOT IN (${PASS_IN}) THEN 1 ELSE 0 END) > 0
    ORDER BY NG_CNT DESC
    FETCH FIRST 10 ROWS ONLY
  `;
  return executeQuery<MachineNgRow>(sql, {});
}

/** DB 기준 날짜 범위 라벨 조회 */
async function queryDateRange(): Promise<DateRangeRow[]> {
  const sql = `
    SELECT TO_CHAR(TRUNC(SYSDATE)-1, 'YYYY-MM-DD') AS YESTERDAY,
           TO_CHAR(TRUNC(SYSDATE),   'YYYY-MM-DD') AS TODAY
    FROM DUAL
  `;
  return executeQuery<DateRangeRow>(sql, {});
}

/** LINE_CODE 목록으로 LINE_NAME 조회 */
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

// ---------------------------------------------------------------------------
// 데이터 변환 헬퍼
// ---------------------------------------------------------------------------

/** 합격률 계산 (소수점 2자리, 0건이면 100%) */
function calcRate(pass: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 시간(HH)과 근무일 경계(08:00)를 기준으로 교대 구분
 * - 08~19시: 주간 D, 20~07시: 야간 N
 */
function toShift(hour: string): "D" | "N" {
  const h = parseInt(hour, 10);
  return h >= 8 && h < 20 ? "D" : "N";
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    /* 4개 쿼리 병렬 실행 */
    const [lineStatRows, hourlyRows, machineNgRows, dateRangeRows] = await Promise.all([
      queryLineStats(),
      queryHourly(),
      queryMachineNg(),
      queryDateRange(),
    ]);

    /* 라인명 조회 */
    const allLineCodes = [...new Set(lineStatRows.map((r) => r.LINE_CODE).filter(Boolean))];
    const lineNames = await fetchLineNames(allLineCodes);

    /* lineStats 조립 */
    const lineMap = new Map<string, FwLineStat>();

    function ensureLineStat(code: string): FwLineStat {
      if (!lineMap.has(code)) {
        const empty = { total: 0, pass: 0, ng: 0, rate: 100 };
        lineMap.set(code, {
          lineCode: code,
          lineName: lineNames.get(code) ?? code,
          today: { ...empty },
          yesterday: { ...empty },
        });
      }
      return lineMap.get(code)!;
    }

    for (const row of lineStatRows) {
      if (!row.LINE_CODE) continue;
      const stat = ensureLineStat(row.LINE_CODE);
      const total = Number(row.TOTAL_CNT);
      const pass = Number(row.PASS_CNT);
      const ng = total - pass;
      const rate = calcRate(pass, total);
      if (row.DAY_TYPE === "T") {
        stat.today = { total, pass, ng, rate };
      } else {
        stat.yesterday = { total, pass, ng, rate };
      }
    }

    const lineStats: FwLineStat[] = [...lineMap.values()].sort((a, b) =>
      a.lineName.localeCompare(b.lineName),
    );

    /* hourlyTrend 조립 */
    const hourlyTrend: FwHourlyPoint[] = hourlyRows.map((row) => {
      const total = Number(row.TOTAL_CNT);
      const pass = Number(row.PASS_CNT);
      return {
        hour: row.HOUR,
        total,
        pass,
        rate: calcRate(pass, total),
        shift: toShift(row.HOUR),
      };
    });

    /* machineNg 조립 */
    const machineNg: FwMachineNgItem[] = machineNgRows.map((row) => ({
      machineCode: row.MACHINE_CODE,
      ngCount: Number(row.NG_CNT),
      total: Number(row.TOTAL_CNT),
    }));

    /* dateRange */
    const dr = dateRangeRows[0] ?? { YESTERDAY: "", TODAY: "" };

    const response: FwDailyResponse = {
      lineStats,
      hourlyTrend,
      machineNg,
      dateRange: { yesterday: dr.YESTERDAY, today: dr.TODAY },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("FW daily API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
