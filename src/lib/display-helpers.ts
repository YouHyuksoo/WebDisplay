/**
 * @file display-helpers.ts
 * @description 디스플레이 화면에서 공통으로 사용하는 헬퍼 함수 모음.
 *
 * 초보자 가이드:
 * 1. 여러 디스플레이 화면(SMD, ASSY, KPI 등)에서 동일한 패턴으로 반복되는 함수를 모았다.
 * 2. `DEFAULT_ORG_ID` — 전체 프로젝트에서 사용하는 기본 조직 ID.
 * 3. `buildDisplayApiUrl` — screenId 기반으로 API URL을 생성한다.
 * 4. `getSelectedLines` — localStorage에서 선택된 라인 코드를 읽어 SWR 쿼리 파라미터로 사용.
 * 5. `getSelectedSensors` — localStorage에서 선택된 온습도 센서 코드를 읽어 쿼리 파라미터로 사용.
 * 6. 반환값 '%'는 "전체 선택"을 의미하며, API에서 와일드카드로 처리한다.
 */

import { SCREENS } from './screens';

/** 기본 조직 ID — 전체 프로젝트 공통 상수 */
export const DEFAULT_ORG_ID = '1';

/** 숫자를 천 단위 콤마 포맷으로 변환 (null/undefined → '-') */
export function fmtNum(val: number | null | undefined): string {
  if (val == null) return '-';
  return val.toLocaleString();
}

/**
 * screenId와 파라미터로 디스플레이 API URL을 생성한다.
 * @param screenId - 화면 ID (예: '24', '37')
 * @param params - 쿼리 파라미터 객체 (값은 미리 인코딩 필요 시 인코딩해서 전달)
 * @returns 완성된 API URL 문자열
 * @example
 *   buildDisplayApiUrl('21', { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(lines) })
 *   // → '/api/display/21?orgId=1&lines=S01%2CS02'
 *   buildDisplayApiUrl('31')
 *   // → '/api/display/31'
 */
export function buildDisplayApiUrl(screenId: string, params?: Record<string, string>): string {
  const pairs = params
    ? Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
    : '';
  return `/api/display/${screenId}${pairs ? `?${pairs}` : ''}`;
}

/** localStorage에서 선택된 항목 코드를 읽어오는 내부 공통 함수 */
function getSelectedFromStorage(prefix: string, screenId: string): string {
  try {
    const stored = localStorage.getItem(`${prefix}${screenId}`);
    if (stored) {
      const arr = JSON.parse(stored) as string[];
      if (arr.includes('%') || arr.length === 0) return '%';
      return arr.join(',');
    }
  } catch { /* 무시 */ }
  return '%';
}

/**
 * localStorage에서 선택된 라인 코드를 읽어온다.
 * 선택값이 없거나 '%'(전체)이면 '%'를 반환하고,
 * 개별 라인이 선택되어 있으면 콤마 구분 문자열을 반환한다.
 * @param screenId - 화면별 고유 ID (localStorage 키에 사용)
 * @returns 콤마 구분 라인 코드 문자열 또는 '%' (전체)
 */
export function getSelectedLines(screenId: string): string {
  return getSelectedFromStorage('display-lines-', screenId);
}

/**
 * 해당 화면에 라인 선택 저장값이 존재하는지 확인한다.
 * 최초 접속 시 라인 선택 팝업 자동 표시 여부를 판단하는 데 사용.
 * @param screenId - 화면별 고유 ID
 * @returns 저장값이 존재하면 true
 */
export function hasLineSelection(screenId: string): boolean {
  if (!SCREENS[screenId]?.lineFilter) return true;
  try {
    return localStorage.getItem(`display-lines-${screenId}`) !== null;
  } catch { return false; }
}

/**
 * localStorage에서 선택된 센서(온습도기) 코드를 읽어온다.
 * 선택값이 없거나 '%'(전체)이면 '%'를 반환하고,
 * 개별 센서가 선택되어 있으면 콤마 구분 문자열을 반환한다.
 * @param screenId - 화면별 고유 ID (localStorage 키에 사용)
 * @returns 콤마 구분 센서 코드 문자열 또는 '%' (전체)
 */
export function getSelectedSensors(screenId: string): string {
  return getSelectedFromStorage('display-sensors-', screenId);
}

/**
 * 픽업률 리스트에서 NG 건수를 계산 (ITEM_WARNING_SIGN='S' 행 수).
 * API route 34(BASE) / 35(HEAD) 공통 사용.
 */
/**
 * 픽업률 리스트에서 NG 건수를 계산 (ITEM_WARNING_SIGN='S' 행 수).
 * API route 34(BASE) / 35(HEAD) 공통 사용.
 */
export function countNgFromList(rows: { ITEM_WARNING_SIGN?: string | null; [key: string]: unknown }[]): number {
  return rows.filter((row) => row.ITEM_WARNING_SIGN === 'S').length;
}

/**
 * Oracle IN 절 바인드 변수 생성 (공통).
 * buildLineFilter / buildSensorFilter의 공통 로직을 추출.
 * @param items - 필터 대상 값 배열. '%' 또는 빈 배열이면 필터 없음(전체).
 * @param column - WHERE절에 사용할 컬럼명 (예: 'line_code', 'M.MACHINE_CODE')
 * @param bindPrefix - 바인드 변수 접두사 (예: 'line', 'mc')
 * @returns { clause: SQL WHERE 조각, binds: 바인드 객체 }
 */
export function buildInFilter(
  items: string[],
  column: string,
  bindPrefix: string,
): { clause: string; binds: Record<string, string> } {
  if (!items.length || items.includes('%')) {
    return { clause: '', binds: {} };
  }
  const placeholders = items.map((_, i) => `:${bindPrefix}${i}`);
  const binds: Record<string, string> = {};
  items.forEach((val, i) => { binds[`${bindPrefix}${i}`] = val; });
  return { clause: `AND ${column} IN (${placeholders.join(', ')})`, binds };
}
