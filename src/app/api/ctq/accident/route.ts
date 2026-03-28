/**
 * @file src/app/api/ctq/accident/route.ts
 * @description CTQ 사고성 모니터링 API
 *
 * 초보자 가이드:
 * 1. **대상 공정**: HIPOT, BURNIN, ATE
 * 2. **판정 기준** (수리 판정 완료 건만 등급 산정):
 *    - HIPOT: 판정완료 1건+ → A급 (사고성 높음)
 *    - BURNIN/ATE: 판정완료 2건+ → A급, 1건 → B급
 *    - 수리등록 후 미판정 건은 NG로만 표시 (등급 미반영)
 * 3. **BURNIN 특수 처리**: 검사이력(RAW) 대신 IP_PRODUCT_WORK_QC 테이블에서
 *    RECEIPT_DEFICIT='1'(수리실 등록) 건을 PID별 마지막 이력 기준으로 불량 집계
 * 4. **매일 08:00 ~ 다음날 08:00** 하루치만 대상
 * 5. **QC_CONFIRM_YN='Y' 제외** (이미 확인된 건 제외)
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause, getVietnamTimeRange } from "@/lib/ctq/line-filter";
import type {
  AccidentProcessType,
  AccidentProcessStatus,
  AccidentLineCardData,
  AccidentGrade,
} from "@/types/ctq/accident";

export const dynamic = "force-dynamic";

interface ProcessConfig {
  table: string;
  pidCol: string;
  dateCol: string;
  resultCol: string;
  dateType: "varchar";
  aThreshold: number;
  bThreshold: number;
  /** IP_PRODUCT_WORK_QC JOIN 시 추가 조건 (예: ATE의 BAD_PHENOMENON 필터) */
  qcJoinExtra?: string;
}

const PROCESS_CONFIG: Record<AccidentProcessType, ProcessConfig> = {
  HIPOT: {
    table: "IQ_MACHINE_HIPOT_POWER_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    dateType: "varchar",
    aThreshold: 1,
    bThreshold: 0,
  },
  BURNIN: {
    table: "IQ_MACHINE_BURNIN_SMPS_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    dateType: "varchar",
    aThreshold: 2,
    bThreshold: 1,
  },
  ATE: {
    table: "IQ_MACHINE_ATE_SERVER_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    dateType: "varchar",
    aThreshold: 2,
    bThreshold: 1,
    qcJoinExtra: "AND r.BAD_PHENOMENON = 'P1000'",
  },
};

const PROCESS_LABELS: Record<AccidentProcessType, string> = {
  HIPOT: "HI-POT",
  BURNIN: "BURN-IN",
  ATE: "ATE",
};

const PROCESS_TYPES: AccidentProcessType[] = ["HIPOT", "BURNIN", "ATE"];

interface LineSummaryRow {
  LINE_CODE: string;
  NG_COUNT: number;
  /** 수리 판정 완료 건수 */
  JUDGED_COUNT: number;
  /** 수리 등록됐지만 미판정 건수 */
  PENDING_COUNT: number;
  LAST_INSPECT: string;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

interface NgDetailRow {
  LINE_CODE: string;
  INSPECT_TIME: string;
  PID: string;
  MODEL_NAME: string;
  RECEIPT_DEFICIT: string;
  LOCATION_CODE: string;
  REPAIR_RESULT_CODE: string;
  QC_INSPECT_HANDLING: string;
  DEFECT_ITEM_CODE: string;
}

/**
 * LINE별 NG 건수 집계 + 수리 판정 상태 분류
 * - NG_COUNT: 전체 NG 건수
 * - JUDGED_COUNT: 수리 등록 + 판정 완료 건수 (등급 산정 기준)
 * - PENDING_COUNT: 수리 등록됐지만 미판정 건수
 */
async function getLineSummary(
  config: ProcessConfig,
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<LineSummaryRow[]> {
  const col = `t.${config.dateCol}`;
  const condition = `${col} >= :tsStart AND ${col} < :tsEnd`;

  const sql = `
    SELECT t.LINE_CODE,
           COUNT(*) AS NG_COUNT,
           COUNT(CASE WHEN r.RECEIPT_DEFICIT = '2'
                       AND r.REPAIR_RESULT_CODE IS NOT NULL
                       AND r.REPAIR_RESULT_CODE <> '-'
                      THEN 1 END) AS JUDGED_COUNT,
           COUNT(CASE WHEN r.RECEIPT_DEFICIT = '2'
                       AND (r.REPAIR_RESULT_CODE IS NULL OR r.REPAIR_RESULT_CODE = '-')
                      THEN 1 END) AS PENDING_COUNT,
           MAX(t.${config.dateCol}) AS LAST_INSPECT
    FROM ${config.table} t
    JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
      AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    LEFT JOIN IP_PRODUCT_WORK_QC r
      ON r.SERIAL_NO = t.${config.pidCol}
      AND r.RECEIPT_DEFICIT = '2'
      AND (r.QC_RESULT IS NULL OR r.QC_RESULT != 'O')
      ${config.qcJoinExtra ?? ""}
    WHERE ${condition}
      AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
      AND t.${config.resultCol} NOT IN ('PASS', 'GOOD', 'OK', 'Y')
      AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN <> 'Y')
      AND t.LAST_FLAG = 'Y'
      AND t.LINE_CODE IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM IP_PRODUCT_WORK_QC q
        WHERE q.SERIAL_NO = t.${config.pidCol} AND q.RECEIPT_DEFICIT = '2' AND q.QC_RESULT = 'O'
      )
      ${lineFilter.clause}
    GROUP BY t.LINE_CODE
  `;
  return executeQuery<LineSummaryRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
    ...lineFilter.params,
  });
}

/**
 * BURNIN 전용 — IP_PRODUCT_WORK_QC 에서 RECEIPT_DEFICIT='1'(수리실 등록) 건 집계
 * 검사이력(RAW) 대신 QC 테이블을 직접 조회하며, PID별 마지막 이력만 대상
 */
async function getBurninLineSummary(
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<LineSummaryRow[]> {
  const sql = `
    SELECT LINE_CODE,
           COUNT(*) AS NG_COUNT,
           COUNT(CASE WHEN REPAIR_RESULT_CODE IS NOT NULL
                       AND REPAIR_RESULT_CODE <> '-'
                      THEN 1 END) AS JUDGED_COUNT,
           COUNT(CASE WHEN REPAIR_RESULT_CODE IS NULL
                        OR REPAIR_RESULT_CODE = '-'
                      THEN 1 END) AS PENDING_COUNT,
           MAX(QC_DATE_STR) AS LAST_INSPECT
    FROM (
      SELECT t.LINE_CODE,
             TO_CHAR(t.QC_DATE, 'YYYYMMDDHH24MISS') AS QC_DATE_STR,
             t.REPAIR_RESULT_CODE,
             ROW_NUMBER() OVER (PARTITION BY t.SERIAL_NO ORDER BY t.QC_DATE DESC) AS RN
      FROM IP_PRODUCT_WORK_QC t
      WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
        AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
        AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
        AND t.RECEIPT_DEFICIT = '1'
        AND t.WORKSTAGE_CODE = 'W500'
        AND t.LINE_CODE IS NOT NULL
        AND (t.QC_RESULT IS NULL OR t.QC_RESULT != 'O')
        ${lineFilter.clause}
    ) WHERE RN = 1
    GROUP BY LINE_CODE
  `;
  return executeQuery<LineSummaryRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
    ...lineFilter.params,
  });
}

/** BURNIN 전용 — NG 상세 (PID별 마지막 이력, 라인별 최근 5건) */
async function getBurninNgDetails(
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<NgDetailRow[]> {
  const sql = `
    SELECT LINE_CODE, INSPECT_TIME, PID, MODEL_NAME,
           RECEIPT_DEFICIT, LOCATION_CODE, REPAIR_RESULT_CODE,
           QC_INSPECT_HANDLING, DEFECT_ITEM_CODE
    FROM (
      SELECT sub.*,
             ROW_NUMBER() OVER (PARTITION BY sub.LINE_CODE ORDER BY sub.INSPECT_TIME DESC) AS RN2
      FROM (
        SELECT t.LINE_CODE,
               TO_CHAR(t.QC_DATE, 'YYYYMMDDHH24MISS') AS INSPECT_TIME,
               t.SERIAL_NO AS PID,
               NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
               NVL(t.RECEIPT_DEFICIT, '-') AS RECEIPT_DEFICIT,
               NVL(t.LOCATION_CODE, '-') AS LOCATION_CODE,
               NVL(t.REPAIR_RESULT_CODE, '-') AS REPAIR_RESULT_CODE,
               NVL(t.QC_INSPECT_HANDLING, '-') AS QC_INSPECT_HANDLING,
               NVL(t.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
               ROW_NUMBER() OVER (PARTITION BY t.SERIAL_NO ORDER BY t.QC_DATE DESC) AS RN
        FROM IP_PRODUCT_WORK_QC t
        WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
          AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
          AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
          AND t.RECEIPT_DEFICIT = '1'
          AND t.WORKSTAGE_CODE = 'W500'
          AND t.LINE_CODE IS NOT NULL
          AND (t.QC_RESULT IS NULL OR t.QC_RESULT != 'O')
          ${lineFilter.clause}
      ) sub WHERE sub.RN = 1
    ) WHERE RN2 <= 5
  `;
  return executeQuery<NgDetailRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
    ...lineFilter.params,
  });
}

/** 공정별 NG 상세 (최근 5건, 툴팁용) */
async function getNgDetails(
  config: ProcessConfig,
  timeRange: { startStr: string; endStr: string },
  lineFilter: { clause: string; params: Record<string, string> }
): Promise<NgDetailRow[]> {
  const col = `t.${config.dateCol}`;
  const condition = `${col} >= :tsStart AND ${col} < :tsEnd`;

  const sql = `
    SELECT LINE_CODE, INSPECT_TIME, PID, MODEL_NAME,
           RECEIPT_DEFICIT, LOCATION_CODE, REPAIR_RESULT_CODE, QC_INSPECT_HANDLING, DEFECT_ITEM_CODE
    FROM (
      SELECT t.LINE_CODE,
             t.${config.dateCol} AS INSPECT_TIME,
             t.${config.pidCol} AS PID,
             NVL(r.MODEL_NAME, '-') AS MODEL_NAME,
             NVL(r.RECEIPT_DEFICIT, '-') AS RECEIPT_DEFICIT,
             NVL(r.LOCATION_CODE, '-') AS LOCATION_CODE,
             NVL(r.REPAIR_RESULT_CODE, '-') AS REPAIR_RESULT_CODE,
             NVL(r.QC_INSPECT_HANDLING, '-') AS QC_INSPECT_HANDLING,
             NVL(r.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
             ROW_NUMBER() OVER (PARTITION BY t.LINE_CODE ORDER BY t.${config.dateCol} DESC) AS RN
      FROM ${config.table} t
      JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
        AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
      LEFT JOIN IP_PRODUCT_WORK_QC r
        ON r.SERIAL_NO = t.${config.pidCol}
        AND r.RECEIPT_DEFICIT = '2'
        AND (r.QC_RESULT IS NULL OR r.QC_RESULT != 'O')
        ${config.qcJoinExtra ?? ""}
      WHERE ${condition}
        AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
        AND t.${config.resultCol} NOT IN ('PASS', 'GOOD', 'OK', 'Y')
        AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN <> 'Y')
        AND t.LAST_FLAG = 'Y'
        AND t.LINE_CODE IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM IP_PRODUCT_WORK_QC q
          WHERE q.SERIAL_NO = t.${config.pidCol} AND q.RECEIPT_DEFICIT = '2' AND q.QC_RESULT = 'O'
        )
        ${lineFilter.clause}
    ) WHERE RN <= 5
  `;
  return executeQuery<NgDetailRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
    ...lineFilter.params,
  });
}

/** LINE_CODE 이름 조회 */
async function getLineNames(lineCodes: string[]): Promise<Map<string, string>> {
  if (lineCodes.length === 0) return new Map();
  const placeholders = lineCodes.map((_, i) => `:lc${i}`).join(",");
  const sql = `
    SELECT LINE_CODE, LINE_NAME
    FROM IP_PRODUCT_LINE
    WHERE LINE_CODE IN (${placeholders})
  `;
  const params: Record<string, string> = {};
  lineCodes.forEach((code, i) => {
    params[`lc${i}`] = code;
  });
  const rows = await executeQuery<LineNameRow>(sql, params);
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(r.LINE_CODE, r.LINE_NAME));
  return map;
}

/** 수리 판정 완료 건수 → 등급 판정 (미판정 건은 등급에 반영하지 않음) */
function determineGrade(judgedCount: number, config: ProcessConfig): AccidentGrade {
  if (judgedCount >= config.aThreshold) return "A";
  if (config.bThreshold > 0 && judgedCount >= config.bThreshold) return "B";
  return "OK";
}

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");
    const timeRange = getVietnamTimeRange();

    /* 1. 3공정 병렬 쿼리 */
    const [summaries, ngDetails] = await Promise.all([
      Promise.all(PROCESS_TYPES.map((pt) =>
        pt === "BURNIN"
          ? getBurninLineSummary(timeRange, lineFilter)
          : getLineSummary(PROCESS_CONFIG[pt], timeRange, lineFilter)
      )),
      Promise.all(PROCESS_TYPES.map((pt) =>
        pt === "BURNIN"
          ? getBurninNgDetails(timeRange, lineFilter)
          : getNgDetails(PROCESS_CONFIG[pt], timeRange, lineFilter)
      )),
    ]);

    /* 2. Map 변환 */
    const summaryByProcess = new Map<AccidentProcessType, Map<string, LineSummaryRow>>();
    const allLineCodes = new Set<string>();

    PROCESS_TYPES.forEach((pt, i) => {
      const sMap = new Map<string, LineSummaryRow>();
      for (const row of summaries[i]) {
        sMap.set(row.LINE_CODE, row);
        allLineCodes.add(row.LINE_CODE);
      }
      summaryByProcess.set(pt, sMap);
    });

    const detailsByProcess = new Map<AccidentProcessType, Map<string, NgDetailRow[]>>();

    PROCESS_TYPES.forEach((pt, i) => {
      const dMap = new Map<string, NgDetailRow[]>();
      for (const row of ngDetails[i]) {
        if (!dMap.has(row.LINE_CODE)) dMap.set(row.LINE_CODE, []);
        dMap.get(row.LINE_CODE)!.push(row);
      }
      detailsByProcess.set(pt, dMap);
    });

    /* 3. 선택된 라인도 포함 (0건이어도 카드 표시) */
    for (const lc of lines) allLineCodes.add(lc);
    const sortedLineCodes = [...allLineCodes].sort();
    const lineNameMap = await getLineNames(sortedLineCodes);

    /* 4. 라인별 카드 데이터 생성 */
    const lineCards: AccidentLineCardData[] = [];

    for (const lineCode of sortedLineCodes) {
      const processes: AccidentProcessStatus[] = [];
      let overallGrade: AccidentGrade = "OK";

      for (const pt of PROCESS_TYPES) {
        const summary = summaryByProcess.get(pt)?.get(lineCode);
        const ngCount = summary?.NG_COUNT ?? 0;
        const judgedCount = summary?.JUDGED_COUNT ?? 0;
        const pendingCount = summary?.PENDING_COUNT ?? 0;
        const grade = determineGrade(judgedCount, PROCESS_CONFIG[pt]);

        let detail: string | null = null;
        if (grade === "A") {
          detail = `NG:${judgedCount}(A)`;
        } else if (grade === "B") {
          detail = `NG:${judgedCount}(B)`;
        }

        const details = detailsByProcess.get(pt)?.get(lineCode) ?? [];
        processes.push({
          process: pt,
          processLabel: PROCESS_LABELS[pt],
          grade,
          ngCount,
          judgedCount,
          pendingCount,
          detail,
          lastInspectDate: summary?.LAST_INSPECT ?? null,
          ngDetails: details.map((d) => ({
            time: d.INSPECT_TIME,
            pid: d.PID,
            model: d.MODEL_NAME,
            receiptDeficit: d.RECEIPT_DEFICIT,
            locationCode: d.LOCATION_CODE,
            repairResult: d.REPAIR_RESULT_CODE,
            qcHandling: d.QC_INSPECT_HANDLING,
            defectItem: d.DEFECT_ITEM_CODE,
          })),
        });

        if (grade === "A" && overallGrade !== "A") overallGrade = "A";
        if (grade === "B" && overallGrade === "OK") overallGrade = "B";
      }

      lineCards.push({
        lineCode,
        lineName: lineNameMap.get(lineCode) || lineCode,
        processes,
        overallGrade,
      });
    }

    /* 등급순 정렬: A → B → OK */
    lineCards.sort((a, b) => {
      const order: Record<AccidentGrade, number> = { A: 0, B: 1, OK: 2 };
      return order[a.overallGrade] - order[b.overallGrade];
    });

    return NextResponse.json({
      lines: lineCards,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Accident API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
