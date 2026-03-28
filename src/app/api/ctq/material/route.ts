/**
 * @file src/app/api/ctq/material/route.ts
 * @description CTQ 원자재 동일부품 API
 *
 * 초보자 가이드:
 * 1. **테이블**: IP_PRODUCT_WORK_QC
 * 2. **기준**: 동일 부품(DEFECT_ITEM_CODE)
 * 3. **판정**:
 *    - A급: 동일 부품 일 3건+ NG
 *    - C급: 동일 부품 90일 누적 3건+ NG -> 불량개선
 * 4. **성능**: 서버 캐싱 60초 + 단일 테이블 쿼리
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause } from "@/lib/ctq/line-filter";
import type {
  MaterialDefectItem,
  MaterialLineCardData,
  MaterialGrade,
} from "@/types/ctq/material";

export const dynamic = "force-dynamic";

/** Open/Short 대상 소분류 코드 -- 이 코드로 시작하는 DEFECT_ITEM_CODE는 open-short 페이지 대상 */
const OPEN_SHORT_PREFIXES = ["2703M01", "2005A01", "2007A01", "2007M01", "2011A01", "2203A01"];

/** Material에서 제외할 NOT LIKE 조건 생성 */
function buildExcludeOpenShortClause(alias: string): string {
  return OPEN_SHORT_PREFIXES
    .map((_, i) => `${alias}.DEFECT_ITEM_CODE NOT LIKE :osPfx${i} || '%'`)
    .join(" AND ");
}

function getOpenShortPrefixParams(): Record<string, string> {
  const params: Record<string, string> = {};
  OPEN_SHORT_PREFIXES.forEach((pfx, i) => { params[`osPfx${i}`] = pfx; });
  return params;
}

/* ---- 캐시 ---- */
interface CachedResult {
  lines: MaterialLineCardData[];
  lastUpdated: string;
}

let cache: CachedResult | null = null;
let isFetching = false;
const CACHE_TTL_MS = 60_000;

/** 시간 범위: 당일 08:00~, 90일 시작 */
function getTimeRanges() {
  const now = new Date();
  if (now.getHours() < 8) {
    now.setDate(now.getDate() - 1);
  }
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const fmt = (dt: Date) => {
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}/${mm}/${dd} 08:00:00`;
  };

  return {
    dayStart: fmt(new Date(y, m, d)),
    dayEnd: fmt(new Date(y, m, d + 1)),
    start90: fmt(new Date(y, m, d - 90)),
  };
}

interface DefectRow {
  LINE_CODE: string;
  DEFECT_ITEM: string;
  NG_DAILY: number;
  NG_90D: number;
}

interface NgDetailRow {
  LINE_CODE: string;
  DEFECT_ITEM: string;
  QC_TIME: string;
  SERIAL_NO: string;
  MODEL_NAME: string;
  RECEIPT_DEFICIT: string;
  LOCATION_CODE: string;
  REPAIR_RESULT_CODE: string;
  QC_INSPECT_HANDLING: string;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

async function getLineNames(lineCodes: string[]): Promise<Map<string, string>> {
  if (lineCodes.length === 0) return new Map();
  const placeholders = lineCodes.map((_, i) => `:lc${i}`).join(",");
  const sql = `
    SELECT LINE_CODE, LINE_NAME
    FROM IP_PRODUCT_LINE
    WHERE LINE_CODE IN (${placeholders})
  `;
  const params: Record<string, string> = {};
  lineCodes.forEach((code, i) => { params[`lc${i}`] = code; });
  const rows = await executeQuery<LineNameRow>(sql, params);
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(r.LINE_CODE, r.LINE_NAME));
  return map;
}

/** 부품별 NG 상세 (최근 5건, 툴팁용) */
async function getNgDetailsByDefect(
  lineFilter: { clause: string; params: Record<string, string> } = { clause: "", params: {} }
): Promise<NgDetailRow[]> {
  const times = getTimeRanges();
  const sql = `
    SELECT LINE_CODE, DEFECT_ITEM, QC_TIME, SERIAL_NO, MODEL_NAME,
           RECEIPT_DEFICIT, LOCATION_CODE, REPAIR_RESULT_CODE, QC_INSPECT_HANDLING
    FROM (
      SELECT t.LINE_CODE,
             t.DEFECT_ITEM_CODE AS DEFECT_ITEM,
             TO_CHAR(t.QC_DATE, 'YYYY/MM/DD HH24:MI:SS') AS QC_TIME,
             t.SERIAL_NO,
             NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
             NVL(t.RECEIPT_DEFICIT, '-') AS RECEIPT_DEFICIT,
             NVL(t.LOCATION_CODE, '-') AS LOCATION_CODE,
             NVL(t.REPAIR_RESULT_CODE, '-') AS REPAIR_RESULT_CODE,
             NVL(t.QC_INSPECT_HANDLING, '-') AS QC_INSPECT_HANDLING,
             ROW_NUMBER() OVER (
               PARTITION BY t.LINE_CODE, t.DEFECT_ITEM_CODE
               ORDER BY t.QC_DATE DESC
             ) AS RN
      FROM IP_PRODUCT_WORK_QC t
      WHERE t.QC_DATE >= TO_DATE(:ts90, 'YYYY/MM/DD HH24:MI:SS')
        AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
        AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
        AND t.LINE_CODE IS NOT NULL
        AND t.LINE_CODE <> '*'
        AND t.DEFECT_ITEM_CODE IS NOT NULL
        AND t.DEFECT_ITEM_CODE <> '*'
        AND ${buildExcludeOpenShortClause("t")}
        AND NOT EXISTS (
          SELECT 1 FROM IQ_MACHINE_HIPOT_POWER_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
          UNION ALL
          SELECT 1 FROM IQ_MACHINE_BURNIN_SMPS_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
          UNION ALL
          SELECT 1 FROM IQ_MACHINE_ATE_SERVER_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
          UNION ALL
          SELECT 1 FROM IQ_MACHINE_FT1_SMPS_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
        )
        ${lineFilter.clause}
    ) WHERE RN <= 5
  `;
  return executeQuery<NgDetailRow>(sql, {
    ts90: times.start90,
    tsEnd: times.dayEnd,
    ...getOpenShortPrefixParams(),
    ...lineFilter.params,
  });
}

async function fetchFromDB(
  lineFilter: { clause: string; params: Record<string, string> } = { clause: "", params: {} },
  selectedLines: string[] = []
): Promise<CachedResult> {
  const times = getTimeRanges();

  const sql = `
    SELECT t.LINE_CODE,
           t.DEFECT_ITEM_CODE AS DEFECT_ITEM,
           SUM(CASE WHEN t.QC_DATE >= TO_DATE(:dayStart, 'YYYY/MM/DD HH24:MI:SS') THEN 1 ELSE 0 END) AS NG_DAILY,
           COUNT(*) AS NG_90D
    FROM IP_PRODUCT_WORK_QC t
    WHERE t.QC_DATE >= TO_DATE(:ts90, 'YYYY/MM/DD HH24:MI:SS')
      AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
      AND t.SERIAL_NO LIKE 'VN%'
      AND t.LINE_CODE IS NOT NULL
      AND t.LINE_CODE <> '*'
      AND t.DEFECT_ITEM_CODE IS NOT NULL
      AND t.DEFECT_ITEM_CODE <> '*'
      AND ${buildExcludeOpenShortClause("t")}
      AND NOT EXISTS (
        SELECT 1 FROM IQ_MACHINE_HIPOT_POWER_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
        UNION ALL
        SELECT 1 FROM IQ_MACHINE_BURNIN_SMPS_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
        UNION ALL
        SELECT 1 FROM IQ_MACHINE_ATE_SERVER_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
        UNION ALL
        SELECT 1 FROM IQ_MACHINE_FT1_SMPS_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
      )
      ${lineFilter.clause}
    GROUP BY t.LINE_CODE, t.DEFECT_ITEM_CODE
    HAVING COUNT(*) >= 2
  `;

  const rows = await executeQuery<DefectRow>(sql, {
    ts90: times.start90,
    tsEnd: times.dayEnd,
    dayStart: times.dayStart,
    ...getOpenShortPrefixParams(),
    ...lineFilter.params,
  });

  const detailRows = await getNgDetailsByDefect(lineFilter);

  /* NG 상세 Map: LINE_CODE+DEFECT_ITEM -> NgDetailRow[] */
  const detailMap = new Map<string, NgDetailRow[]>();
  for (const row of detailRows) {
    const key = `${row.LINE_CODE}|${row.DEFECT_ITEM}`;
    if (!detailMap.has(key)) detailMap.set(key, []);
    detailMap.get(key)!.push(row);
  }

  /* 라인별 그룹핑 */
  const lineDataMap = new Map<string, DefectRow[]>();
  const allLineCodes = new Set<string>();

  for (const row of rows) {
    if (!row.DEFECT_ITEM) continue;
    allLineCodes.add(row.LINE_CODE);
    if (!lineDataMap.has(row.LINE_CODE)) {
      lineDataMap.set(row.LINE_CODE, []);
    }
    lineDataMap.get(row.LINE_CODE)!.push(row);
  }

  /* 선택된 라인도 포함 (0건이어도 카드 표시) */
  for (const lc of selectedLines) allLineCodes.add(lc);
  const sortedLineCodes = [...allLineCodes].sort();
  const lineNameMap = await getLineNames(sortedLineCodes);

  const lineCards: MaterialLineCardData[] = [];

  for (const lineCode of sortedLineCodes) {
    const rowsForLine = lineDataMap.get(lineCode) ?? [];
    const defects: MaterialDefectItem[] = [];
    let totalDailyNg = 0;
    let totalCumulativeNg = 0;
    let hasAGrade = false;
    let hasCGrade = false;

    for (const row of rowsForLine) {
      const detKey = `${row.LINE_CODE}|${row.DEFECT_ITEM}`;
      const dets = detailMap.get(detKey) ?? [];
      defects.push({
        defectItem: row.DEFECT_ITEM,
        dailyCount: row.NG_DAILY,
        cumulativeCount: row.NG_90D,
        ngDetails: dets.map((d) => ({
          time: d.QC_TIME,
          pid: d.SERIAL_NO,
          model: d.MODEL_NAME,
          receiptDeficit: d.RECEIPT_DEFICIT,
          locationCode: d.LOCATION_CODE,
          repairResult: d.REPAIR_RESULT_CODE,
          qcHandling: d.QC_INSPECT_HANDLING,
          defectItem: d.DEFECT_ITEM,
        })),
      });
      totalDailyNg += row.NG_DAILY;
      totalCumulativeNg += row.NG_90D;

      if (row.NG_DAILY >= 3) hasAGrade = true;
      if (row.NG_90D >= 3) hasCGrade = true;
    }

    defects.sort((a, b) => b.cumulativeCount - a.cumulativeCount);

    let overallGrade: MaterialGrade = "OK";
    if (hasAGrade) {
      overallGrade = "A";
    } else if (hasCGrade) {
      overallGrade = "C";
    }

    lineCards.push({
      lineCode,
      lineName: lineNameMap.get(lineCode) || lineCode,
      defects,
      totalDailyNg,
      totalCumulativeNg,
      overallGrade,
    });
  }

  lineCards.sort((a, b) => {
    const order: Record<MaterialGrade, number> = { A: 0, C: 1, OK: 2 };
    return order[a.overallGrade] - order[b.overallGrade];
  });

  return { lines: lineCards, lastUpdated: new Date().toISOString() };
}

function refreshCacheInBackground() {
  if (isFetching) return;
  isFetching = true;
  fetchFromDB()
    .then((result) => { cache = result; })
    .catch((err) => { console.error("Material cache refresh error:", err); })
    .finally(() => { isFetching = false; });
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");

    /* 라인 필터가 있으면 캐시 사용하지 않고 직접 조회 */
    if (lines.length > 0) {
      const result = await fetchFromDB(lineFilter, lines);
      return NextResponse.json(result);
    }

    /* 기존 캐시 로직 (필터 없을 때만) */
    if (cache) {
      const age = Date.now() - new Date(cache.lastUpdated).getTime();
      if (age > CACHE_TTL_MS) {
        refreshCacheInBackground();
      }
      return NextResponse.json(cache);
    }

    const result = await fetchFromDB();
    cache = result;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Material API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
