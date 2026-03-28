/**
 * @file src/app/api/ctq/open-short/route.ts
 * @description 공용부품 Open/Short API (ICT 공정)
 *
 * 초보자 가이드:
 * 1. **테이블**: IP_PRODUCT_WORK_QC
 * 2. **대상 공정**: ICT (W090, W430)
 * 3. **불량코드**: B2020(OPEN), B2030(SHORT)
 * 4. **판정 기준**: 동일 BAD_REASON_CODE 1일 누적 2건+ -> B급 출하중지
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause, getVietnamTimeRange } from "@/lib/ctq/line-filter";
import type {
  OpenShortDefectType,
  OpenShortDefectItem,
  OpenShortLineCardData,
  OpenShortGrade,
} from "@/types/ctq/open-short";

export const dynamic = "force-dynamic";

/** 비교 대상 소분류 코드 -- 이 코드로 시작하는 DEFECT_ITEM_CODE만 대상 */
const OPEN_SHORT_PREFIXES = ["2703M01", "2005A01", "2007A01", "2007M01", "2011A01", "2203A01"];

/** LIKE 조건 생성 (OR) */
function buildIncludeOpenShortClause(alias: string): string {
  return "(" + OPEN_SHORT_PREFIXES
    .map((_, i) => `${alias}.DEFECT_ITEM_CODE LIKE :osPfx${i} || '%'`)
    .join(" OR ") + ")";
}

function getOpenShortPrefixParams(): Record<string, string> {
  const params: Record<string, string> = {};
  OPEN_SHORT_PREFIXES.forEach((pfx, i) => { params[`osPfx${i}`] = pfx; });
  return params;
}

const BAD_REASON_MAP: Record<string, OpenShortDefectType> = {
  B2020: "OPEN",
  B2030: "SHORT",
};

interface DefectRow {
  LINE_CODE: string;
  BAD_REASON_CODE: string;
  CNT: number;
  LAST_TIME: string;
}

interface NgDetailRow {
  LINE_CODE: string;
  BAD_REASON_CODE: string;
  QC_TIME: string;
  SERIAL_NO: string;
  MODEL_NAME: string;
  RECEIPT_DEFICIT: string;
  LOCATION_CODE: string;
  REPAIR_RESULT_CODE: string;
  QC_INSPECT_HANDLING: string;
  DEFECT_ITEM_CODE: string;
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

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");
    const { startStr: dayStart } = getVietnamTimeRange();

    const sql = `
      SELECT t.LINE_CODE,
             t.BAD_REASON_CODE,
             COUNT(*) AS CNT,
             TO_CHAR(MAX(t.QC_DATE), 'YYYY/MM/DD HH24:MI:SS') AS LAST_TIME
      FROM IP_PRODUCT_WORK_QC t
      WHERE t.QC_DATE >= TO_DATE(:dayStart, 'YYYY/MM/DD HH24:MI:SS')
        AND t.BAD_REASON_CODE IN ('B2020', 'B2030')
        AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
        AND t.LINE_CODE IS NOT NULL
        AND t.LINE_CODE <> '*'
        AND t.DEFECT_ITEM_CODE IS NOT NULL
        AND t.DEFECT_ITEM_CODE <> '*'
        AND ${buildIncludeOpenShortClause("t")}
        ${lineFilter.clause}
      GROUP BY t.LINE_CODE, t.BAD_REASON_CODE
    `;

    const rows = await executeQuery<DefectRow>(sql, { dayStart, ...getOpenShortPrefixParams(), ...lineFilter.params });

    /* NG 상세 (최근 5건, 툴팁용) */
    const detailSql = `
      SELECT LINE_CODE, BAD_REASON_CODE, QC_TIME, SERIAL_NO, MODEL_NAME,
             RECEIPT_DEFICIT, LOCATION_CODE, REPAIR_RESULT_CODE, QC_INSPECT_HANDLING, DEFECT_ITEM_CODE
      FROM (
        SELECT t.LINE_CODE,
               t.BAD_REASON_CODE,
               TO_CHAR(t.QC_DATE, 'YYYY/MM/DD HH24:MI:SS') AS QC_TIME,
               t.SERIAL_NO,
               NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
               NVL(t.RECEIPT_DEFICIT, '-') AS RECEIPT_DEFICIT,
               NVL(t.LOCATION_CODE, '-') AS LOCATION_CODE,
               NVL(t.REPAIR_RESULT_CODE, '-') AS REPAIR_RESULT_CODE,
               NVL(t.QC_INSPECT_HANDLING, '-') AS QC_INSPECT_HANDLING,
               NVL(t.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
               ROW_NUMBER() OVER (
                 PARTITION BY t.LINE_CODE, t.BAD_REASON_CODE
                 ORDER BY t.QC_DATE DESC
               ) AS RN
        FROM IP_PRODUCT_WORK_QC t
        WHERE t.QC_DATE >= TO_DATE(:dayStart, 'YYYY/MM/DD HH24:MI:SS')
          AND t.BAD_REASON_CODE IN ('B2020', 'B2030')
          AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
          AND t.LINE_CODE IS NOT NULL
          AND t.LINE_CODE <> '*'
          AND t.DEFECT_ITEM_CODE IS NOT NULL
          AND t.DEFECT_ITEM_CODE <> '*'
          AND ${buildIncludeOpenShortClause("t")}
          ${lineFilter.clause}
      ) WHERE RN <= 5
    `;
    const detailRows = await executeQuery<NgDetailRow>(detailSql, { dayStart, ...getOpenShortPrefixParams(), ...lineFilter.params });

    const detailMap = new Map<string, NgDetailRow[]>();
    for (const row of detailRows) {
      const key = `${row.LINE_CODE}|${row.BAD_REASON_CODE}`;
      if (!detailMap.has(key)) detailMap.set(key, []);
      detailMap.get(key)!.push(row);
    }

    const allLineCodes = new Set<string>();
    const lineDataMap = new Map<string, DefectRow[]>();

    for (const row of rows) {
      allLineCodes.add(row.LINE_CODE);
      if (!lineDataMap.has(row.LINE_CODE)) {
        lineDataMap.set(row.LINE_CODE, []);
      }
      lineDataMap.get(row.LINE_CODE)!.push(row);
    }

    /* 선택된 라인도 포함 (0건이어도 카드 표시) */
    for (const lc of lines) allLineCodes.add(lc);
    const sortedLineCodes = [...allLineCodes].sort();
    const lineNameMap = await getLineNames(sortedLineCodes);

    const lineCards: OpenShortLineCardData[] = [];

    for (const lineCode of sortedLineCodes) {
      const rowsForLine = lineDataMap.get(lineCode) ?? [];
      const defects: OpenShortDefectItem[] = [];
      let overallGrade: OpenShortGrade = "OK";

      for (const row of rowsForLine) {
        const defectType = BAD_REASON_MAP[row.BAD_REASON_CODE] ?? "SHORT";
        const detKey = `${row.LINE_CODE}|${row.BAD_REASON_CODE}`;
        const dets = detailMap.get(detKey) ?? [];
        defects.push({
          defectItem: defectType,
          defectType,
          badReasonCode: row.BAD_REASON_CODE,
          count: row.CNT,
          lastInspectTime: row.LAST_TIME,
          ngDetails: dets.map((d) => ({
            time: d.QC_TIME,
            pid: d.SERIAL_NO,
            model: d.MODEL_NAME,
            receiptDeficit: d.RECEIPT_DEFICIT,
            locationCode: d.LOCATION_CODE,
            repairResult: d.REPAIR_RESULT_CODE,
            qcHandling: d.QC_INSPECT_HANDLING,
            defectItem: d.DEFECT_ITEM_CODE,
          })),
        });
        if (row.CNT >= 2) {
          overallGrade = "B";
        }
      }

      defects.sort((a, b) => b.count - a.count);

      lineCards.push({
        lineCode,
        lineName: lineNameMap.get(lineCode) || lineCode,
        defects,
        overallGrade,
      });
    }

    lineCards.sort((a, b) => {
      const order: Record<OpenShortGrade, number> = { B: 0, OK: 1 };
      return order[a.overallGrade] - order[b.overallGrade];
    });

    return NextResponse.json({
      lines: lineCards,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Open/Short API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
