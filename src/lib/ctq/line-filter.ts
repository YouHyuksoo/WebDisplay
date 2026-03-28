/**
 * @file src/lib/ctq/line-filter.ts
 * @description 라인 필터 SQL 조건 생성 + 베트남 시간대 유틸
 *
 * 초보자 가이드:
 * 1. **parseLines**: URL query에서 라인 코드 배열 파싱
 * 2. **buildLineInClause**: IN 조건 SQL + bind params 생성
 * 3. **getVietnamTimeRange**: 베트남(UTC+7) 기준 08:00~08:00 시프트 시간 범위
 */

import { type NextRequest } from "next/server";

/** URL query parameter에서 라인 코드 배열 파싱 */
export function parseLines(request: NextRequest): string[] {
  const linesParam = request.nextUrl.searchParams.get("lines");
  if (!linesParam) return [];
  return linesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * LINE_CODE IN (...) 조건 + bind params 생성
 * @param lines - 라인 코드 배열
 * @param alias - SQL 테이블 별칭 (기본 "t")
 * @param prefix - bind 파라미터 접두사 (기본 "ln")
 * @returns { clause, params } — clause가 빈 문자열이면 필터 없음
 */
export function buildLineInClause(
  lines: string[],
  alias: string = "t",
  prefix: string = "ln"
): { clause: string; params: Record<string, string> } {
  if (lines.length === 0) return { clause: "", params: {} };

  const placeholders = lines.map((_, i) => `:${prefix}${i}`).join(",");
  const params: Record<string, string> = {};
  lines.forEach((code, i) => {
    params[`${prefix}${i}`] = code;
  });

  return {
    clause: `AND ${alias}.LINE_CODE IN (${placeholders})`,
    params,
  };
}

/**
 * 베트남(UTC+7) 기준 현재 시각 반환
 *
 * 초보자 가이드:
 * - 서버가 한국(UTC+9)에 있어도 DB는 베트남 시간 사용
 * - JS Date는 서버 로컬 시간 → UTC → UTC+7 변환
 */
function getNowVietnam(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600000);
}

/**
 * 베트남(UTC+7) 기준 08:00 시프트 시간 범위 (하루치)
 *
 * 초보자 가이드:
 * - 08:00 이전이면 전일 08:00 ~ 당일 08:00
 * - 08:00 이후이면 당일 08:00 ~ 익일 08:00
 */
export function getVietnamTimeRange(): { startStr: string; endStr: string } {
  const vnNow = getNowVietnam();
  if (vnNow.getHours() < 8) {
    vnNow.setDate(vnNow.getDate() - 1);
  }
  const y = vnNow.getFullYear();
  const m = String(vnNow.getMonth() + 1).padStart(2, "0");
  const d = String(vnNow.getDate()).padStart(2, "0");

  const next = new Date(y, vnNow.getMonth(), vnNow.getDate() + 1);
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, "0");
  const nd = String(next.getDate()).padStart(2, "0");

  return {
    startStr: `${y}/${m}/${d} 08:00:00`,
    endStr: `${ny}/${nm}/${nd} 08:00:00`,
  };
}
