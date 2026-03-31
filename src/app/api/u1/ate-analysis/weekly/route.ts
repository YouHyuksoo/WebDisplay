/**
 * @file src/app/api/u1/ate-analysis/weekly/route.ts
 * @description ATE 분석 주간 API — 최근 7일 라인별 일간 합격률 추이
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_ATE_U1_DATA_RAW 테이블에서 최근 7일 데이터를 조회
 * 2. 날짜(DATE) x 라인(LINE_CODE) 기준으로 그룹핑
 * 3. 차트 #4(주간 추이 라인 차트) 데이터 제공
 * 4. 근무일 경계는 10:00 (TRUNC(SYSDATE-8/24))
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { AteWeeklyPoint, AteWeeklyResponse } from "@/types/u1/ate-analysis";

export const dynamic = "force-dynamic";

/** PASS로 인정되는 값 목록 */
const PASS_IN = `'PASS','GOOD','OK','Y'`;

// ---------------------------------------------------------------------------
// DB row 인터페이스
// ---------------------------------------------------------------------------

interface WeeklyRow {
  WORK_DATE: string;
  LINE_CODE: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface DateRangeRow {
  FROM_DATE: string;
  TO_DATE: string;
}

// ---------------------------------------------------------------------------
// SQL 쿼리 함수
// ---------------------------------------------------------------------------

/** 최근 7일 라인별 일간 합격률 조회 */
async function queryWeekly(): Promise<WeeklyRow[]> {
  const sql = `
    SELECT TO_DATE(SUBSTR(INSPECT_DATE, 1, 10), 'YYYY/MM/DD') AS WORK_DATE_RAW,
           TO_CHAR(TO_DATE(SUBSTR(INSPECT_DATE, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD') AS WORK_DATE,
           LINE_CODE,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM IQ_MACHINE_ATE_U1_DATA_RAW
    WHERE INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-8/24)-7, 'YYYY/MM/DD') || ' 08:00:00'
      AND INSPECT_DATE <  TO_CHAR(TRUNC(SYSDATE-8/24)+1, 'YYYY/MM/DD') || ' 08:00:00'
      AND LINE_CODE IS NOT NULL
    GROUP BY TO_DATE(SUBSTR(INSPECT_DATE, 1, 10), 'YYYY/MM/DD'),
             TO_CHAR(TO_DATE(SUBSTR(INSPECT_DATE, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD'),
             LINE_CODE
    ORDER BY WORK_DATE, LINE_CODE
  `;
  return executeQuery<WeeklyRow>(sql, {});
}

/** DB 기준 날짜 범위 라벨 조회 */
async function queryDateRange(): Promise<DateRangeRow[]> {
  const sql = `
    SELECT TO_CHAR(TRUNC(SYSDATE-8/24)-7, 'YYYY-MM-DD') AS FROM_DATE,
           TO_CHAR(TRUNC(SYSDATE-8/24),   'YYYY-MM-DD') AS TO_DATE
    FROM DUAL
  `;
  return executeQuery<DateRangeRow>(sql, {});
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    /* 2개 쿼리 병렬 실행 */
    const [weeklyRows, dateRangeRows] = await Promise.all([
      queryWeekly(),
      queryDateRange(),
    ]);

    /** 합격률 계산 (소수점 2자리, 0건이면 100%) */
    const calcRate = (pass: number, total: number): number => {
      if (total === 0) return 100;
      return Math.round((pass / total) * 10000) / 100;
    };

    /* dailyTrend 조립 */
    const dailyTrend: AteWeeklyPoint[] = weeklyRows.map((row) => {
      const total = Number(row.TOTAL_CNT);
      const pass = Number(row.PASS_CNT);
      return {
        date: row.WORK_DATE,
        lineCode: row.LINE_CODE,
        total,
        pass,
        rate: calcRate(pass, total),
      };
    });

    /* dateRange */
    const dr = dateRangeRows[0] ?? { FROM_DATE: "", TO_DATE: "" };

    const response: AteWeeklyResponse = {
      dailyTrend,
      dateRange: { from: dr.FROM_DATE, to: dr.TO_DATE },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("ATE weekly API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
