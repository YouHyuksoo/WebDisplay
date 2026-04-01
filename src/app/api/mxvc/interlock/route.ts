/**
 * @file src/app/api/mxvc/interlock/route.ts
 * @description 인터락호출이력 API — ICOM_WEB_SERVICE_LOG 당일 조회
 * 초보자 가이드:
 * 1. 로그 조회 + 차트 집계 3개를 Promise.all로 병렬 실행
 * 2. 당일 기준: TRUNC(SYSDATE) ~ TRUNC(SYSDATE) + 1 (멕시코 서버 시간)
 * 3. RETURN 컬럼 파싱: 'OK'로 시작 → OK, 그 외 → NG
 * 4. 개별 쿼리 실패 시 빈 데이터로 대체 (safeQuery 패턴)
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  InterlockLog,
  HourlyCount,
  WorkstageNg,
  AddrCount,
  InterlockChartData,
} from "@/types/mxvc/interlock";

export const dynamic = "force-dynamic";

const DAY_FILTER = `CALL_DATE >= TRUNC(SYSDATE) AND CALL_DATE < TRUNC(SYSDATE) + 1`;

interface LogRow {
  ADDR: string;
  REQ: string;
  CALL_DATE: string;
  LINE_CODE: string;
  WORKSTAGE_CODE: string;
  RESULT: string;
  RETURN_MSG: string;
}

interface HourlyRow {
  HOUR: string;
  CNT: number;
}

interface OkNgRow {
  RESULT_TYPE: string;
  CNT: number;
}

interface WsRow {
  WORKSTAGE_CODE: string;
  TOTAL: number;
  NG: number;
}

interface AddrRow {
  ADDR: string;
  TOTAL: number;
  OK: number;
  NG: number;
}

/** 개별 쿼리 실패 시 빈 배열 반환 */
async function safeQuery<T>(sql: string, binds = {}): Promise<T[]> {
  try {
    return await executeQuery<T>(sql, binds);
  } catch (e) {
    console.error("Interlock query error:", e);
    return [];
  }
}

interface TotalRow { CNT: number }

export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 30));
    const offset = (page - 1) * pageSize;

    const [logRows, totalRows, hourlyRows, okNgRows, wsRows, addrRows] = await Promise.all([
      safeQuery<LogRow>(
        `SELECT ADDR,
                SUBSTR(REQ, 1, 200) AS REQ,
                TO_CHAR(CALL_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CALL_DATE,
                NVL(LINE_CODE, '-') AS LINE_CODE,
                NVL(WORKSTAGE_CODE, '-') AS WORKSTAGE_CODE,
                CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END AS RESULT,
                SUBSTR("RETURN", 1, 200) AS RETURN_MSG
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         ORDER BY CALL_DATE DESC
         OFFSET :offs ROWS FETCH NEXT :ps ROWS ONLY`,
        { offs: offset, ps: pageSize },
      ),
      safeQuery<TotalRow>(
        `SELECT COUNT(*) AS CNT FROM ICOM_WEB_SERVICE_LOG WHERE ${DAY_FILTER}`,
      ),
      safeQuery<HourlyRow>(
        `SELECT TO_CHAR(CALL_DATE, 'HH24') AS HOUR, COUNT(*) AS CNT
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         GROUP BY TO_CHAR(CALL_DATE, 'HH24')
         ORDER BY HOUR`,
      ),
      safeQuery<OkNgRow>(
        `SELECT CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END AS RESULT_TYPE,
                COUNT(*) AS CNT
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         GROUP BY CASE WHEN "RETURN" LIKE 'OK%' THEN 'OK' ELSE 'NG' END`,
      ),
      safeQuery<WsRow>(
        `SELECT WORKSTAGE_CODE,
                COUNT(*) AS TOTAL,
                SUM(CASE WHEN "RETURN" NOT LIKE 'OK%' THEN 1 ELSE 0 END) AS NG
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER} AND WORKSTAGE_CODE IS NOT NULL
         GROUP BY WORKSTAGE_CODE
         ORDER BY NG DESC
         FETCH FIRST 10 ROWS ONLY`,
      ),
      safeQuery<AddrRow>(
        `SELECT ADDR,
                COUNT(*) AS TOTAL,
                SUM(CASE WHEN "RETURN" LIKE 'OK%' THEN 1 ELSE 0 END) AS OK,
                SUM(CASE WHEN "RETURN" NOT LIKE 'OK%' THEN 1 ELSE 0 END) AS NG
         FROM ICOM_WEB_SERVICE_LOG
         WHERE ${DAY_FILTER}
         GROUP BY ADDR
         ORDER BY TOTAL DESC`,
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

    const okRow = okNgRows.find((r) => r.RESULT_TYPE === "OK");
    const ngRow = okNgRows.find((r) => r.RESULT_TYPE === "NG");

    const charts: InterlockChartData = {
      hourly: hourlyRows.map((r) => ({ hour: r.HOUR, count: r.CNT })),
      okNgRatio: { ok: okRow?.CNT ?? 0, ng: ngRow?.CNT ?? 0 },
      byWorkstage: wsRows.map((r) => ({
        workstageCode: r.WORKSTAGE_CODE,
        total: r.TOTAL,
        ng: r.NG,
      })),
      byAddr: addrRows.map((r) => ({
        addr: r.ADDR,
        total: r.TOTAL,
        ok: r.OK,
        ng: r.NG,
      })),
    };

    const totalCount = totalRows[0]?.CNT ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      logs,
      charts,
      pagination: { page, pageSize, totalCount, totalPages },
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
