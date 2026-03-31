/**
 * @file src/app/api/u1/hipot-analysis/monthly/route.ts
 * @description HIPOT 분석 월간 API — 최근 30일 구역(ZONE) x 날짜 히트맵 데이터
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_HIPOT_U1_DATA_RAW 테이블에서 최근 30일 데이터를 조회
 * 2. ZONE_CODE x 날짜 기준으로 그룹핑 (ZONE_CODE가 없으면 'UNKNOWN')
 * 3. 차트 #5(월간 히트맵) 데이터 제공
 * 4. LAST_YN = 'Y' 조건 필수 (중복 검사 중 최종 결과만 사용)
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { HipotHeatmapCell, HipotMonthlyResponse } from "@/types/u1/hipot-analysis";

export const dynamic = "force-dynamic";

/** PASS로 인정되는 값 목록 */
const PASS_IN = `'PASS','GOOD','OK','Y'`;

// ---------------------------------------------------------------------------
// DB row 인터페이스
// ---------------------------------------------------------------------------

interface HeatmapRow {
  WORK_DATE: string;
  ZONE_CODE: string;
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

/** 최근 30일 ZONE x 날짜 합격률 조회 */
async function queryMonthly(): Promise<HeatmapRow[]> {
  const sql = `
    SELECT TO_CHAR(TO_DATE(SUBSTR(INSPECT_DATE, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD') AS WORK_DATE,
           NVL(ZONE_CODE, 'UNKNOWN') AS ZONE_CODE,
           COUNT(*) AS TOTAL_CNT,
           SUM(CASE WHEN INSPECT_RESULT IN (${PASS_IN}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM IQ_MACHINE_HIPOT_U1_DATA_RAW
    WHERE INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-8/24)-30, 'YYYY/MM/DD') || ' 08:00:00'
      AND INSPECT_DATE <  TO_CHAR(TRUNC(SYSDATE-8/24)+1,  'YYYY/MM/DD') || ' 08:00:00'
      AND LAST_YN = 'Y'
    GROUP BY TO_CHAR(TO_DATE(SUBSTR(INSPECT_DATE, 1, 10), 'YYYY/MM/DD'), 'YYYY-MM-DD'),
             NVL(ZONE_CODE, 'UNKNOWN')
    ORDER BY WORK_DATE, ZONE_CODE
  `;
  return executeQuery<HeatmapRow>(sql, {});
}

/** DB 기준 날짜 범위 라벨 조회 */
async function queryDateRange(): Promise<DateRangeRow[]> {
  const sql = `
    SELECT TO_CHAR(TRUNC(SYSDATE-8/24)-30, 'YYYY-MM-DD') AS FROM_DATE,
           TO_CHAR(TRUNC(SYSDATE-8/24),    'YYYY-MM-DD') AS TO_DATE
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
    const [monthlyRows, dateRangeRows] = await Promise.all([
      queryMonthly(),
      queryDateRange(),
    ]);

    /** 합격률 계산 (소수점 2자리, 0건이면 100%) */
    const calcRate = (pass: number, total: number): number => {
      if (total === 0) return 100;
      return Math.round((pass / total) * 10000) / 100;
    };

    /* heatmapData 조립 */
    const heatmapData: HipotHeatmapCell[] = monthlyRows.map((row) => {
      const total = Number(row.TOTAL_CNT);
      const pass = Number(row.PASS_CNT);
      return {
        date: row.WORK_DATE,
        zoneCode: row.ZONE_CODE,
        total,
        pass,
        rate: calcRate(pass, total),
      };
    });

    /* zones: 중복 제거 후 정렬 */
    const zones = [...new Set(monthlyRows.map((r) => r.ZONE_CODE))].sort();

    /* dateRange */
    const dr = dateRangeRows[0] ?? { FROM_DATE: "", TO_DATE: "" };

    const response: HipotMonthlyResponse = {
      heatmapData,
      zones,
      dateRange: { from: dr.FROM_DATE, to: dr.TO_DATE },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("HIPOT monthly API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
