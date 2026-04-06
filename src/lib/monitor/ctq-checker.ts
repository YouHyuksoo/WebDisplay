/**
 * @file src/lib/monitor/ctq-checker.ts
 * @description
 * CTQ 이상점 모니터링 — A등급 라인 조회 함수 모음.
 *
 * 초보자 가이드:
 * - 기존 API route들과 동일한 DB 쿼리를 사용하되, HTTP 없이 직접 호출
 * - 반환값은 A등급인 라인/공정 목록만 (B, OK 제외)
 * - getVietnamTimeRange(): 오늘 08:00 ~ 내일 08:00 (베트남 시간 기준)
 *
 * 라인 필터 정책:
 * - 모니터는 전체 라인을 대상으로 조회합니다 (라인 필터 없음).
 * - 특정 라인만 모니터링하려면 line-filter.ts의 parseLines/buildLineInClause 활용.
 *
 * 사용 중인 테이블:
 * - IQ_MACHINE_FT1_SMPS_DATA_RAW       : FT 검사이력
 * - IQ_MACHINE_ATE_SERVER_DATA_RAW     : ATE 검사이력
 * - IQ_MACHINE_HIPOT_POWER_DATA_RAW    : HIPOT 검사이력
 * - IQ_MACHINE_BURNIN_SMPS_DATA_RAW   : BURNIN 검사이력 (미사용 — QC 테이블 직접 조회)
 * - IP_PRODUCT_2D_BARCODE              : PID → 모델 정보
 * - IP_PRODUCT_WORK_QC                 : 수리 판정 내역
 * - IP_PRODUCT_LINE                    : 라인 이름
 */

import { executeQuery } from "@/lib/db";
import { getVietnamTimeRange } from "@/lib/ctq/line-filter";

// ─────────────────────────────────────────────────────────────────────────────
// 공통 인터페이스
// ─────────────────────────────────────────────────────────────────────────────

export interface AGradeItem {
  lineCode: string;
  lineName: string;
  process: string;
  ngCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 내부 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

interface RepeatLocationRow {
  LINE_CODE: string;
  MODEL_NAME: string;
  LOCATION_CODE: string;
  LOC_COUNT: number;
}

interface LineSummaryRow {
  LINE_CODE: string;
  NG_COUNT: number;
  JUDGED_COUNT: number;
  PENDING_COUNT: number;
  LAST_INSPECT: string;
}

interface LineNameRow {
  LINE_CODE: string;
  LINE_NAME: string;
}

/** LINE_CODE 목록으로 이름 Map 조회 */
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

// ─────────────────────────────────────────────────────────────────────────────
// 반복성(Repeatability) — FT / ATE 공정
// ─────────────────────────────────────────────────────────────────────────────

interface RepeatProcessConfig {
  table: string;
  pidCol: string;
  dateCol: string;
  resultCol: string;
  processLabel: string;
  extraWhere?: string;
}

const REPEAT_PROCESS_CONFIGS: RepeatProcessConfig[] = [
  {
    table: "IQ_MACHINE_FT1_SMPS_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    processLabel: "FT",
    extraWhere: "AND t.LAST_FLAG = 'Y'",
  },
  {
    table: "IQ_MACHINE_ATE_SERVER_DATA_RAW",
    pidCol: "PID",
    dateCol: "INSPECT_DATE",
    resultCol: "INSPECT_RESULT",
    processLabel: "ATE",
    extraWhere: "AND t.LAST_FLAG = 'Y'",
  },
];

/**
 * 공정별 동일 Location 연속불량 감지 (LAG 윈도우 함수)
 *
 * repeatability/route.ts 의 getRepeatLocations() SQL을 직접 재사용.
 * 시간순으로 정렬된 NG 레코드에서 연속 2건이 동일 Location이면 A급.
 */
async function getRepeatLocationsByProcess(
  config: RepeatProcessConfig,
  timeRange: { startStr: string; endStr: string }
): Promise<RepeatLocationRow[]> {
  const col = `t.${config.dateCol}`;
  // 현재 FT/ATE 모두 VARCHAR 타입 — DATE 타입 공정 추가 시 조건 분기 필요
  const condition = `${col} >= :tsStart AND ${col} < :tsEnd`;

  const sql = `
    SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE, COUNT(*) AS LOC_COUNT
    FROM (
      SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE
      FROM (
        SELECT base.LINE_CODE,
               base.MODEL_NAME,
               r.LOCATION_CODE,
               base.SORT_DATE,
               LAG(r.LOCATION_CODE) OVER (
                 PARTITION BY base.LINE_CODE, base.MODEL_NAME ORDER BY base.SORT_DATE
               ) AS PREV_LOC,
               LAG(base.SORT_DATE) OVER (
                 PARTITION BY base.LINE_CODE, base.MODEL_NAME ORDER BY base.SORT_DATE
               ) AS PREV_SORT_DATE
        FROM (
          SELECT t.LINE_CODE,
                 t.${config.pidCol} AS PID_VAL,
                 t.${config.dateCol} AS SORT_DATE,
                 F_GET_MODEL_NAME_BY_PID(t.${config.pidCol}) AS MODEL_NAME
          FROM ${config.table} t
          JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.${config.pidCol}
            AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
          WHERE ${condition}
            AND (t.${config.pidCol} LIKE 'VN07%' OR t.${config.pidCol} LIKE 'VNL1%' OR t.${config.pidCol} LIKE 'VNA2%')
            AND t.${config.resultCol} NOT IN ('PASS', 'GOOD', 'OK', 'Y')
            AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
            ${config.extraWhere ?? ""}
            AND t.LINE_CODE IS NOT NULL
        ) base
        JOIN (
          SELECT SERIAL_NO, LOCATION_CODE
          FROM (
            SELECT rr.SERIAL_NO, rr.LOCATION_CODE,
                   ROW_NUMBER() OVER (PARTITION BY rr.SERIAL_NO ORDER BY rr.QC_DATE DESC) AS RN
            FROM IP_PRODUCT_WORK_QC rr
            WHERE rr.RECEIPT_DEFICIT = '2'
              AND rr.QC_RESULT != 'O'
              AND rr.LOCATION_CODE IS NOT NULL
              AND rr.LOCATION_CODE <> '*'
          ) WHERE RN = 1
        ) r ON r.SERIAL_NO = base.PID_VAL
      ) sub
      WHERE sub.LOCATION_CODE = sub.PREV_LOC
        AND NOT EXISTS (
          SELECT 1 FROM ${config.table} t_chk
          WHERE t_chk.LINE_CODE = sub.LINE_CODE
            AND t_chk.${config.dateCol} > sub.PREV_SORT_DATE
            AND t_chk.${config.dateCol} < sub.SORT_DATE
            AND t_chk.${config.resultCol} IN ('PASS', 'GOOD', 'OK', 'Y')
            ${(config.extraWhere ?? "").replace(/t\./g, "t_chk.")}
        )
    )
    GROUP BY LINE_CODE, MODEL_NAME, LOCATION_CODE
  `;
  return executeQuery<RepeatLocationRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
  });
}

/**
 * 반복성 A등급 라인 조회
 *
 * FT, ATE 공정 각각 조회 후 A등급(연속 동일 Location 발생)만 반환.
 */
export async function checkRepeatabilityAGrade(): Promise<AGradeItem[]> {
  try {
    const timeRange = getVietnamTimeRange();

    // FT + ATE 병렬 조회
    const results = await Promise.all(
      REPEAT_PROCESS_CONFIGS.map((cfg) =>
        getRepeatLocationsByProcess(cfg, timeRange)
      )
    );

    const aGradeItems: AGradeItem[] = [];
    const allLineCodes = new Set<string>();

    // 라인 이름 조회용 코드 수집
    results.forEach((rows) => rows.forEach((r) => allLineCodes.add(r.LINE_CODE)));
    const lineNameMap = await getLineNames([...allLineCodes]);

    REPEAT_PROCESS_CONFIGS.forEach((cfg, i) => {
      // 라인별 최대 LOC_COUNT 집계 (같은 라인에 여러 항목이 있을 수 있음)
      const lineMaxMap = new Map<string, number>();
      for (const row of results[i]) {
        const existing = lineMaxMap.get(row.LINE_CODE) ?? 0;
        if (row.LOC_COUNT > existing) {
          lineMaxMap.set(row.LINE_CODE, row.LOC_COUNT);
        }
      }
      // 연속 동일 Location이 있는 라인 = A등급
      for (const [lineCode, locCount] of lineMaxMap.entries()) {
        aGradeItems.push({
          lineCode,
          lineName: lineNameMap.get(lineCode) || lineCode,
          process: cfg.processLabel,
          ngCount: locCount,
        });
      }
    });

    return aGradeItems;
  } catch (err) {
    console.error("[ctq-checker] checkRepeatabilityAGrade error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 사고성(Accident) — HIPOT / BURNIN / ATE 공정
// ─────────────────────────────────────────────────────────────────────────────

interface AccidentProcessConfig {
  processLabel: string;
  /** A등급 기준: 판정완료 건수 ≥ aThreshold */
  aThreshold: number;
}

const ACCIDENT_PROCESS_CONFIGS: AccidentProcessConfig[] = [
  { processLabel: "HIPOT", aThreshold: 1 },
  { processLabel: "BURNIN", aThreshold: 2 },
  { processLabel: "ATE", aThreshold: 2 },
];

/**
 * HIPOT 라인별 NG 집계 + 수리 판정 완료 건수 산출
 *
 * accident/route.ts getLineSummary() SQL 재사용.
 * - 테이블: IQ_MACHINE_HIPOT_POWER_DATA_RAW
 * - 판정완료: IP_PRODUCT_WORK_QC RECEIPT_DEFICIT='2', REPAIR_RESULT_CODE IS NOT NULL AND != '-'
 */
async function getHipotSummary(
  timeRange: { startStr: string; endStr: string }
): Promise<LineSummaryRow[]> {
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
           MAX(t.INSPECT_DATE) AS LAST_INSPECT
    FROM IQ_MACHINE_HIPOT_POWER_DATA_RAW t
    JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
      AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    LEFT JOIN IP_PRODUCT_WORK_QC r
      ON r.SERIAL_NO = t.PID
      AND r.RECEIPT_DEFICIT = '2'
      AND (r.QC_RESULT IS NULL OR r.QC_RESULT != 'O')
    WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
      AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
      AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
      AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
      AND t.LAST_FLAG = 'Y'
      AND t.LINE_CODE IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM IP_PRODUCT_WORK_QC q
        WHERE q.SERIAL_NO = t.PID AND q.RECEIPT_DEFICIT = '2' AND q.QC_RESULT = 'O'
      )
    GROUP BY t.LINE_CODE
  `;
  return executeQuery<LineSummaryRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
  });
}

/**
 * BURNIN 라인별 NG 집계 — IP_PRODUCT_WORK_QC 직접 조회
 *
 * accident/route.ts getBurninLineSummary() SQL 재사용.
 * - RAW 테이블 대신 QC 테이블의 RECEIPT_DEFICIT='1'(수리실 등록) 건 집계
 * - WORKSTAGE_CODE = 'W500'
 */
async function getBurninSummary(
  timeRange: { startStr: string; endStr: string }
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
    ) WHERE RN = 1
    GROUP BY LINE_CODE
  `;
  return executeQuery<LineSummaryRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
  });
}

/**
 * ATE 라인별 NG 집계 + 수리 판정 완료 건수 산출
 *
 * accident/route.ts getLineSummary(PROCESS_CONFIG.ATE) SQL 재사용.
 * - qcJoinExtra: BAD_PHENOMENON = 'P1000' 조건 추가
 */
async function getAteSummary(
  timeRange: { startStr: string; endStr: string }
): Promise<LineSummaryRow[]> {
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
           MAX(t.INSPECT_DATE) AS LAST_INSPECT
    FROM IQ_MACHINE_ATE_SERVER_DATA_RAW t
    JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
      AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    LEFT JOIN IP_PRODUCT_WORK_QC r
      ON r.SERIAL_NO = t.PID
      AND r.RECEIPT_DEFICIT = '2'
      AND (r.QC_RESULT IS NULL OR r.QC_RESULT != 'O')
      AND r.BAD_PHENOMENON = 'P1000'
    WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
      AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
      AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
      AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
      AND t.LAST_FLAG = 'Y'
      AND t.LINE_CODE IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM IP_PRODUCT_WORK_QC q
        WHERE q.SERIAL_NO = t.PID AND q.RECEIPT_DEFICIT = '2' AND q.QC_RESULT = 'O'
      )
    GROUP BY t.LINE_CODE
  `;
  return executeQuery<LineSummaryRow>(sql, {
    tsStart: timeRange.startStr,
    tsEnd: timeRange.endStr,
  });
}

/**
 * 사고성 A등급 라인 조회
 *
 * HIPOT / BURNIN / ATE 공정 각각 조회 후 A등급만 반환.
 * - HIPOT: JUDGED_COUNT >= 1 → A급
 * - BURNIN/ATE: JUDGED_COUNT >= 2 → A급
 *
 * B등급은 모니터링 대상 아님 (A등급 전환만 알림).
 * 향후 B등급 알림 추가 시 bThreshold 파라미터 추가 필요.
 */
export async function checkAccidentAGrade(): Promise<AGradeItem[]> {
  try {
    const timeRange = getVietnamTimeRange();

    // 3공정 병렬 조회
    const [hipotRows, burninRows, ateRows] = await Promise.all([
      getHipotSummary(timeRange),
      getBurninSummary(timeRange),
      getAteSummary(timeRange),
    ]);

    const allRows = [hipotRows, burninRows, ateRows];
    const allLineCodes = new Set<string>();
    allRows.forEach((rows) => rows.forEach((r) => allLineCodes.add(r.LINE_CODE)));
    const lineNameMap = await getLineNames([...allLineCodes]);

    const aGradeItems: AGradeItem[] = [];

    allRows.forEach((rows, i) => {
      const { processLabel, aThreshold } = ACCIDENT_PROCESS_CONFIGS[i];
      for (const row of rows) {
        if (row.JUDGED_COUNT >= aThreshold) {
          aGradeItems.push({
            lineCode: row.LINE_CODE,
            lineName: lineNameMap.get(row.LINE_CODE) || row.LINE_CODE,
            process: processLabel,
            ngCount: row.JUDGED_COUNT,
          });
        }
      }
    });

    return aGradeItems;
  } catch (err) {
    console.error("[ctq-checker] checkAccidentAGrade error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 비연속성(Non-Consecutive) — A등급 없음
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 비연속성 A등급 라인 조회
 *
 * 비연속성 판정에는 A등급이 없음 (B급만 존재).
 * DB 조회 없이 빈 배열 반환.
 */
export function checkNonConsecutiveAGrade(): Promise<AGradeItem[]> {
  return Promise.resolve([]);
}
