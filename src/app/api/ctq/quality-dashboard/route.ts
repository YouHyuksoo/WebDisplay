/**
 * @file src/app/api/ctq/quality-dashboard/route.ts
 * @description 품질 분석 대시보드 API — IP_PRODUCT_WORK_QC 다차원 집계
 *
 * 초보자 가이드:
 * 1. 10종 집계: 공정별/불량코드/라인별/모델별/시간대별/불량부품/위치별/수리공정별/입고구분별/수리완료율
 * 2. 기간: 당일 08:00 ~ 익일 08:00
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause, getVietnamTimeRange } from "@/lib/ctq/line-filter";

export const dynamic = "force-dynamic";

interface CountRow { NAME: string; CNT: number; }
interface RepairRow { TOTAL_CNT: number; REPAIRED_CNT: number; }
interface HourRow { HR: string; CNT: number; }
interface FpyRow { NAME: string; DAY_TYPE: string; FPY: number; TOTAL: number; PASS: number; }

const FPY_PROCESSES = [
  { key: "ICT", table: "IQ_MACHINE_ICT_SERVER_DATA_RAW" },
  { key: "HIPOT", table: "IQ_MACHINE_HIPOT_POWER_DATA_RAW" },
  { key: "FT", table: "IQ_MACHINE_FT1_SMPS_DATA_RAW" },
  { key: "BURNIN", table: "IQ_MACHINE_BURNIN_SMPS_DATA_RAW" },
  { key: "ATE", table: "IQ_MACHINE_ATE_SERVER_DATA_RAW" },
];

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");
    const tr = getVietnamTimeRange();
    const baseWhere = `
      t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
      AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
      AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
      AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
      ${lineFilter.clause}
    `;
    const bp = { tsStart: tr.startStr, tsEnd: tr.endStr, ...lineFilter.params };

    const [processR, badCodeR, lineR, modelR, hourR, repairR, defectItemR, locationR, repairWsR, receiptR] = await Promise.all([
      executeQuery<CountRow>(`
        SELECT NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), t.WORKSTAGE_CODE) AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere}
        GROUP BY t.WORKSTAGE_CODE, F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE) ORDER BY CNT DESC
      `, bp),
      executeQuery<CountRow>(`
        SELECT t.BAD_REASON_CODE || ' ' || NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1), '') AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere} AND t.BAD_REASON_CODE IS NOT NULL
        GROUP BY t.BAD_REASON_CODE, F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1)
        ORDER BY CNT DESC FETCH FIRST 10 ROWS ONLY
      `, bp),
      executeQuery<CountRow>(`
        SELECT F_GET_LINE_NAME(t.LINE_CODE, 1) AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere}
        GROUP BY t.LINE_CODE, F_GET_LINE_NAME(t.LINE_CODE, 1) ORDER BY CNT DESC
      `, bp),
      executeQuery<CountRow>(`
        SELECT NVL(t.MODEL_NAME, '-') AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere}
        GROUP BY t.MODEL_NAME ORDER BY CNT DESC FETCH FIRST 10 ROWS ONLY
      `, bp),
      executeQuery<HourRow>(`
        SELECT TO_CHAR(t.QC_DATE, 'HH24') AS HR, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere}
        GROUP BY TO_CHAR(t.QC_DATE, 'HH24') ORDER BY HR
      `, bp),
      executeQuery<RepairRow>(`
        SELECT COUNT(*) AS TOTAL_CNT,
               SUM(CASE WHEN t.REPAIR_RESULT_CODE IS NOT NULL AND t.REPAIR_RESULT_CODE <> '-' THEN 1 ELSE 0 END) AS REPAIRED_CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere}
      `, bp),
      executeQuery<CountRow>(`
        SELECT NVL(t.DEFECT_ITEM_CODE, '-') AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere} AND t.DEFECT_ITEM_CODE IS NOT NULL AND t.DEFECT_ITEM_CODE <> '*'
        GROUP BY t.DEFECT_ITEM_CODE ORDER BY CNT DESC FETCH FIRST 10 ROWS ONLY
      `, bp),
      executeQuery<CountRow>(`
        SELECT NVL(t.LOCATION_CODE, '-') AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere} AND t.LOCATION_CODE IS NOT NULL
        GROUP BY t.LOCATION_CODE ORDER BY CNT DESC FETCH FIRST 10 ROWS ONLY
      `, bp),
      executeQuery<CountRow>(`
        SELECT NVL(F_GET_WORKSTAGE_NAME(t.REPAIR_WORKSTAGE_CODE), NVL(t.REPAIR_WORKSTAGE_CODE, '-')) AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere} AND t.REPAIR_WORKSTAGE_CODE IS NOT NULL
        GROUP BY t.REPAIR_WORKSTAGE_CODE, F_GET_WORKSTAGE_NAME(t.REPAIR_WORKSTAGE_CODE) ORDER BY CNT DESC
      `, bp),
      executeQuery<CountRow>(`
        SELECT NVL(F_GET_BASECODE('RECEIPT DEFICIT', t.RECEIPT_DEFICIT, 'C', 1), t.RECEIPT_DEFICIT) AS NAME, COUNT(*) AS CNT
        FROM IP_PRODUCT_WORK_QC t WHERE ${baseWhere}
        GROUP BY t.RECEIPT_DEFICIT, F_GET_BASECODE('RECEIPT DEFICIT', t.RECEIPT_DEFICIT, 'C', 1) ORDER BY CNT DESC
      `, bp),
    ]);

    const fpyLineFilter = buildLineInClause(lines, "t", "fl");
    const fpyResults = await Promise.all(
      FPY_PROCESSES.map(p =>
        executeQuery<FpyRow>(`
          SELECT '${p.key}' AS NAME,
                 CASE WHEN t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00' THEN 'Y' ELSE 'T' END AS DAY_TYPE,
                 COUNT(DISTINCT t.PID) AS TOTAL,
                 COUNT(DISTINCT CASE WHEN t.INSPECT_RESULT IN ('PASS','GOOD','OK','Y') THEN t.PID END) AS PASS,
                 CASE WHEN COUNT(DISTINCT t.PID) > 0
                   THEN ROUND(COUNT(DISTINCT CASE WHEN t.INSPECT_RESULT IN ('PASS','GOOD','OK','Y') THEN t.PID END) / COUNT(DISTINCT t.PID) * 100, 1)
                   ELSE 0 END AS FPY
          FROM ${p.table} t
          WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24)-1, 'YYYY/MM/DD') || ' 10:00:00'
            AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
            ${fpyLineFilter.clause}
          GROUP BY CASE WHEN t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00' THEN 'Y' ELSE 'T' END
        `, { ...fpyLineFilter.params })
      )
    );
    const fpyData = FPY_PROCESSES.map((p, i) => {
      const rows = fpyResults[i];
      const today = rows.find(r => r.DAY_TYPE === "T");
      const yesterday = rows.find(r => r.DAY_TYPE === "Y");
      return {
        name: p.key,
        today: today?.FPY ?? 0,
        yesterday: yesterday?.FPY ?? 0,
        todayTotal: today?.TOTAL ?? 0,
        yesterdayTotal: yesterday?.TOTAL ?? 0,
      };
    });

    const toChart = (rows: CountRow[]) => rows.map(r => ({ name: r.NAME || "-", count: r.CNT }));
    const total = repairR[0]?.TOTAL_CNT ?? 0;
    const repaired = repairR[0]?.REPAIRED_CNT ?? 0;
    const processData = toChart(processR);
    const badCodeData = toChart(badCodeR);

    return NextResponse.json({
      process: processData,
      badCode: badCodeData,
      line: toChart(lineR),
      model: toChart(modelR),
      hourly: Array.from({ length: 24 }, (_, i) => {
        const h = String((i + 8) % 24).padStart(2, "0");
        const found = hourR.find(r => r.HR === h);
        return { name: `${h}:00`, count: found?.CNT ?? 0 };
      }),
      repair: { total, repaired, pending: total - repaired },
      defectItem: toChart(defectItemR),
      location: toChart(locationR),
      repairWorkstage: toChart(repairWsR),
      receipt: toChart(receiptR),
      fpy: fpyData,
      summary: {
        totalDefects: total,
        repairRate: total > 0 ? Math.round((repaired / total) * 100) : 0,
        topProcess: processData[0]?.name ?? "-",
        topBadCode: badCodeData[0]?.name?.split(" ")[0] ?? "-",
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Quality Dashboard API error:", error);
    return NextResponse.json({ error: "데이터 조회 실패", detail: String(error) }, { status: 500 });
  }
}
