/**
 * @file equipment-log.ts
 * @description ICOM_WEB_SERVICE_LOG 테이블 조회 SQL 쿼리 모듈 (SVEHICLEPDB).
 * 초보자 가이드: 설비 통신 로그를 날짜 범위/키워드/개별 필터로 검색하는 SQL을 생성한다.
 * 서버사이드 페이지네이션을 위해 COUNT 쿼리와 데이터 쿼리를 분리 제공.
 *
 * 실제 테이블 컬럼:
 *   ADDR (VARCHAR2 100)        - 호출 대상 (예: MOBIS)
 *   REQ (VARCHAR2 4000)        - 요청 데이터
 *   CALL_DATE (DATE)           - 호출 일시
 *   LINE_CODE (VARCHAR2 20)    - 라인 코드
 *   WORKSTAGE_CODE (VARCHAR2 20) - 공정 코드
 *   RETURN (VARCHAR2 4000)     - 응답 데이터
 */

/** 로그 검색 결과 행 타입 */
export interface EquipmentLogRow {
  RNUM: number;
  ADDR: string | null;
  REQ: string | null;
  CALL_DATE: string | null;
  LINE_CODE: string | null;
  LINE_NAME: string | null;
  WORKSTAGE_CODE: string | null;
  WORKSTAGE_NAME: string | null;
  RETURN: string | null;
}

/** 필터 옵션(고유값) 타입 */
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  addrList: FilterOption[];
  lineCodeList: FilterOption[];
}

/**
 * 키워드 검색 WHERE 절을 생성한다.
 * ADDR, REQ, LINE_CODE, WORKSTAGE_CODE, RETURN 컬럼을 OR로 검색.
 */
export function buildKeywordClause(keyword?: string): {
  clause: string;
  binds: Record<string, string>;
} {
  if (!keyword || keyword.trim() === '') {
    return { clause: '', binds: {} };
  }
  const clause = `AND (
    UPPER(L.ADDR) LIKE UPPER(:kw)
    OR UPPER(L.REQ) LIKE UPPER(:kw)
    OR UPPER(L.LINE_CODE) LIKE UPPER(:kw)
    OR UPPER(L.WORKSTAGE_CODE) LIKE UPPER(:kw)
    OR UPPER(L."RETURN") LIKE UPPER(:kw)
  )`;
  return { clause, binds: { kw: `%${keyword.trim()}%` } };
}

/**
 * 개별 필터(ADDR, LINE_CODE, WORKSTAGE_CODE) WHERE 절을 생성한다.
 * 각 필터 값이 비어있으면 해당 조건을 건너뛴다.
 */
export function buildColumnFilters(filters: {
  addr?: string;
  lineCode?: string;
  workstageCode?: string;
}): { clause: string; binds: Record<string, string> } {
  let clause = '';
  const binds: Record<string, string> = {};

  if (filters.addr) {
    clause += ' AND L.ADDR = :filterAddr';
    binds.filterAddr = filters.addr;
  }
  if (filters.lineCode) {
    clause += ' AND L.LINE_CODE = :filterLine';
    binds.filterLine = filters.lineCode;
  }
  if (filters.workstageCode) {
    clause += ' AND L.WORKSTAGE_CODE = :filterStage';
    binds.filterStage = filters.workstageCode;
  }

  return { clause, binds };
}

/**
 * 로그 전체 건수 조회 SQL (페이지네이션용).
 * @param extraClause - 키워드 + 개별 필터 WHERE 절
 */
export function sqlEquipmentLogCount(extraClause: string): string {
  return `
    SELECT COUNT(*) AS TOTAL_COUNT
    FROM ICOM_WEB_SERVICE_LOG L
    WHERE L.CALL_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD') AND TO_DATE(:toDate, 'YYYY-MM-DD') + 1
    ${extraClause}
  `;
}

/** 정렬 가능한 컬럼 → 실제 SQL 컬럼 매핑 (SQL 인젝션 방지) */
const SORT_COLUMN_MAP: Record<string, string> = {
  CALL_DATE: 'CALL_DATE',
  ADDR: 'L.ADDR',
  LINE_CODE: 'L.LINE_CODE',
  LINE_NAME: 'P.LINE_NAME',
  WORKSTAGE_CODE: 'L.WORKSTAGE_CODE',
  WORKSTAGE_NAME: 'F_GET_WORKSTAGE_NAME(L.WORKSTAGE_CODE)',
  REQ: 'L.REQ',
  RETURN: 'L."RETURN"',
};

/** 정렬 조건 배열 → ORDER BY 절 생성 (SQL 인젝션 방지) */
export function buildOrderByClause(
  sorts: { col: string; dir: 'ASC' | 'DESC' }[],
): string {
  if (sorts.length === 0) return 'CALL_DATE DESC';
  return sorts
    .map((s) => `${SORT_COLUMN_MAP[s.col] ?? 'CALL_DATE'} ${s.dir}`)
    .join(', ');
}

/**
 * 로그 목록 조회 SQL (페이지네이션 + 멀티 정렬 적용).
 * @param extraClause - 키워드 + 개별 필터 WHERE 절
 * @param sorts - 정렬 조건 배열 (멀티 정렬 지원)
 */
export function sqlEquipmentLogList(
  extraClause: string,
  sorts: { col: string; dir: 'ASC' | 'DESC' }[] = [{ col: 'CALL_DATE', dir: 'DESC' }],
): string {
  const orderBy = buildOrderByClause(sorts);
  return `
    SELECT * FROM (
      SELECT A.*, ROWNUM AS RNUM FROM (
        SELECT
          L.ADDR,
          L.REQ,
          TO_CHAR(L.CALL_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CALL_DATE,
          L.LINE_CODE,
          P.LINE_NAME,
          L.WORKSTAGE_CODE,
          NVL(F_GET_WORKSTAGE_NAME(L.WORKSTAGE_CODE), L.WORKSTAGE_CODE) AS WORKSTAGE_NAME,
          L."RETURN"
        FROM ICOM_WEB_SERVICE_LOG L
        LEFT JOIN IP_PRODUCT_LINE P ON P.LINE_CODE = L.LINE_CODE AND P.ORGANIZATION_ID = 1
        WHERE L.CALL_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD') AND TO_DATE(:toDate, 'YYYY-MM-DD') + 1
        ${extraClause}
        ORDER BY ${orderBy}
      ) A
      WHERE ROWNUM <= :endRow
    )
    WHERE RNUM > :startRow
  `;
}

/** ADDR(로그), LINE_CODE(마스터+라인명), WORKSTAGE_CODE(로그 DISTINCT) 고유값 SQL */
export function sqlFilterOptions(): string {
  return `
    SELECT COL_TYPE, COL_VALUE, COL_LABEL FROM (
      SELECT 'ADDR' AS COL_TYPE, ADDR AS COL_VALUE, ADDR AS COL_LABEL
      FROM ICOM_WEB_SERVICE_LOG WHERE ADDR IS NOT NULL
      GROUP BY ADDR
      UNION ALL
      SELECT 'LINE_CODE', L.LINE_CODE, L.LINE_CODE || ' - ' || L.LINE_NAME
      FROM IP_PRODUCT_LINE L
      WHERE L.ORGANIZATION_ID = 1 AND L.LINE_CODE != '*'
    )
    ORDER BY COL_TYPE, COL_VALUE
  `;
}
