/**
 * @file src/app/api/ctq/quality-dashboard-raw/route.ts
 * @description RAW 검사 테이블 인사이트 API — 5개 공정 RAW 데이터 집계
 *
 * 초보자 가이드:
 * 1. 공정별 검사량, 시간당 검사량, 라인별 생산량
 * 2. 재검사율, 라인x공정 NG, 주간 직행율 추이
 * 3. 5개 RAW 테이블 UNION ALL 활용
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause } from "@/lib/ctq/line-filter";

export const dynamic = "force-dynamic";

const PROCS = [
  { key: "ICT", table: "IQ_MACHINE_ICT_SERVER_DATA_RAW" },
  { key: "HIPOT", table: "IQ_MACHINE_HIPOT_POWER_DATA_RAW" },
  { key: "FT", table: "IQ_MACHINE_FT1_SMPS_DATA_RAW" },
  { key: "BURNIN", table: "IQ_MACHINE_BURNIN_SMPS_DATA_RAW" },
  { key: "ATE", table: "IQ_MACHINE_ATE_SERVER_DATA_RAW" },
];

interface CountRow { NAME: string; CNT: number; }
interface NgMatrixRow { LINE_NAME: string; PROC: string; NG_CNT: number; }
interface RetestRow { NAME: string; TOTAL: number; DISTINCT_PID: number; RETEST_RATE: number; }
interface TrendRow { DT: string; PROC: string; FPY: number; }

function buildUnionAll(lineFilter: { clause: string }, dateWhere: string) {
  return PROCS.map(p => `
    SELECT '${p.key}' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
    FROM ${p.table} t
    WHERE ${dateWhere} ${lineFilter.clause}
  `).join(" UNION ALL ");
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lf = buildLineInClause(lines, "t", "ln");
    const todayWhere = `t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
      AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'`;
    const unionToday = buildUnionAll(lf, todayWhere);

    const [inspVolumeR, hourlyInspR, lineProdR, ngMatrixR, retestR, trendR] = await Promise.all([
      /* 1. 공정별 검사량 */
      executeQuery<CountRow>(`
        SELECT PROC AS NAME, COUNT(*) AS CNT FROM (${unionToday}) GROUP BY PROC ORDER BY PROC
      `, lf.params),

      /* 2. 시간당 검사량 */
      executeQuery<CountRow>(`
        SELECT SUBSTR(INSPECT_DATE, 12, 2) AS NAME, COUNT(*) AS CNT
        FROM (${unionToday}) GROUP BY SUBSTR(INSPECT_DATE, 12, 2) ORDER BY NAME
      `, lf.params),

      /* 3. 라인별 생산량 (고유 PID) */
      executeQuery<CountRow>(`
        SELECT F_GET_LINE_NAME(LINE_CODE, 1) AS NAME, COUNT(DISTINCT PID) AS CNT
        FROM (${unionToday}) GROUP BY LINE_CODE, F_GET_LINE_NAME(LINE_CODE, 1) ORDER BY CNT DESC
      `, lf.params),

      /* 4. 라인x공정 NG 매트릭스 */
      executeQuery<NgMatrixRow>(`
        SELECT F_GET_LINE_NAME(LINE_CODE, 1) AS LINE_NAME, PROC,
               SUM(CASE WHEN INSPECT_RESULT NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) AS NG_CNT
        FROM (${unionToday})
        GROUP BY LINE_CODE, F_GET_LINE_NAME(LINE_CODE, 1), PROC
        HAVING SUM(CASE WHEN INSPECT_RESULT NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) > 0
        ORDER BY LINE_NAME, PROC
      `, lf.params),

      /* 5. 재검사율 (공정별) */
      executeQuery<RetestRow>(`
        SELECT PROC AS NAME, COUNT(*) AS TOTAL, COUNT(DISTINCT PID) AS DISTINCT_PID,
               ROUND((1 - COUNT(DISTINCT PID) / NULLIF(COUNT(*), 0)) * 100, 1) AS RETEST_RATE
        FROM (${unionToday}) GROUP BY PROC ORDER BY PROC
      `, lf.params),

      /* 6. 주간 직행율 추이 (최근 7일) */
      (async () => {
        const weekWhere = `t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24)-6, 'YYYY/MM/DD') || ' 10:00:00'
          AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'`;
        const unionWeek = buildUnionAll(lf, weekWhere);
        return executeQuery<TrendRow>(`
          SELECT DT, PROC,
                 CASE WHEN COUNT(DISTINCT PID) > 0
                   THEN ROUND(COUNT(DISTINCT CASE WHEN INSPECT_RESULT IN ('PASS','GOOD','OK','Y') THEN PID END) / COUNT(DISTINCT PID) * 100, 1)
                   ELSE 0 END AS FPY
          FROM (
            SELECT PROC, PID, INSPECT_RESULT,
                   TO_CHAR(TO_DATE(SUBSTR(INSPECT_DATE,1,10),'YYYY/MM/DD'), 'MM/DD') AS DT
            FROM (${unionWeek})
          )
          GROUP BY DT, PROC ORDER BY DT, PROC
        `, lf.params);
      })(),
    ]);

    /* 시간당 검사량: 08~07 순서로 재정렬 */
    const hourlyInsp = Array.from({ length: 24 }, (_, i) => {
      const h = String((i + 8) % 24).padStart(2, "0");
      const found = hourlyInspR.find(r => r.NAME === h);
      return { name: `${h}:00`, count: found?.CNT ?? 0 };
    });

    /* 라인x공정 NG: 라인별 { lineName, ICT, HIPOT, FT, BURNIN, ATE } */
    const ngMap = new Map<string, Record<string, number>>();
    for (const r of ngMatrixR) {
      if (!ngMap.has(r.LINE_NAME)) ngMap.set(r.LINE_NAME, {});
      ngMap.get(r.LINE_NAME)![r.PROC] = r.NG_CNT;
    }
    const ngMatrix = [...ngMap.entries()].map(([name, procs]) => ({ name, ...procs }));

    /* 주간 직행율 추이: 날짜별 { date, ICT, HIPOT, FT, BURNIN, ATE } */
    const trendMap = new Map<string, Record<string, number>>();
    for (const r of trendR) {
      if (!trendMap.has(r.DT)) trendMap.set(r.DT, {});
      trendMap.get(r.DT)![r.PROC] = r.FPY;
    }
    const weeklyTrend = [...trendMap.entries()].map(([date, procs]) => ({ date, ...procs }));

    return NextResponse.json({
      inspectionVolume: inspVolumeR.map(r => ({ name: r.NAME, count: r.CNT })),
      hourlyInspection: hourlyInsp,
      lineProduction: lineProdR.map(r => ({ name: r.NAME || "-", count: r.CNT })),
      ngMatrix,
      retestRate: retestR.map(r => ({ name: r.NAME, total: r.TOTAL, distinctPid: r.DISTINCT_PID, rate: r.RETEST_RATE })),
      weeklyTrend,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Quality Dashboard RAW API error:", error);
    return NextResponse.json({ error: "데이터 조회 실패", detail: String(error) }, { status: 500 });
  }
}
