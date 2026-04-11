/**
 * @file src/app/api/mxvc/p-chart/route.ts
 * @description 멕시코전장 p 관리도 API — 13개 LOG 테이블 바코드 단위 불량률 관리도
 *
 * 초보자 가이드:
 * 1. 바코드 단위로 최종 판정(MAX) 집계 → 일별 불량률 계산
 * 2. p = 불량 바코드 수 / 전체 바코드 수
 * 3. UCL/LCL = p̄ ± 3√(p̄(1-p̄)/n) — 서브그룹(일별) 크기에 따라 변동
 */
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import {
  TABLE_CONFIG, TABLE_KEYS,
  type MxvcFpyTableKey,
} from "@/types/mxvc/fpy";

export const dynamic = "force-dynamic";

const PASS_VALUES = ["OK", "PASS", "GOOD", "Good", "Y", "SKIP", "OverKill"];

interface RawRow {
  DAY_KEY: string;
  DAY_LABEL: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface DailyP {
  date: string;
  dateLabel: string;
  total: number;
  pass: number;
  p: number;
  ucl: number;
  lcl: number;
}

interface TablePData {
  daily: DailyP[];
  stats: {
    total: number;
    pass: number;
    pBar: number;
    oocCount: number;
  };
}

function workDayStartSql(): string {
  return `
    CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
      THEN TRUNC(SYSDATE) + 8/24
      ELSE TRUNC(SYSDATE) - 1 + 8/24
    END`;
}

/** 단일 테이블 p 관리도 데이터 — 바코드 단위, 일별 집계 */
async function queryTablePChart(
  tableKey: MxvcFpyTableKey,
  dateFrom: string,
  dateTo: string,
): Promise<{ key: MxvcFpyTableKey; data: TablePData }> {
  const cfg = TABLE_CONFIG[tableKey];
  const passIn = PASS_VALUES.map((v) => `'${v}'`).join(",");

  const binds: Record<string, string> = {};
  let whereTime: string;

  if (dateFrom && dateTo) {
    binds.fromDate = dateFrom.replace("T", " ");
    binds.toDate = dateTo.replace("T", " ");
    whereTime = `LOG_TIMESTAMP >= TO_TIMESTAMP(:fromDate || ':00', 'YYYY-MM-DD HH24:MI:SS')
      AND LOG_TIMESTAMP <= TO_TIMESTAMP(:toDate || ':59', 'YYYY-MM-DD HH24:MI:SS')`;
  } else {
    whereTime = `LOG_TIMESTAMP >= (${workDayStartSql()}) AND LOG_TIMESTAMP <= SYSDATE`;
  }

  /* IS_LAST='Y' 행만 = 바코드당 최종 1건, 일별 양품률 집계 */
  const sql = `
    SELECT
      TO_CHAR(TRUNC(CAST(LOG_TIMESTAMP AS DATE)), 'YYYY-MM-DD') AS DAY_KEY,
      TO_CHAR(TRUNC(CAST(LOG_TIMESTAMP AS DATE)), 'MM/DD') AS DAY_LABEL,
      COUNT(*) AS TOTAL_CNT,
      SUM(CASE WHEN ${cfg.resultCol} IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM ${tableKey}
    WHERE ${whereTime}
      AND ${cfg.resultCol} IS NOT NULL
      AND IS_LAST = 'Y'
    GROUP BY TO_CHAR(TRUNC(CAST(LOG_TIMESTAMP AS DATE)), 'YYYY-MM-DD'),
             TO_CHAR(TRUNC(CAST(LOG_TIMESTAMP AS DATE)), 'MM/DD')
    ORDER BY DAY_KEY
  `;

  const rows = await executeQuery<RawRow>(sql, binds);

  /* 전체 통계로 pBar(양품률) 계산 */
  const totalAll = rows.reduce((s, r) => s + r.TOTAL_CNT, 0);
  const passAll = rows.reduce((s, r) => s + r.PASS_CNT, 0);
  const pBar = totalAll > 0 ? passAll / totalAll : 1;

  /* 일별 양품률 p, UCL, LCL */
  let oocCount = 0;
  const daily: DailyP[] = rows.map((r) => {
    const n = r.TOTAL_CNT;
    const pass = r.PASS_CNT;
    const p = n > 0 ? pass / n : 1;
    const sigma = n > 0 ? Math.sqrt(pBar * (1 - pBar) / n) : 0;
    const ucl = Math.min(1, pBar + 3 * sigma);
    const lcl = Math.max(0, pBar - 3 * sigma);

    if (p > ucl || p < lcl) oocCount++;

    return {
      date: r.DAY_KEY,
      dateLabel: r.DAY_LABEL,
      total: n,
      pass,
      p: Number((p * 100).toFixed(2)),
      ucl: Number((ucl * 100).toFixed(2)),
      lcl: Number((lcl * 100).toFixed(2)),
    };
  });

  return {
    key: tableKey,
    data: {
      daily,
      stats: {
        total: totalAll,
        pass: passAll,
        pBar: Number((pBar * 100).toFixed(2)),
        oocCount,
      },
    },
  };
}

/** 드릴다운: 특정 날짜의 시간별 양품률 데이터 (단일 테이블) */
async function queryHourlyDrilldown(
  tableKey: MxvcFpyTableKey,
  date: string,
): Promise<{ hourly: DailyP[]; stats: { total: number; pass: number; pBar: number; oocCount: number } }> {
  const cfg = TABLE_CONFIG[tableKey];
  const passIn = PASS_VALUES.map((v) => `'${v}'`).join(",");

  const sql = `
    SELECT
      TO_CHAR(LOG_TIMESTAMP, 'HH24') AS DAY_KEY,
      TO_CHAR(LOG_TIMESTAMP, 'HH24') || ':00' AS DAY_LABEL,
      COUNT(*) AS TOTAL_CNT,
      SUM(CASE WHEN ${cfg.resultCol} IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM ${tableKey}
    WHERE TRUNC(CAST(LOG_TIMESTAMP AS DATE)) = TO_DATE(:drillDate, 'YYYY-MM-DD')
      AND ${cfg.resultCol} IS NOT NULL
      AND IS_LAST = 'Y'
    GROUP BY TO_CHAR(LOG_TIMESTAMP, 'HH24')
    ORDER BY DAY_KEY
  `;

  const rows = await executeQuery<RawRow>(sql, { drillDate: date });

  const totalAll = rows.reduce((s, r) => s + r.TOTAL_CNT, 0);
  const passAll = rows.reduce((s, r) => s + r.PASS_CNT, 0);
  const pBar = totalAll > 0 ? passAll / totalAll : 1;

  let oocCount = 0;
  const hourly: DailyP[] = rows.map((r) => {
    const n = r.TOTAL_CNT;
    const pass = r.PASS_CNT;
    const p = n > 0 ? pass / n : 1;
    const sigma = n > 0 ? Math.sqrt(pBar * (1 - pBar) / n) : 0;
    const ucl = Math.min(1, pBar + 3 * sigma);
    const lcl = Math.max(0, pBar - 3 * sigma);
    if (p > ucl || p < lcl) oocCount++;

    return {
      date: r.DAY_KEY,
      dateLabel: r.DAY_LABEL,
      total: n,
      pass,
      p: Number((p * 100).toFixed(2)),
      ucl: Number((ucl * 100).toFixed(2)),
      lcl: Number((lcl * 100).toFixed(2)),
    };
  });

  return {
    hourly,
    stats: { total: totalAll, pass: passAll, pBar: Number((pBar * 100).toFixed(2)), oocCount },
  };
}

export async function GET(request: NextRequest) {
  try {
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") ?? "";
    const dateTo = request.nextUrl.searchParams.get("dateTo") ?? "";
    const drillTable = request.nextUrl.searchParams.get("drillTable") ?? "";
    const drillDate = request.nextUrl.searchParams.get("drillDate") ?? "";

    /* 드릴다운 모드: 특정 테이블 + 날짜의 시간별 데이터 */
    if (drillTable && drillDate) {
      const key = drillTable as MxvcFpyTableKey;
      if (!TABLE_KEYS.includes(key)) {
        return NextResponse.json({ error: "Invalid table" }, { status: 400 });
      }
      const result = await queryHourlyDrilldown(key, drillDate);
      return NextResponse.json({ table: key, date: drillDate, ...result });
    }

    const safeQuery = async (k: MxvcFpyTableKey) => {
      try {
        return await queryTablePChart(k, dateFrom, dateTo);
      } catch {
        return {
          key: k,
          data: { daily: [], stats: { total: 0, pass: 0, pBar: 100, oocCount: 0 } } as TablePData,
        };
      }
    };

    let wdSql: string;
    if (dateFrom && dateTo) {
      const f = dateFrom.replace("T", " ");
      const t = dateTo.replace("T", " ");
      wdSql = `SELECT '${f}' AS WD_START, '${t}' AS WD_END FROM DUAL`;
    } else {
      wdSql = `SELECT TO_CHAR(${workDayStartSql()}, 'YYYY-MM-DD HH24:MI') AS WD_START,
                      TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI') AS WD_END FROM DUAL`;
    }

    const [tableResults, workDayRows] = await Promise.all([
      Promise.all(TABLE_KEYS.map(safeQuery)),
      executeQuery<{ WD_START: string; WD_END: string }>(wdSql),
    ]);

    const tables: Record<string, TablePData> = {};
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
    console.error("MXVC P-Chart API error:", error);
    return NextResponse.json(
      { error: "p 관리도 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
