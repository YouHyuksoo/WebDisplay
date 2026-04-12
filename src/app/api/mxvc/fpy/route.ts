/**
 * @file src/app/api/mxvc/fpy/route.ts
 * @description 멕시코전장 직행율(FPY) API — 13개 LOG 테이블 병렬 조회
 *
 * 초보자 가이드:
 * 1. 활성 DB 프로필의 executeQuery로 접속 (기존 mxvc API와 동일)
 * 2. 13개 테이블을 Promise.all로 병렬 쿼리
 * 3. 작업일 기준: 08:00 시작 (현재 < 08시이면 전일 08:00~현재)
 * 4. 직행율 = PASS 건수 / 전체 건수 x 100
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import {
  TABLE_CONFIG, TABLE_KEYS,
  type MxvcFpyTableKey, type HourlyFpy, type TableFpyData,
} from "@/types/mxvc/fpy";

export const dynamic = "force-dynamic";

const PASS_VALUES = ["OK", "PASS", "GOOD", "Good", "Y", "SKIP", "OverKill"];

interface FpyRow {
  HOUR: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}


/**
 * 작업일 경계 SQL (08:00 기준)
 * dateFrom/dateTo가 없으면 오늘 작업일 기준
 */
function workDayStartSql(): string {
  return `
    CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
      THEN TRUNC(SYSDATE) + 8/24
      ELSE TRUNC(SYSDATE) - 1 + 8/24
    END`;
}

/** 단일 테이블 시간대별 직행율 조회 */
async function queryTableFpy(
  tableKey: MxvcFpyTableKey,
  dateFrom: string,
  dateTo: string,
): Promise<{ key: MxvcFpyTableKey; data: TableFpyData }> {
  const cfg = TABLE_CONFIG[tableKey];
  const passIn = PASS_VALUES.map((v) => `'${v}'`).join(",");

  const binds: Record<string, string> = {};
  let whereTime: string;

  if (dateFrom && dateTo) {
    binds.fromDate = dateFrom.replace('T', ' ');
    binds.toDate = dateTo.replace('T', ' ');
    whereTime = `LOG_TIMESTAMP >= TO_TIMESTAMP(:fromDate || ':00', 'YYYY-MM-DD HH24:MI:SS')
      AND LOG_TIMESTAMP <= TO_TIMESTAMP(:toDate || ':59', 'YYYY-MM-DD HH24:MI:SS')`;
  } else {
    whereTime = `LOG_TIMESTAMP >= (${workDayStartSql()}) AND LOG_TIMESTAMP <= SYSDATE`;
  }

  /**
   * 쿼리 분기:
   * 1) groupedFpy=true (EOL/ICT/FCT) → BARCODE+FILE_NAME 그룹핑하여 1건 카운트
   *                                   판정은 그룹의 resultCol(최종 판정) 대표값 사용
   * 2) 일반 (그 외)                  → 단순 row 단위 PASS/FAIL 카운트
   */
  const sql = cfg.groupedFpy
    ? `
      SELECT
        TO_CHAR(MIN_TS, 'HH24') AS HOUR,
        COUNT(*) AS TOTAL_CNT,
        SUM(CASE WHEN FINAL_RESULT IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
      FROM (
        SELECT
          ${cfg.barcodeCol} AS BCODE,
          FILE_NAME,
          MIN(LOG_TIMESTAMP) AS MIN_TS,
          MAX(${cfg.resultCol}) AS FINAL_RESULT
        FROM ${tableKey}
        WHERE ${whereTime}
          AND ${cfg.resultCol} IS NOT NULL
          AND ${cfg.barcodeCol} IS NOT NULL
        GROUP BY ${cfg.barcodeCol}, FILE_NAME
      )
      GROUP BY TO_CHAR(MIN_TS, 'HH24')
      ORDER BY HOUR
    `
    : `
      SELECT
        TO_CHAR(LOG_TIMESTAMP, 'HH24') AS HOUR,
        COUNT(*) AS TOTAL_CNT,
        SUM(CASE WHEN ${cfg.resultCol} IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
      FROM ${tableKey}
      WHERE ${whereTime}
        AND ${cfg.resultCol} IS NOT NULL
      GROUP BY TO_CHAR(LOG_TIMESTAMP, 'HH24')
      ORDER BY HOUR
    `;

  const rows = await executeQuery<FpyRow>(sql, binds);

  const hourly: HourlyFpy[] = rows.map((r) => ({
    hour: r.HOUR,
    total: r.TOTAL_CNT,
    pass: r.PASS_CNT,
    yield: r.TOTAL_CNT > 0
      ? Math.round((r.PASS_CNT / r.TOTAL_CNT) * 10000) / 100
      : 100,
  }));

  const totalAll = hourly.reduce((s, h) => s + h.total, 0);
  const passAll = hourly.reduce((s, h) => s + h.pass, 0);

  return {
    key: tableKey,
    data: {
      hourly,
      summary: {
        total: totalAll,
        pass: passAll,
        yield: totalAll > 0
          ? Math.round((passAll / totalAll) * 10000) / 100
          : 100,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") ?? "";
    const dateTo = request.nextUrl.searchParams.get("dateTo") ?? "";

    /** 테이블 미존재(ORA-00942) 등 개별 오류 시 빈 데이터로 대체 */
    const safeQuery = async (k: MxvcFpyTableKey) => {
      try {
        return await queryTableFpy(k, dateFrom, dateTo);
      } catch {
        return { key: k, data: { hourly: [], summary: { total: 0, pass: 0, yield: 100 } } as TableFpyData };
      }
    };

    /* 조회 구간 표시용 */
    let wdSql: string;
    if (dateFrom && dateTo) {
      wdSql = `SELECT '${dateFrom}' AS WD_START, '${dateTo}' AS WD_END FROM DUAL`;
    } else {
      wdSql = `SELECT TO_CHAR(${workDayStartSql()}, 'YYYY-MM-DD HH24:MI') AS WD_START,
                      TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI') AS WD_END FROM DUAL`;
    }

    const [tableResults, workDayRows] = await Promise.all([
      Promise.all(TABLE_KEYS.map(safeQuery)),
      executeQuery<{ WD_START: string; WD_END: string }>(wdSql),
    ]);

    const tables: Record<string, TableFpyData> = {};
    for (const { key, data } of tableResults) {
      tables[key] = data;
    }

    const wd = workDayRows[0];

    return NextResponse.json({
      tables,
      workDay: { start: wd?.WD_START ?? "", end: wd?.WD_END ?? "" },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MXVC FPY API error:", error);
    return NextResponse.json(
      { error: "직행율 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
