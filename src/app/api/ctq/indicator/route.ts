import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery, executeDml } from "@/lib/db";
import type {
  IndicatorComparisonMode,
  IndicatorProcessKey,
  IndicatorModelData,
  MonthlyProcessData,
  IndicatorResponse,
} from "@/types/ctq/indicator";

export const dynamic = "force-dynamic";

interface ProcessConfig {
  table: string;
  dateCol: string;
  pidCol: string;
  resultCol: string;
  extraWhere: string;
}

interface CacheRow {
  TARGET_MONTH: string;
  ITEM_CODE: string;
  PROCESS_CODE: string;
  NG_COUNT: number;
  TOTAL_COUNT: number;
  PPM: number;
  COUNTERMEASURE_NO: string | null;
}

const PROCESS_CONFIG: Record<IndicatorProcessKey, ProcessConfig> = {
  ICT: { table: "IQ_MACHINE_ICT_SERVER_DATA_RAW", dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  HIPOT: { table: "IQ_MACHINE_HIPOT_POWER_DATA_RAW", dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  FT: { table: "IQ_MACHINE_FT1_SMPS_DATA_RAW", dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  BURNIN: { table: "IQ_MACHINE_BURNIN_SMPS_DATA_RAW", dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  ATE: { table: "IQ_MACHINE_ATE_SERVER_DATA_RAW", dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
};

const PROCESS_KEYS: IndicatorProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

function getMonthTargets(): { monthBefore: string; lastMonth: string; currentMonth: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const mb = new Date(y, m - 2, 1);
  const lm = new Date(y, m - 1, 1);
  const cm = new Date(y, m, 1);

  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  return { monthBefore: fmt(mb), lastMonth: fmt(lm), currentMonth: fmt(cm) };
}

function monthToRange(tm: string): { startStr: string; endStr: string } {
  const [yy, mm] = tm.split("/").map(Number);
  const start = new Date(yy, mm - 1, 1);
  const end = new Date(yy, mm, 1);
  const fmt = (d: Date) => {
    const y2 = d.getFullYear();
    const m2 = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y2}/${m2}/${dd} 00:00:00`;
  };

  return { startStr: fmt(start), endStr: fmt(end) };
}

function monthDisplayLabel(tm: string): string {
  const [yy, mm] = tm.split("/");
  return `${yy}년 ${Number(mm)}월`;
}

async function hasCacheData(targetMonth: string): Promise<boolean> {
  const rows = await executeQuery<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM IQ_INDICATOR_MONTHLY WHERE TARGET_MONTH = :tm`,
    { tm: targetMonth }
  );
  return (rows[0]?.CNT ?? 0) > 0;
}

async function getCacheData(targetMonth: string): Promise<CacheRow[]> {
  return executeQuery<CacheRow>(
    `SELECT TARGET_MONTH, ITEM_CODE, PROCESS_CODE, NG_COUNT, TOTAL_COUNT, PPM, COUNTERMEASURE_NO
     FROM IQ_INDICATOR_MONTHLY
     WHERE TARGET_MONTH = :tm`,
    { tm: targetMonth }
  );
}

async function getLiveProcessData(
  processKey: IndicatorProcessKey,
  targetMonth: string
): Promise<CacheRow[]> {
  const config = PROCESS_CONFIG[processKey];
  const { startStr, endStr } = monthToRange(targetMonth);

  return executeQuery<CacheRow>(
    `SELECT :tm AS TARGET_MONTH,
            b.ITEM_CODE,
            :pc AS PROCESS_CODE,
            SUM(CASE WHEN t.${config.resultCol} NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) AS NG_COUNT,
            COUNT(*) AS TOTAL_COUNT,
            CASE WHEN COUNT(*) > 0
                 THEN ROUND(SUM(CASE WHEN t.${config.resultCol} NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) / COUNT(*) * 1000000)
                 ELSE 0 END AS PPM,
            CAST(NULL AS VARCHAR2(100)) AS COUNTERMEASURE_NO
     FROM ${config.table} t
     JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
     WHERE t.${config.dateCol} >= :startStr AND t.${config.dateCol} < :endStr
       AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
       AND t.LINE_CODE IS NOT NULL
       AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
       ${config.extraWhere}
     GROUP BY b.ITEM_CODE`,
    { tm: targetMonth, pc: processKey, startStr, endStr }
  );
}

async function getLiveMonthData(targetMonth: string): Promise<CacheRow[]> {
  const rows = await Promise.all(PROCESS_KEYS.map((key) => getLiveProcessData(key, targetMonth)));
  return rows.flat();
}

function mergeCountermeasureRows(liveRows: CacheRow[], cacheRows: CacheRow[]): CacheRow[] {
  const countermeasureMap = new Map(
    cacheRows.map((row) => [`${row.ITEM_CODE}::${row.PROCESS_CODE}`, row.COUNTERMEASURE_NO ?? null])
  );

  return liveRows.map((row) => ({
    ...row,
    COUNTERMEASURE_NO:
      countermeasureMap.get(`${row.ITEM_CODE}::${row.PROCESS_CODE}`) ?? row.COUNTERMEASURE_NO ?? null,
  }));
}

async function insertProcessMonth(
  processKey: IndicatorProcessKey,
  targetMonth: string
): Promise<void> {
  const config = PROCESS_CONFIG[processKey];
  const { startStr, endStr } = monthToRange(targetMonth);

  const sql = `
    MERGE INTO IQ_INDICATOR_MONTHLY tgt
    USING (
      SELECT :tm AS TM,
             b.ITEM_CODE,
             :pc AS PC,
             SUM(CASE WHEN t.${config.resultCol} NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) AS NG_CNT,
             COUNT(*) AS TOT_CNT,
             CASE WHEN COUNT(*) > 0
                  THEN ROUND(SUM(CASE WHEN t.${config.resultCol} NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) / COUNT(*) * 1000000)
                  ELSE 0 END AS PPM_VAL
      FROM ${config.table} t
      JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
      WHERE t.${config.dateCol} >= :startStr AND t.${config.dateCol} < :endStr
        AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
        AND t.LINE_CODE IS NOT NULL
        AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
        ${config.extraWhere}
      GROUP BY b.ITEM_CODE
    ) src
    ON (tgt.TARGET_MONTH = src.TM AND tgt.ITEM_CODE = src.ITEM_CODE AND tgt.PROCESS_CODE = src.PC)
    WHEN MATCHED THEN
      UPDATE SET tgt.NG_COUNT = src.NG_CNT, tgt.TOTAL_COUNT = src.TOT_CNT, tgt.PPM = src.PPM_VAL, tgt.UPDATED_DATE = SYSDATE
    WHEN NOT MATCHED THEN
      INSERT (TARGET_MONTH, ITEM_CODE, PROCESS_CODE, NG_COUNT, TOTAL_COUNT, PPM, CREATED_DATE, UPDATED_DATE)
      VALUES (src.TM, src.ITEM_CODE, src.PC, src.NG_CNT, src.TOT_CNT, src.PPM_VAL, SYSDATE, SYSDATE)
  `;

  await executeDml(sql, { tm: targetMonth, pc: processKey, startStr, endStr });
}

async function calculateAndInsert(targetMonth: string): Promise<void> {
  await Promise.all(PROCESS_KEYS.map((key) => insertProcessMonth(key, targetMonth)));
}

const toPpm = (ng: number, total: number): number =>
  total > 0 ? Math.round((ng / total) * 1_000_000) : 0;

function buildResponse(
  mbRows: CacheRow[],
  lmRows: CacheRow[],
  mbMonth: string,
  lmMonth: string,
  minVolume: number,
  comparisonMode: IndicatorComparisonMode
): IndicatorResponse {
  const modelMap = new Map<string, IndicatorModelData>();

  const ensure = (ic: string) => {
    if (!modelMap.has(ic)) {
      modelMap.set(ic, { itemCode: ic, monthBefore: {}, lastMonth: {} });
    }
    return modelMap.get(ic)!;
  };

  for (const r of mbRows) {
    const m = ensure(r.ITEM_CODE);
    const key = r.PROCESS_CODE as IndicatorProcessKey;
    m.monthBefore[key] = {
      ngCount: r.NG_COUNT,
      totalCount: r.TOTAL_COUNT,
      ppm: toPpm(r.NG_COUNT, r.TOTAL_COUNT),
      countermeasureNo: r.COUNTERMEASURE_NO ?? null,
    };
  }

  for (const r of lmRows) {
    const m = ensure(r.ITEM_CODE);
    const key = r.PROCESS_CODE as IndicatorProcessKey;
    m.lastMonth[key] = {
      ngCount: r.NG_COUNT,
      totalCount: r.TOTAL_COUNT,
      ppm: toPpm(r.NG_COUNT, r.TOTAL_COUNT),
      countermeasureNo: r.COUNTERMEASURE_NO ?? null,
    };
  }

  const filtered = [...modelMap.values()].filter((model) => {
    const mbProcs = Object.values(model.monthBefore) as MonthlyProcessData[];
    const lmProcs = Object.values(model.lastMonth) as MonthlyProcessData[];

    const mbPpmSum = mbProcs.reduce((s, p) => s + p.ppm, 0);
    const lmPpmSum = lmProcs.reduce((s, p) => s + p.ppm, 0);

    if (mbPpmSum === 0 && lmPpmSum === 0) return false;

    const mbTotal = mbProcs.reduce((s, p) => s + p.totalCount, 0);
    const lmTotal = lmProcs.reduce((s, p) => s + p.totalCount, 0);

    if (mbTotal < minVolume || lmTotal < minVolume) return false;

    return true;
  });

  const models = filtered.sort((a, b) => {
    const sumPpm = (m: IndicatorModelData) => {
      const mb = Object.values(m.monthBefore) as MonthlyProcessData[];
      const lm = Object.values(m.lastMonth) as MonthlyProcessData[];
      return mb.reduce((s, p) => s + p.ppm, 0) + lm.reduce((s, p) => s + p.ppm, 0);
    };
    return sumPpm(b) - sumPpm(a);
  });

  return {
    models,
    monthBefore: { month: mbMonth, displayLabel: monthDisplayLabel(mbMonth) },
    lastMonth: { month: lmMonth, displayLabel: monthDisplayLabel(lmMonth) },
    comparisonMode,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { monthBefore, lastMonth, currentMonth } = getMonthTargets();
    const regenerate = request.nextUrl.searchParams.get("regenerate") === "true";
    const comparisonMode: IndicatorComparisonMode =
      request.nextUrl.searchParams.get("comparisonMode") === "before-vs-last"
        ? "before-vs-last"
        : "last-vs-current";
    const minVolumeParam = Number(request.nextUrl.searchParams.get("minVolume"));
    const minVolume = minVolumeParam > 0 ? minVolumeParam : 200;

    let previousRows: CacheRow[] = [];
    let currentRows: CacheRow[] = [];
    let previousMonth = monthBefore;
    let currentPeriodMonth = lastMonth;

    if (comparisonMode === "before-vs-last") {
      if (regenerate) {
        await Promise.all([
          calculateAndInsert(previousMonth),
          calculateAndInsert(currentPeriodMonth),
        ]);
      } else {
        const [hasPrevious, hasCurrent] = await Promise.all([
          hasCacheData(previousMonth),
          hasCacheData(currentPeriodMonth),
        ]);

        if (!hasPrevious) await calculateAndInsert(previousMonth);
        if (!hasCurrent) await calculateAndInsert(currentPeriodMonth);
      }

      [previousRows, currentRows] = await Promise.all([
        getCacheData(previousMonth),
        getCacheData(currentPeriodMonth),
      ]);
    } else {
      previousMonth = lastMonth;
      currentPeriodMonth = currentMonth;

      if (regenerate) {
        await calculateAndInsert(previousMonth);
      } else {
        const hasPrevious = await hasCacheData(previousMonth);
        if (!hasPrevious) await calculateAndInsert(previousMonth);
      }

      const [cachedPreviousRows, liveCurrentRows, currentCountermeasureRows] = await Promise.all([
        getCacheData(previousMonth),
        getLiveMonthData(currentPeriodMonth),
        getCacheData(currentPeriodMonth),
      ]);

      previousRows = cachedPreviousRows;
      currentRows = mergeCountermeasureRows(liveCurrentRows, currentCountermeasureRows);
    }

    const response = buildResponse(
      previousRows,
      currentRows,
      previousMonth,
      currentPeriodMonth,
      minVolume,
      comparisonMode
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Indicator API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetMonth, itemCode, processCode, countermeasureNo } = body;

    if (!targetMonth || !itemCode || !processCode) {
      return NextResponse.json(
        { error: "필수 파라미터 누락 (targetMonth, itemCode, processCode)" },
        { status: 400 }
      );
    }

    const hasTargetMonthCache = await hasCacheData(targetMonth);
    if (!hasTargetMonthCache) {
      await calculateAndInsert(targetMonth);
    }

    await executeDml(
      `UPDATE IQ_INDICATOR_MONTHLY
       SET COUNTERMEASURE_NO = :cn, UPDATED_DATE = SYSDATE
       WHERE TARGET_MONTH = :tm AND ITEM_CODE = :ic AND PROCESS_CODE = :pc`,
      { cn: countermeasureNo || null, tm: targetMonth, ic: itemCode, pc: processCode }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Indicator POST error:", error);
    return NextResponse.json(
      { error: "대책서번호 등록 실패", detail: String(error) },
      { status: 500 }
    );
  }
}