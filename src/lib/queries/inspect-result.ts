/**
 * @file src/lib/queries/inspect-result.ts
 * @description IQ_MACHINE_INSPECT_RESULT 테이블 조회 SQL 쿼리 모듈 (멕시코전장).
 * 초보자 가이드: 설비호출저장이력을 날짜 범위/키워드로 검색하는 SQL을 생성한다.
 *
 * 실제 테이블 컬럼:
 *   PID (VARCHAR2 200)            - 제품 ID
 *   INSPECT_RESULT (VARCHAR2 200) - 검사 결과
 *   INSPECT_DATE (VARCHAR2 200)   - 검사일시 (문자열)
 *   ENTER_DATE (DATE)             - 등록일
 *   LINE_CODE (VARCHAR2 10)       - 라인 코드
 *   MACHINE_CODE (VARCHAR2 30)    - 머신 코드
 *   TXN_TYPE (VARCHAR2 30)        - 트랜잭션 유형
 *   IS_LAST (VARCHAR2 1)          - 최종 여부
 *   IS_SAMPLE (VARCHAR2 20)       - 샘플 여부
 */

/** 검색 결과 행 타입 */
export interface InspectResultRow {
  RNUM: number;
  PID: string | null;
  INSPECT_RESULT: string | null;
  INSPECT_DATE: string | null;
  ENTER_DATE: string | null;
  LINE_CODE: string | null;
  MACHINE_CODE: string | null;
  TXN_TYPE: string | null;
  IS_LAST: string | null;
}

/** 필터 옵션 타입 */
export interface FilterOption {
  value: string;
  label: string;
}

export interface InspectResultFilters {
  lineCodeList: FilterOption[];
  machineCodeList: FilterOption[];
}

/** 키워드 검색 WHERE 절 */
export function buildKeywordClause(keyword?: string): {
  clause: string;
  binds: Record<string, string>;
} {
  if (!keyword || keyword.trim() === '') {
    return { clause: '', binds: {} };
  }
  const clause = `AND (
    UPPER(T.PID) LIKE UPPER(:kw)
    OR UPPER(T.INSPECT_RESULT) LIKE UPPER(:kw)
    OR UPPER(T.LINE_CODE) LIKE UPPER(:kw)
    OR UPPER(T.MACHINE_CODE) LIKE UPPER(:kw)
    OR UPPER(T.TXN_TYPE) LIKE UPPER(:kw)
    OR UPPER(B.MODEL_NAME) LIKE UPPER(:kw)
    OR UPPER(B.RUN_NO) LIKE UPPER(:kw)
  )`;
  return { clause, binds: { kw: `%${keyword.trim()}%` } };
}

/** 콤마 구분 값을 IN 절로 변환 */
function buildInClause(col: string, values: string, prefix: string): { clause: string; binds: Record<string, string> } {
  const arr = values.split(",").map(v => v.trim()).filter(Boolean);
  if (arr.length === 0) return { clause: "", binds: {} };
  const placeholders = arr.map((_, i) => `:${prefix}${i}`);
  const binds: Record<string, string> = {};
  arr.forEach((v, i) => { binds[`${prefix}${i}`] = v; });
  return { clause: ` AND ${col} IN (${placeholders.join(",")})`, binds };
}

/** 개별 필터 WHERE 절 (다중선택: 콤마 구분) */
export function buildColumnFilters(filters: {
  lineCode?: string;
  machineCode?: string;
  isLast?: string;
}): { clause: string; binds: Record<string, string> } {
  let clause = '';
  let binds: Record<string, string> = {};

  if (filters.lineCode) {
    const r = buildInClause("T.LINE_CODE", filters.lineCode, "fl");
    clause += r.clause;
    binds = { ...binds, ...r.binds };
  }
  if (filters.machineCode) {
    const r = buildInClause("T.MACHINE_CODE", filters.machineCode, "fm");
    clause += r.clause;
    binds = { ...binds, ...r.binds };
  }
  if (filters.isLast) {
    clause += ' AND T.IS_LAST = :filterIsLast';
    binds.filterIsLast = filters.isLast;
  }

  return { clause, binds };
}

/** 전체 건수 SQL */
export function sqlInspectResultCount(extraClause: string): string {
  return `
    SELECT COUNT(*) AS TOTAL_COUNT
    FROM IQ_MACHINE_INSPECT_RESULT T
    LEFT JOIN IP_PRODUCT_2D_BARCODE B ON B.SERIAL_NO = T.PID
    LEFT JOIN IP_PRODUCT_ROUTING_MODEL R ON R.MODEL_NAME = B.MODEL_NAME AND R.WORKSTAGE_CODE = T.WORKSTAGE_CODE AND R.ORGANIZATION_ID = 1
    WHERE T.INSPECT_DATE BETWEEN :fromDate || ' 00:00:00' AND :toDate || ' 23:59:59'
    ${extraClause}
  `;
}

/** 정렬 가능 컬럼 → SQL 매핑 */
const SORT_MAP: Record<string, string> = {
  INSPECT_DATE: 'T.INSPECT_DATE',
  LINE_CODE: 'T.LINE_CODE',
  MACHINE_CODE: 'T.MACHINE_CODE',
  PID: 'T.PID',
  INSPECT_RESULT: 'T.INSPECT_RESULT',
  TXN_TYPE: 'T.TXN_TYPE',
  ENTER_DATE: 'T.ENTER_DATE',
  RUN_NO: 'B.RUN_NO',
  MODEL_NAME: 'B.MODEL_NAME',
  MODEL_CODE: 'B.MODEL_CODE',
  MASTER_MODEL_NAME: 'B.MASTER_MODEL_NAME',
  PCB_ITEM: 'B.PCB_ITEM',
  WORKSTAGE_CODE: 'T.WORKSTAGE_CODE',
  PRE_WORKSTAGE_CODE: 'R.PRE_WORKSTAGE_CODE',
};

/** 데이터 목록 SQL (페이지네이션 + 정렬) */
export function sqlInspectResultList(
  extraClause: string,
  sortCol = 'INSPECT_DATE',
  sortDir: 'ASC' | 'DESC' = 'DESC',
): string {
  const orderExpr = SORT_MAP[sortCol] ?? 'T.INSPECT_DATE';
  return `
    SELECT * FROM (
      SELECT A.*, ROWNUM AS RNUM FROM (
        SELECT
          T.INSPECT_DATE,
          T.LINE_CODE,
          T.MACHINE_CODE,
          T.PID,
          T.INSPECT_RESULT,
          T.TXN_TYPE,
          TO_CHAR(T.ENTER_DATE, 'YYYY-MM-DD HH24:MI:SS') AS ENTER_DATE,
          T.IS_LAST,
          T.WORKSTAGE_CODE,
          B.RUN_NO,
          B.PCB_ITEM,
          B.MODEL_NAME,
          B.MODEL_CODE,
          B.MASTER_MODEL_NAME,
          R.PRE_WORKSTAGE_CODE
        FROM IQ_MACHINE_INSPECT_RESULT T
        LEFT JOIN IP_PRODUCT_2D_BARCODE B ON B.SERIAL_NO = T.PID
        LEFT JOIN IP_PRODUCT_ROUTING_MODEL R ON R.MODEL_NAME = B.MODEL_NAME AND R.WORKSTAGE_CODE = T.WORKSTAGE_CODE AND R.ORGANIZATION_ID = 1
        WHERE T.INSPECT_DATE BETWEEN :fromDate || ' 00:00:00' AND :toDate || ' 23:59:59'
        ${extraClause}
        ORDER BY ${orderExpr} ${sortDir}
      ) A
      WHERE ROWNUM <= :endRow
    )
    WHERE RNUM > :startRow
  `;
}

/** 필터 옵션 SQL (LINE_CODE, MACHINE_CODE 고유값) */
export function sqlFilterOptions(): string {
  return `
    SELECT COL_TYPE, COL_VALUE, COL_LABEL FROM (
      SELECT 'LINE_CODE' AS COL_TYPE, LINE_CODE AS COL_VALUE, LINE_CODE AS COL_LABEL
      FROM IQ_MACHINE_INSPECT_RESULT
      WHERE INSPECT_DATE >= TO_CHAR(SYSDATE - 7, 'YYYY/MM/DD') || ' 00:00:00'
        AND LINE_CODE IS NOT NULL
      GROUP BY LINE_CODE
      UNION ALL
      SELECT 'MACHINE_CODE', MACHINE_CODE, MACHINE_CODE
      FROM IQ_MACHINE_INSPECT_RESULT
      WHERE INSPECT_DATE >= TO_CHAR(SYSDATE - 7, 'YYYY/MM/DD') || ' 00:00:00'
        AND MACHINE_CODE IS NOT NULL
      GROUP BY MACHINE_CODE
    )
    ORDER BY COL_TYPE, COL_VALUE
  `;
}
