/**
 * @file src/app/api/ctq/equipment-weekly/route.ts
 * @description 설비 공정별 1주일 일별 정지시간 집계 API (차트용)
 *
 * 초보자 가이드:
 * 1. **테이블**: IP_LINE_DAILY_OPERATION_HIST
 * 2. **기간**: 최근 7일 (ACTUAL_DATE 기준)
 * 3. **집계**: 날짜 x 공정(LINE_STATUS_CODE) 별 정지시간(분) 합산
 * 4. 라인 필터 적용 가능
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause } from "@/lib/ctq/line-filter";
import type { EquipmentWeeklyPoint } from "@/types/ctq/equipment";

export const dynamic = "force-dynamic";

const PROCESS_KEYS = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"] as const;

interface WeeklyRow {
  ACTUAL_DATE: string;
  LINE_STATUS_CODE: string;
  STOP_MINUTES: number;
}

/** 7일 전 날짜 YYYY-MM-DD */
function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "B", "ln");

    const processPlaceholders = PROCESS_KEYS.map((_, i) => `:sc${i}`).join(",");
    const processParams: Record<string, string> = {};
    PROCESS_KEYS.forEach((code, i) => { processParams[`sc${i}`] = code; });

    const sql = `
      SELECT TO_CHAR(B.ACTUAL_DATE, 'MM/DD') AS ACTUAL_DATE,
             B.LINE_STATUS_CODE,
             ROUND(SUM((B.END_DATE - B.START_DATE) * 24 * 60)) AS STOP_MINUTES
      FROM IP_LINE_DAILY_OPERATION_HIST B
      WHERE B.ACTUAL_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')
        AND B.ACTUAL_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')
        AND B.LINE_STATUS_CODE IN (${processPlaceholders})
        ${lineFilter.clause}
      GROUP BY TO_CHAR(B.ACTUAL_DATE, 'MM/DD'), B.LINE_STATUS_CODE
      ORDER BY MIN(B.ACTUAL_DATE)
    `;

    const rows = await executeQuery<WeeklyRow>(sql, {
      fromDate: getDateNDaysAgo(6),
      toDate: getDateNDaysAgo(0),
      ...processParams,
      ...lineFilter.params,
    });

    /* 날짜별 그룹핑 */
    const dateMap = new Map<string, EquipmentWeeklyPoint>();
    for (const row of rows) {
      if (!dateMap.has(row.ACTUAL_DATE)) {
        dateMap.set(row.ACTUAL_DATE, {
          date: row.ACTUAL_DATE,
          ICT: 0, HIPOT: 0, FT: 0, BURNIN: 0, ATE: 0,
        });
      }
      const point = dateMap.get(row.ACTUAL_DATE)!;
      const key = row.LINE_STATUS_CODE as keyof Omit<EquipmentWeeklyPoint, "date">;
      if (key in point) {
        point[key] = row.STOP_MINUTES;
      }
    }

    const data = [...dateMap.values()];

    return NextResponse.json({
      data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Equipment Weekly API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
