/**
 * @file src/app/api/ctq/indicator/route.ts
 * @description CTQ 지표 API -- IQ_INDICATOR_MONTHLY 캐시 테이블 기반 월간 PPM 조회
 *
 * 초보자 가이드:
 * 1. GET: 전전월/전월 캐시 데이터 조회. 없으면 RAW 테이블에서 집계 후 INSERT
 * 2. GET ?regenerate=true: 기존 캐시 삭제 후 RAW에서 재집계
 * 3. POST: 대책서번호(COUNTERMEASURE_NO) 등록/수정
 * 4. 5개 공정(ICT/HIPOT/FT/BURNIN/ATE) x 모델(ITEM_CODE)별 집계
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  IndicatorProcessKey,
  IndicatorModelData,
  MonthlyProcessData,
  IndicatorResponse,
} from "@/types/ctq/indicator";

export const dynamic = "force-dynamic";

/* -- 공정 테이블 매핑 -- */

interface ProcessConfig {
  table: string;
  dateCol: string;
  pidCol: string;
  resultCol: string;
  extraWhere: string;
}

const PROCESS_CONFIG: Record<IndicatorProcessKey, ProcessConfig> = {
  ICT:    { table: "IQ_MACHINE_ICT_SERVER_DATA_RAW",    dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  HIPOT:  { table: "IQ_MACHINE_HIPOT_POWER_DATA_RAW",   dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  FT:     { table: "IQ_MACHINE_FT1_SMPS_DATA_RAW",      dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  BURNIN: { table: "IQ_MACHINE_BURNIN_SMPS_DATA_RAW",   dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
  ATE:    { table: "IQ_MACHINE_ATE_SERVER_DATA_RAW",     dateCol: "INSPECT_DATE", pidCol: "PID", resultCol: "INSPECT_RESULT", extraWhere: "AND t.LAST_FLAG = 'Y'" },
};

const PROCESS_KEYS: IndicatorProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

/* -- 월 범위 계산 -- */

/** 전전월/전월 TARGET_MONTH 문자열 ("YYYY/MM") 계산 */
function getMonthTargets(): { monthBefore: string; lastMonth: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  const mb = new Date(y, m - 2, 1);
  const lm = new Date(y, m - 1, 1);

  const fmt = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  return { monthBefore: fmt(mb), lastMonth: fmt(lm) };
}

/** TARGET_MONTH("YYYY/MM") -> Oracle 날짜 범위 start/end 문자열 */
function monthToRange(tm: string): { startStr: string; endStr: string } {
  const [yy, mm] = tm.split("/").map(Number);
  const start = new Date(yy, mm - 1, 1);
  const end = new Date(yy, mm, 1); // 익월 1일
  const fmt = (d: Date) => {
    const y2 = d.getFullYear();
    const m2 = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y2}/${m2}/${dd} 00:00:00`;
  };
  return { startStr: fmt(start), endStr: fmt(end) };
}

/** 표시 라벨 생성 (예: "2026년 1월") */
function monthDisplayLabel(tm: string): string {
  const [yy, mm] = tm.split("/");
  return `${yy}년 ${Number(mm)}월`;
}

/* -- 캐시 테이블 조회 -- */

interface CacheRow {
  TARGET_MONTH: string;
  ITEM_CODE: string;
  PROCESS_CODE: string;
  NG_COUNT: number;
  TOTAL_COUNT: number;
  PPM: number;
  COUNTERMEASURE_NO: string | null;
}

/** 특정 월의 캐시 데이터 존재 여부 확인 */
async function hasCacheData(targetMonth: string): Promise<boolean> {
  const rows = await executeQuery<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM IQ_INDICATOR_MONTHLY WHERE TARGET_MONTH = :tm`,
    { tm: targetMonth }
  );
  return (rows[0]?.CNT ?? 0) > 0;
}

/** 특정 월의 캐시 데이터 조회 */
async function getCacheData(targetMonth: string): Promise<CacheRow[]> {
  return executeQuery<CacheRow>(
    `SELECT TARGET_MONTH, ITEM_CODE, PROCESS_CODE, NG_COUNT, TOTAL_COUNT, PPM, COUNTERMEASURE_NO
     FROM IQ_INDICATOR_MONTHLY
     WHERE TARGET_MONTH = :tm`,
    { tm: targetMonth }
  );
}

/* -- RAW 테이블에서 집계 -> 캐시 INSERT -- */

/** 특정 월의 단일 공정을 MERGE 로 집계+저장 */
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

  await executeQuery(sql, { tm: targetMonth, pc: processKey, startStr, endStr });
}

/** 특정 월의 모든 공정을 병렬 집계+저장 (MERGE 방식, COUNTERMEASURE_NO 보존) */
async function calculateAndInsert(targetMonth: string): Promise<void> {
  await Promise.all(
    PROCESS_KEYS.map((key) => insertProcessMonth(key, targetMonth))
  );
  /* RAW에 더 이상 없는 오래된 행 정리 (대책서 등록된 행은 보존) */
  await executeQuery(
    `DELETE FROM IQ_INDICATOR_MONTHLY
     WHERE TARGET_MONTH = :tm
       AND COUNTERMEASURE_NO IS NULL
       AND UPDATED_DATE < SYSDATE - 1/1440`,
    { tm: targetMonth }
  );
}

/* -- 응답 빌드 -- */

/** PPM 계산 헬퍼 */
const toPpm = (ng: number, total: number): number =>
  total > 0 ? Math.round((ng / total) * 1_000_000) : 0;

/** 캐시 행 -> IndicatorModelData[] 피벗 + 필터링 */
function buildResponse(
  mbRows: CacheRow[],
  lmRows: CacheRow[],
  mbMonth: string,
  lmMonth: string,
  minVolume: number
): IndicatorResponse {
  const modelMap = new Map<string, IndicatorModelData>();

  const ensure = (ic: string) => {
    if (!modelMap.has(ic)) {
      modelMap.set(ic, { itemCode: ic, monthBefore: {}, lastMonth: {} });
    }
    return modelMap.get(ic)!;
  };

  /* 전전월 데이터 피벗 */
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

  /* 전월 데이터 피벗 */
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

  /* 필터링 */
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

  /* PPM 합계 내림차순 정렬 */
  const models = filtered.sort((a, b) => {
    const sumPpm = (m: IndicatorModelData) => {
      const mb = Object.values(m.monthBefore) as MonthlyProcessData[];
      const lm = Object.values(m.lastMonth) as MonthlyProcessData[];
      return (
        mb.reduce((s, p) => s + p.ppm, 0) + lm.reduce((s, p) => s + p.ppm, 0)
      );
    };
    return sumPpm(b) - sumPpm(a);
  });

  return {
    models,
    monthBefore: { month: mbMonth, displayLabel: monthDisplayLabel(mbMonth) },
    lastMonth: { month: lmMonth, displayLabel: monthDisplayLabel(lmMonth) },
    lastUpdated: new Date().toISOString(),
  };
}

/* -- GET 핸들러 -- */

export async function GET(request: NextRequest) {
  try {
    const { monthBefore, lastMonth } = getMonthTargets();
    const regenerate = request.nextUrl.searchParams.get("regenerate") === "true";
    const minVolumeParam = Number(request.nextUrl.searchParams.get("minVolume"));
    const minVolume = minVolumeParam > 0 ? minVolumeParam : 200;

    /* 재생성 요청 시 MERGE로 수치만 갱신 (COUNTERMEASURE_NO 보존) */
    if (regenerate) {
      await Promise.all([
        calculateAndInsert(monthBefore),
        calculateAndInsert(lastMonth),
      ]);
    } else {
      /* 캐시 존재 여부 확인 -> 없으면 RAW에서 집계 후 INSERT */
      const [hasMb, hasLm] = await Promise.all([
        hasCacheData(monthBefore),
        hasCacheData(lastMonth),
      ]);

      if (!hasMb) await calculateAndInsert(monthBefore);
      if (!hasLm) await calculateAndInsert(lastMonth);
    }

    /* 캐시 데이터 조회 */
    const [mbRows, lmRows] = await Promise.all([
      getCacheData(monthBefore),
      getCacheData(lastMonth),
    ]);

    const response = buildResponse(mbRows, lmRows, monthBefore, lastMonth, minVolume);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Indicator API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}

/* -- POST 핸들러 -- 대책서번호 등록 -- */

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

    await executeQuery(
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
