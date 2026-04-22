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

/** 단일 테이블 직행율 조회 (bucket: 'hour' = 시간대별, 'day' = 일별) */
async function queryTableFpy(
  tableKey: MxvcFpyTableKey,
  dateFrom: string,
  dateTo: string,
  bucket: 'hour' | 'day' = 'hour',
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

  /* 시간 단위 버킷 표현식 */
  const bucketExpr = bucket === 'day'
    ? `TO_CHAR(LOG_TIMESTAMP, 'YYYY-MM-DD')`
    : `TO_CHAR(LOG_TIMESTAMP, 'HH24')`;
  const bucketExprForGrouped = bucket === 'day'
    ? `TO_CHAR(MIN_TS, 'YYYY-MM-DD')`
    : `TO_CHAR(MIN_TS, 'HH24')`;

  /**
   * 그룹핑 컬럼/NULL 가드 — stepCol이 있으면 (BARCODE, stepCol) 조합으로 1건.
   * 예) LOG_COATINGVISION: (MAIN_BARCODE, FILE_NAME) 조합 = 파일 단위 검사 1건
   */
  const groupCols = cfg.stepCol
    ? `${cfg.barcodeCol}, ${cfg.stepCol}`
    : cfg.barcodeCol;
  const groupNotNull = cfg.stepCol
    ? `AND ${cfg.barcodeCol} IS NOT NULL AND ${cfg.stepCol} IS NOT NULL`
    : `AND ${cfg.barcodeCol} IS NOT NULL`;

  /**
   * IS_SAMPLE='Y' 샘플 레코드 제외 (컬럼이 존재하는 테이블만).
   * NVL로 NULL은 유지 (정상 데이터).
   */
  const sampleFilter = cfg.hasIsSample ? `AND NVL(IS_SAMPLE, 'N') <> 'Y'` : '';

  /**
   * 쿼리 분기:
   * 1) groupedFpy=true (EOL/ICT/FCT, COATINGVISION 등) → 바코드(±스텝) 단위 1건 카운트 (진짜 FPY)
   * 2) 일반 (그 외)                                     → 단순 row 단위 PASS/FAIL
   */
  const sql = cfg.groupedFpy
    ? `
      SELECT ${bucketExprForGrouped} AS HOUR,
             COUNT(*) AS TOTAL_CNT,
             SUM(PASS_FLAG) AS PASS_CNT
      FROM (
        SELECT
          ${cfg.barcodeCol} AS BCODE,
          MIN(LOG_TIMESTAMP) AS MIN_TS,
          CASE WHEN SUM(CASE WHEN ${cfg.resultCol} NOT IN (${passIn}) THEN 1 ELSE 0 END) = 0
               THEN 1 ELSE 0 END AS PASS_FLAG
        FROM ${tableKey}
        WHERE ${whereTime}
          AND ${cfg.resultCol} IS NOT NULL
          ${groupNotNull}
          ${sampleFilter}
        GROUP BY ${groupCols}
      )
      GROUP BY ${bucketExprForGrouped}
      ORDER BY HOUR
    `
    : `
      SELECT ${bucketExpr} AS HOUR,
             COUNT(*) AS TOTAL_CNT,
             SUM(CASE WHEN ${cfg.resultCol} IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
      FROM ${tableKey}
      WHERE ${whereTime}
        AND ${cfg.resultCol} IS NOT NULL
        ${sampleFilter}
      GROUP BY ${bucketExpr}
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

  /* 판정값별 breakdown */
  let breakdown: { value: string; count: number; ratio: number }[] | undefined;
  if (cfg.breakdown) {
    try {
      /**
       * groupedFpy 테이블은 바코드 대표값(MAX(resultCol))으로 집계.
       * 일반 테이블은 row 단위 집계.
       */
      const bdSql = cfg.groupedFpy
        ? `SELECT FINAL_LABEL AS VAL, COUNT(*) AS CNT FROM (
             SELECT
               CASE WHEN SUM(CASE WHEN ${cfg.resultCol} NOT IN (${passIn}) THEN 1 ELSE 0 END) > 0
                    THEN 'FAIL'
                    ELSE MAX(${cfg.resultCol})
                    END AS FINAL_LABEL
               FROM ${tableKey}
              WHERE ${whereTime}
                AND ${cfg.resultCol} IS NOT NULL
                ${groupNotNull}
                ${sampleFilter}
              GROUP BY ${groupCols}
           )
           GROUP BY FINAL_LABEL
           ORDER BY CNT DESC`
        : `SELECT ${cfg.resultCol} AS VAL, COUNT(*) AS CNT
             FROM ${tableKey}
            WHERE ${whereTime}
              AND ${cfg.resultCol} IS NOT NULL
              ${sampleFilter}
            GROUP BY ${cfg.resultCol}
            ORDER BY CNT DESC`;
      const bdRows = await executeQuery<{ VAL: string; CNT: number }>(bdSql, binds);
      const bdTotal = bdRows.reduce((s, r) => s + r.CNT, 0);
      breakdown = bdRows.map((r) => ({
        value: r.VAL,
        count: r.CNT,
        ratio: bdTotal > 0 ? Math.round((r.CNT / bdTotal) * 10000) / 100 : 0,
      }));
    } catch {
      /* breakdown 실패해도 본 데이터는 반환 */
    }
  }

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
        breakdown,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const dateFromRaw = request.nextUrl.searchParams.get("dateFrom") ?? "";
    const dateToRaw = request.nextUrl.searchParams.get("dateTo") ?? "";
    const bucketParam = request.nextUrl.searchParams.get("bucket") ?? "day";
    const drillDate = request.nextUrl.searchParams.get("drillDate") ?? "";
    const bucket: 'hour' | 'day' = bucketParam === 'hour' ? 'hour' : 'day';

    /* drillDate 지정 시: 해당 일자의 시간대별로 강제 (YYYY-MM-DD T00:00 ~ T23:59) */
    let dateFrom = dateFromRaw;
    let dateTo = dateToRaw;
    let effectiveBucket: 'hour' | 'day' = bucket;
    if (drillDate) {
      dateFrom = `${drillDate}T00:00`;
      dateTo = `${drillDate}T23:59`;
      effectiveBucket = 'hour';
    }

    /** 테이블 미존재(ORA-00942) 등 개별 오류 시 빈 데이터로 대체 */
    const safeQuery = async (k: MxvcFpyTableKey) => {
      try {
        return await queryTableFpy(k, dateFrom, dateTo, effectiveBucket);
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
