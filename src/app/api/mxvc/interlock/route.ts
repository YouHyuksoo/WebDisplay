/**
 * @file src/app/api/mxvc/interlock/route.ts
 * @description 인터락호출이력 API — 공정별 카드형 조회
 * 초보자 가이드:
 * 1. 기본 호출: 공정별 요약 + 최근 10건 이력 → WorkstageCard[] 반환
 * 2. workstage 파라미터: 특정 공정 이력 페이징 조회
 * 3. ROW_NUMBER() PARTITION BY로 공정별 Top N 추출 (N+1 쿼리 방지)
 * 4. 최근 3일 기준: TRUNC(SYSDATE) - 2 ~ TRUNC(SYSDATE) + 1
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { InterlockLog, WorkstageCard } from "@/types/mxvc/interlock";

export const dynamic = "force-dynamic";

const DAY_FILTER = `CALL_DATE >= TRUNC(SYSDATE) - 2 AND CALL_DATE < TRUNC(SYSDATE) + 1`;

interface SummaryRow {
  WORKSTAGE_CODE: string;
  TOTAL: number;
  OK_CNT: number;
  NG_CNT: number;
}

interface LogRow {
  ADDR: string;
  REQ: string;
  CALL_DATE: string;
  LINE_CODE: string;
  WORKSTAGE_CODE: string;
  RESULT: string;
  RETURN_MSG: string;
  RN?: number;
}

interface TotalRow { CNT: number }

/** 공정별 요약 + 최근 10건 이력 */
async function getCards(logsPerCard: number): Promise<WorkstageCard[]> {
  const [summaryRows, logRows] = await Promise.all([
    executeQuery<SummaryRow>(
      `SELECT NVL(WORKSTAGE_CODE, '-') AS WORKSTAGE_CODE,
              COUNT(*) AS TOTAL,
              SUM(CASE WHEN "RETURN" LIKE 'OK%' THEN 1 ELSE 0 END) AS OK_CNT,
              SUM(CASE WHEN "RETURN" NOT LIKE 'OK%' THEN 1 ELSE 0 END) AS NG_CNT
       FROM ICOM_WEB_SERVICE_LOG
       WHERE ${DAY_FILTER}
       GROUP BY WORKSTAGE_CODE
       ORDER BY WORKSTAGE_CODE`,
    ),
    executeQuery<LogRow>(
      `SELECT ADDR, REQ, CALL_DATE, LINE_CODE, WORKSTAGE_CODE, RESULT, RETURN_MSG
       FROM (
         SELECT ADDR,
                SUBSTR(REQ, 1, 200) AS REQ,
                TO_CHAR(CALL_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CALL_DATE,
                NVL(LINE_CODE, '-') AS LINE_CODE,
                NVL(WORKSTAGE_CODE, '-') AS WORKSTAGE_CODE,
                CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END AS RESULT,
                SUBSTR("RETURN", 1, 200) AS RETURN_MSG,
                ROW_NUMBER() OVER (PARTITION BY NVL(WORKSTAGE_CODE, '-') ORDER BY CALL_DATE DESC) AS RN
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
       )
       WHERE RN <= :limit
       ORDER BY WORKSTAGE_CODE, RN`,
      { limit: logsPerCard },
    ),
  ]);

  const logMap = new Map<string, InterlockLog[]>();
  for (const r of logRows) {
    const key = r.WORKSTAGE_CODE ?? "-";
    if (!logMap.has(key)) logMap.set(key, []);
    logMap.get(key)!.push({
      addr: r.ADDR ?? "-",
      req: r.REQ ?? "-",
      callDate: r.CALL_DATE,
      lineCode: r.LINE_CODE,
      workstageCode: r.WORKSTAGE_CODE,
      result: r.RESULT as "OK" | "NG",
      returnMsg: r.RETURN_MSG ?? "-",
    });
  }

  return summaryRows.map((s) => ({
    workstageCode: s.WORKSTAGE_CODE ?? "-",
    totalCount: s.TOTAL,
    okCount: s.OK_CNT,
    ngCount: s.NG_CNT,
    logs: logMap.get(s.WORKSTAGE_CODE ?? "-") ?? [],
  }));
}

/** 특정 공정 이력 페이징 */
async function getDetail(workstage: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [logRows, totalRows] = await Promise.all([
    executeQuery<LogRow>(
      `SELECT ADDR,
              SUBSTR(REQ, 1, 200) AS REQ,
              TO_CHAR(CALL_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CALL_DATE,
              NVL(LINE_CODE, '-') AS LINE_CODE,
              NVL(WORKSTAGE_CODE, '-') AS WORKSTAGE_CODE,
              CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END AS RESULT,
              SUBSTR("RETURN", 1, 200) AS RETURN_MSG
       FROM ICOM_WEB_SERVICE_LOG
       WHERE ${DAY_FILTER}
         AND NVL(WORKSTAGE_CODE, '-') = :ws
       ORDER BY CALL_DATE DESC
       OFFSET :offs ROWS FETCH NEXT :ps ROWS ONLY`,
      { ws: workstage, offs: offset, ps: pageSize },
    ),
    executeQuery<TotalRow>(
      `SELECT COUNT(*) AS CNT
       FROM ICOM_WEB_SERVICE_LOG
       WHERE ${DAY_FILTER}
         AND NVL(WORKSTAGE_CODE, '-') = :ws`,
      { ws: workstage },
    ),
  ]);

  const logs: InterlockLog[] = logRows.map((r) => ({
    addr: r.ADDR ?? "-",
    req: r.REQ ?? "-",
    callDate: r.CALL_DATE,
    lineCode: r.LINE_CODE,
    workstageCode: r.WORKSTAGE_CODE,
    result: r.RESULT as "OK" | "NG",
    returnMsg: r.RETURN_MSG ?? "-",
  }));

  const totalCount = totalRows[0]?.CNT ?? 0;

  return {
    logs,
    pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const workstage = request.nextUrl.searchParams.get("workstage");

    if (workstage) {
      const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 10));
      return NextResponse.json(await getDetail(workstage, page, pageSize));
    }

    const logsPerCard = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("logsPerCard")) || 10));
    const cards = await getCards(logsPerCard);

    return NextResponse.json({
      cards,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Interlock API error:", error);
    return NextResponse.json(
      { error: "인터락 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
