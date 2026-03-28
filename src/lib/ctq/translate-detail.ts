/**
 * @file src/lib/ctq/translate-detail.ts
 * @description API에서 내려오는 코드형 detail 문자열을 현재 언어로 번역하는 순수 유틸
 *
 * 초보자 가이드:
 * 1. CTQ 모니터링 API가 반환하는 detail 코드를 사람이 읽을 수 있는 문자열로 변환
 * 2. next-intl의 t() 함수를 매개변수로 받아 프레임워크에 독립적으로 동작
 * 3. 패턴 예시:
 *    - "consecutive:2(LOC1)" → "연속불량:2회(LOC1)"
 *    - "sameLoc:3(LOC1)" → "동일위치:3회(LOC1)"
 *    - "NG:5(A)" → "NG:5회(A등급)"
 *    - 복합 패턴: "consecutive:2(LOC1) / NG:5(A)" → 각각 번역 후 " / "로 결합
 */

/** 번역 함수 타입 — next-intl의 t() 또는 SOLUMCTQ의 t()와 호환 */
type TranslateFn = (key: string) => string | readonly string[];

/**
 * API에서 내려오는 코드형 detail 문자열을 현재 언어로 번역
 * @param detail - API 응답의 detail 문자열 (예: "consecutive:2(LOC1)")
 * @param t - 번역 함수 (next-intl useTranslations() 반환값 등)
 * @returns 번역된 문자열, 또는 null (detail이 null/빈 문자열인 경우)
 */
export function translateDetail(detail: string | null, t: TranslateFn): string | null {
  if (!detail) return null;

  // consecutive:2(LOC_CODE)
  const consMatch = detail.match(/^consecutive:(\d+)\((.+)\)$/);
  if (consMatch) {
    return (t("table.consecutiveFmt") as string)
      .replace("{count}", consMatch[1])
      .replace("{loc}", consMatch[2]);
  }

  // consecutive(LOC_CODE) - monitoring route format
  const consSimple = detail.match(/^consecutive\((.+)\)$/);
  if (consSimple) {
    return `${t("table.consecutive") as string}(${consSimple[1]})`;
  }

  // sameLoc:3(LOC_CODE)
  const sameMatch = detail.match(/^sameLoc:(\d+)\((.+)\)$/);
  if (sameMatch) {
    return (t("table.sameLocFmt") as string)
      .replace("{count}", sameMatch[1])
      .replace("{loc}", sameMatch[2]);
  }

  // NG:5(A) or NG:5(B)
  const ngMatch = detail.match(/^NG:(\d+)\(([AB])\)$/);
  if (ngMatch) {
    const gradeLabel = t(`grade.${ngMatch[2].toLowerCase()}`) as string;
    return (t("table.ngGradeFmt") as string)
      .replace("{count}", ngMatch[1])
      .replace("{grade}", gradeLabel);
  }

  // NG:5 (monitoring route)
  const ngSimple = detail.match(/^NG:(\d+)$/);
  if (ngSimple) {
    return `NG:${ngSimple[1]}`;
  }

  // combined details with " / "
  if (detail.includes(" / ")) {
    return detail.split(" / ").map(d => translateDetail(d, t) ?? d).join(" / ");
  }

  return detail;
}
