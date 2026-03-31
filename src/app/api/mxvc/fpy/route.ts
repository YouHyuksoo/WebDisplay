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

const PASS_VALUES = ["OK", "PASS", "GOOD", "Y"];

interface FpyRow {
  HOUR: string;
  TOTAL_CNT: number;
  PASS_CNT: number;
}

interface EquipmentRow {
  EQUIPMENT_ID: string;
}

/**
 * 작업일 경계 SQL (08:00 기준 + dayOffset)
 * dayOffset=0: 오늘, dayOffset=-1: 어제, ...
 * 과거 조회 시 end는 해당일 다음날 08:00 (풀 24시간)
 */
function workDayStartSql(offset: number): string {
  return `
    CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
      THEN TRUNC(SYSDATE) + 8/24 + (${offset})
      ELSE TRUNC(SYSDATE) - 1 + 8/24 + (${offset})
    END`;
}

function workDayEndSql(offset: number): string {
  if (offset >= 0) return "SYSDATE";
  return `
    CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
      THEN TRUNC(SYSDATE) + 8/24 + (${offset}) + 1
      ELSE TRUNC(SYSDATE) - 1 + 8/24 + (${offset}) + 1
    END`;
}

/** 설비 필터 WHERE절 생성 */
function buildEquipmentFilter(
  equipments: string[],
): { clause: string; params: Record<string, string> } {
  if (equipments.length === 0) return { clause: "", params: {} };
  const placeholders = equipments.map((_, i) => `:eq${i}`).join(",");
  const params: Record<string, string> = {};
  equipments.forEach((eq, i) => { params[`eq${i}`] = eq; });
  return { clause: `AND EQUIPMENT_ID IN (${placeholders})`, params };
}

/** 단일 테이블 시간대별 직행율 조회 */
async function queryTableFpy(
  tableKey: MxvcFpyTableKey,
  eqFilter: { clause: string; params: Record<string, string> },
  dayOffset: number,
): Promise<{ key: MxvcFpyTableKey; data: TableFpyData }> {
  const cfg = TABLE_CONFIG[tableKey];
  const passIn = PASS_VALUES.map((v) => `'${v}'`).join(",");

  const sql = `
    SELECT
      TO_CHAR(LOG_TIMESTAMP, 'HH24') AS HOUR,
      COUNT(*) AS TOTAL_CNT,
      SUM(CASE WHEN ${cfg.resultCol} IN (${passIn}) THEN 1 ELSE 0 END) AS PASS_CNT
    FROM ${tableKey}
    WHERE LOG_TIMESTAMP >= (${workDayStartSql(dayOffset)})
      AND LOG_TIMESTAMP <= (${workDayEndSql(dayOffset)})
      AND ${cfg.resultCol} IS NOT NULL
      ${eqFilter.clause}
    GROUP BY TO_CHAR(LOG_TIMESTAMP, 'HH24')
    ORDER BY HOUR
  `;

  const rows = await executeQuery<FpyRow>(sql, eqFilter.params);

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

/** 사용 가능한 EQUIPMENT_ID 목록 조회 (전 테이블 UNION) */
async function queryEquipments(): Promise<string[]> {
  const unions = TABLE_KEYS
    .map((k) => `SELECT DISTINCT EQUIPMENT_ID FROM ${k}`)
    .join(" UNION ");
  const sql = `SELECT DISTINCT EQUIPMENT_ID FROM (${unions}) ORDER BY EQUIPMENT_ID`;
  const rows = await executeQuery<EquipmentRow>(sql);
  return rows.map((r) => r.EQUIPMENT_ID);
}

export async function GET(request: NextRequest) {
  try {
    const eqParam = request.nextUrl.searchParams.get("equipments") ?? "";
    const equipments = eqParam ? eqParam.split(",").filter(Boolean) : [];
    const eqFilter = buildEquipmentFilter(equipments);
    const dayOffset = Number(request.nextUrl.searchParams.get("dayOffset") ?? "0") || 0;

    const [tableResults, equipmentList, workDayRows] = await Promise.all([
      Promise.all(TABLE_KEYS.map((k) => queryTableFpy(k, eqFilter, dayOffset))),
      queryEquipments(),
      executeQuery<{ WD_START: string; WD_END: string }>(
        `SELECT TO_CHAR(${workDayStartSql(dayOffset)}, 'YYYY-MM-DD HH24:MI') AS WD_START,
                TO_CHAR(${workDayEndSql(dayOffset)}, 'YYYY-MM-DD HH24:MI') AS WD_END
         FROM DUAL`,
      ),
    ]);

    const tables: Record<string, TableFpyData> = {};
    for (const { key, data } of tableResults) {
      tables[key] = data;
    }

    const wd = workDayRows[0];

    return NextResponse.json({
      tables,
      equipments: equipmentList,
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
