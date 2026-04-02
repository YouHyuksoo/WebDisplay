/**
 * @file src/app/api/u1/ate-analysis/daily/route.ts
 * @description ATE 분석 일간 API — 당일/전일 라인별 합격률, 시간대별 추이, 기계별 NG 현황
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_ATE_U1_DATA_RAW 테이블에서 2일치 데이터를 조회
 * 2. 근무일 경계는 10:00 (TRUNC(SYSDATE-8/24))
 * 3. 4개 쿼리를 Promise.all로 병렬 실행하여 응답 속도 최적화
 * 4. 차트 #1(당일 합격률), #2(전일 비교), #3(시간대별 추이), #6(기계별 NG) 데이터 제공
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  AteLineStat,
  AteHourlyPoint,
  AteMachineNgItem,
  AteDailyResponse,
} from "@/types/u1/ate-analysis";

export const dynamic = "force-dynamic";

/** PASS로 인정되는 값 목록 */
const PASS_IN = `'PASS','GOOD','OK','Y'`;

/** 2일치 날짜 범위 WHERE 조건 (전일 08:00 ~ 당일+1 08:00) */
const DATE_RANGE_2DAYS = `INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-8/24)-1, 'YYYY/MM/DD') || ' 08:00:00'
   AND INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-8/24)+1, 'YYYY/MM/DD') || ' 08:00:00'`;

/** 당일 전용 날짜 범위 WHERE 조건 (당일 08:00 ~ 당일+1 08:00) */
const DATE_RANGE_TODAY = `INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-8/24), 'YYYY/MM/DD') || ' 08:00:00'
   AND INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-8/24)+1, 'YYYY/MM/DD') || ' 08:00:00'`;

/** DAY_TYPE 분류 CASE 절 (Y=전일, T=당일) */
const DAY_CASE = `CASE WHEN INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-8/24), 'YYYY/MM/DD') || ' 08:00:00' THEN 'Y' ELSE 'T' END`;

// ---------------------------------------------------------------------------
// DB row 인터페이스
// ---------------------------------------------------------------------------

interface LineStatRow {
  MACHINE_GROUP: string;
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

// ---------------------------------------------------------------------------
// SQL 쿼리 함수
// ---------------------------------------------------------------------------

/** 설비그룹별(ATE1,ATE2) 전일/당일 합격률 조회 */
async function queryLineStats(): Promise<LineStatRow[]> {
  const sql = `
    SELECT SUBSTR(MACHINE_CODE, 1, 4) AS MACHINE_GROUP,
           ${DAY_CASE} AS DAY_TYPE,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM IQ_MACHINE_ATE_U1_DATA_RAW
    WHERE ${DATE_RANGE_2DAYS}
      AND MACHINE_CODE IS NOT NULL
      AND PID IS NOT NULL
      AND LAST_YN = 'Y'
    GROUP BY SUBSTR(MACHINE_CODE, 1, 4), ${DAY_CASE}
    ORDER BY MACHINE_GROUP, DAY_TYPE
  `;
  return executeQuery<LineStatRow>(sql, {});
}

/** 시간대별 합격률 추이 조회 (당일 기준) */
async function queryHourly(): Promise<HourlyRow[]> {
  const sql = `
    SELECT SUBSTR(INSPECT_DATE, 12, 2) AS HOUR,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM IQ_MACHINE_ATE_U1_DATA_RAW
    WHERE ${DATE_RANGE_TODAY}
      AND PID IS NOT NULL
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
    FROM IQ_MACHINE_ATE_U1_DATA_RAW
    WHERE ${DATE_RANGE_TODAY}
      AND MACHINE_CODE IS NOT NULL
      AND PID IS NOT NULL
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
    SELECT TO_CHAR(TRUNC(SYSDATE-8/24)-1, 'YYYY-MM-DD') AS YESTERDAY,
           TO_CHAR(TRUNC(SYSDATE-8/24),   'YYYY-MM-DD') AS TODAY
    FROM DUAL
  `;
  return executeQuery<DateRangeRow>(sql, {});
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

    /* lineStats 조립 (MACHINE_GROUP = ATE1, ATE2 등) */
    const lineMap = new Map<string, AteLineStat>();

    function ensureLineStat(code: string): AteLineStat {
      if (!lineMap.has(code)) {
        const empty = { total: 0, pass: 0, ng: 0, rate: 100 };
        lineMap.set(code, {
          lineCode: code,
          lineName: code,
          today: { ...empty },
          yesterday: { ...empty },
        });
      }
      return lineMap.get(code)!;
    }

    for (const row of lineStatRows) {
      if (!row.MACHINE_GROUP) continue;
      const stat = ensureLineStat(row.MACHINE_GROUP);
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

    const lineStats: AteLineStat[] = [...lineMap.values()].sort((a, b) =>
      a.lineName.localeCompare(b.lineName),
    );

    /* hourlyTrend 조립 */
    const hourlyTrend: AteHourlyPoint[] = hourlyRows.map((row) => {
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
    const machineNg: AteMachineNgItem[] = machineNgRows.map((row) => ({
      machineCode: row.MACHINE_CODE,
      ngCount: Number(row.NG_CNT),
      total: Number(row.TOTAL_CNT),
    }));

    /* dateRange */
    const dr = dateRangeRows[0] ?? { YESTERDAY: "", TODAY: "" };

    const response: AteDailyResponse = {
      lineStats,
      hourlyTrend,
      machineNg,
      dateRange: { yesterday: dr.YESTERDAY, today: dr.TODAY },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("ATE daily API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
