/**
 * @file src/app/api/ctq/equipment/route.ts
 * @description 설비이상 모니터링 API - 라인별 x 공정별 일일 정지시간 조회
 *
 * 초보자 가이드:
 * 1. **테이블**: IP_LINE_DAILY_OPERATION_HIST
 * 2. **기간**: F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A') 당일 기준
 * 3. **집계**: LINE_CODE x WORKSTAGE_CODE 별 정지시간(분) 합산
 * 4. **판정**: 60분 이상 -> C급 (불량개선)
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause } from "@/lib/ctq/line-filter";
import type { EquipmentProcessKey, EquipmentLineData } from "@/types/ctq/equipment";

export const dynamic = "force-dynamic";

const PROCESS_KEYS: EquipmentProcessKey[] = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

/** LINE_STATUS_CODE 값 -> 화면 표시 키 매핑 */
const STATUS_CODES = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"] as const;
const STATUS_TO_DISPLAY: Record<string, EquipmentProcessKey> = {
  ICT: "ICT",
  HIPOT: "HIPOT",
  FT: "FT",
  BURNIN: "BURNIN",
  ATE: "ATE",
};

interface StopRow {
  LINE_CODE: string;
  LINE_NAME: string;
  LINE_STATUS_CODE: string;
  STOP_MINUTES: number;
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "B", "ln");

    const processPlaceholders = STATUS_CODES.map((_, i) => `:sc${i}`).join(",");
    const processParams: Record<string, string> = {};
    STATUS_CODES.forEach((code, i) => { processParams[`sc${i}`] = code; });

    const sql = `
      SELECT B.LINE_CODE,
             F_GET_LINE_NAME(B.LINE_CODE, 1) AS LINE_NAME,
             B.LINE_STATUS_CODE,
             SUM((B.END_DATE - B.START_DATE) * 24 * 60) AS STOP_MINUTES
      FROM IP_LINE_DAILY_OPERATION_HIST B
      WHERE B.ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
        AND B.LINE_STATUS_CODE IN (${processPlaceholders})
        ${lineFilter.clause}
      GROUP BY B.LINE_CODE, F_GET_LINE_NAME(B.LINE_CODE, 1), B.LINE_STATUS_CODE
    `;

    const rows = await executeQuery<StopRow>(sql, {
      ...processParams,
      ...lineFilter.params,
    });

    /* LINE_CODE별 merge */
    const lineMap = new Map<string, EquipmentLineData>();

    for (const row of rows) {
      if (!lineMap.has(row.LINE_CODE)) {
        lineMap.set(row.LINE_CODE, {
          lineCode: row.LINE_CODE,
          lineName: row.LINE_NAME || row.LINE_CODE,
          processes: {},
        });
      }
      const line = lineMap.get(row.LINE_CODE)!;
      const key = STATUS_TO_DISPLAY[row.LINE_STATUS_CODE];
      if (key) {
        line.processes[key] = {
          stopMinutes: Math.round(row.STOP_MINUTES),
        };
      }
    }

    /* 선택된 라인은 데이터 0건이어도 포함 */
    if (lines.length > 0) {
      const missingLines = lines.filter((lc) => !lineMap.has(lc));
      if (missingLines.length > 0) {
        const placeholders = missingLines.map((_, i) => `:ml${i}`).join(",");
        const nameRows = await executeQuery<{ LINE_CODE: string; LINE_NAME: string }>(
          `SELECT LINE_CODE, LINE_NAME FROM IP_PRODUCT_LINE WHERE LINE_CODE IN (${placeholders})`,
          Object.fromEntries(missingLines.map((lc, i) => [`ml${i}`, lc]))
        );
        const nameMap = new Map(nameRows.map((r) => [r.LINE_CODE, r.LINE_NAME]));
        for (const lc of missingLines) {
          lineMap.set(lc, {
            lineCode: lc,
            lineName: nameMap.get(lc) || lc,
            processes: {},
          });
        }
      }
    }

    /* 라인코드 정렬 (정지시간 있는 라인 우선, 그 안에서 코드순) */
    const lineList = [...lineMap.values()].sort((a, b) => {
      const sumA = Object.values(a.processes).reduce((s, p) => s + (p?.stopMinutes ?? 0), 0);
      const sumB = Object.values(b.processes).reduce((s, p) => s + (p?.stopMinutes ?? 0), 0);
      if (sumA !== sumB) return sumB - sumA;
      return a.lineCode.localeCompare(b.lineCode);
    });

    return NextResponse.json({
      lines: lineList,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Equipment API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
