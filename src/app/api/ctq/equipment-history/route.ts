/**
 * @file src/app/api/ctq/equipment-history/route.ts
 * @description 설비점검이력 API — IP_LINE_DAILY_OPERATION_HIST 개별 이력 조회
 *
 * 초보자 가이드:
 * 1. **테이블**: IP_LINE_DAILY_OPERATION_HIST
 * 2. **기간**: F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A') 당일 기준
 * 3. **내용**: 라인별 설비 가동/정지 이력 전체 (개별 레코드)
 * 4. **정렬**: 시작시간 내림차순
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause } from "@/lib/ctq/line-filter";

export const dynamic = "force-dynamic";

interface HistRow {
  LINE_CODE: string;
  LINE_NAME: string;
  LINE_STATUS_CODE: string;
  ACTUAL_DATE: string;
  START_DATE: string;
  END_DATE: string;
  STOP_MINUTES: number;
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "B", "ln");
    const fromDate = request.nextUrl.searchParams.get("from");
    const toDate = request.nextUrl.searchParams.get("to");

    /* from/to 없으면 당일, 있으면 구간 조회 */
    let dateCondition: string;
    const dateParams: Record<string, string> = {};
    if (fromDate && toDate) {
      dateCondition = `B.ACTUAL_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD') AND B.ACTUAL_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')`;
      dateParams.fromDate = fromDate;
      dateParams.toDate = toDate;
    } else {
      dateCondition = `B.ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')`;
    }

    const sql = `
      SELECT B.LINE_CODE,
             F_GET_LINE_NAME(B.LINE_CODE, 1) AS LINE_NAME,
             B.LINE_STATUS_CODE,
             TO_CHAR(B.ACTUAL_DATE, 'YYYY-MM-DD') AS ACTUAL_DATE,
             TO_CHAR(B.START_DATE, 'YYYY-MM-DD HH24:MI:SS') AS START_DATE,
             TO_CHAR(B.END_DATE, 'YYYY-MM-DD HH24:MI:SS') AS END_DATE,
             ROUND((B.END_DATE - B.START_DATE) * 24 * 60, 1) AS STOP_MINUTES
      FROM IP_LINE_DAILY_OPERATION_HIST B
      WHERE ${dateCondition}
        ${lineFilter.clause}
      ORDER BY B.START_DATE DESC
    `;

    const rows = await executeQuery<HistRow>(sql, {
      ...dateParams,
      ...lineFilter.params,
    });

    const mapped = rows.map((r) => ({
      lineCode: r.LINE_CODE,
      lineName: r.LINE_NAME || r.LINE_CODE,
      lineStatusCode: r.LINE_STATUS_CODE,
      actualDate: r.ACTUAL_DATE,
      startDate: r.START_DATE,
      endDate: r.END_DATE,
      stopMinutes: r.STOP_MINUTES ?? 0,
    }));

    return NextResponse.json({
      rows: mapped,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Equipment History API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
