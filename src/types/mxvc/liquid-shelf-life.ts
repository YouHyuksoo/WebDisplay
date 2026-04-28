/**
 * @file src/types/mxvc/liquid-shelf-life.ts
 * @description 액형자재(THERMAL INTERFACE MATERIAL) 유효기간 모니터링 타입 정의
 *
 * 초보자 가이드:
 * 1. IM_ITEM_INVENTORY(LOT 단위 재고) + ID_ITEM(품목 마스터) JOIN
 * 2. 잔여일자 = MANUFACTURE_DATE + LIFE_CYCLE - SYSDATE (제조일자 기준)
 * 3. 임계 색상: <0 만료(빨강), ≤7 임박(빨강), ≤30 주의(노랑), 그 외 정상
 */

/** API 응답의 단일 LOT 레코드 */
export interface LiquidShelfLifeRow {
  ITEM_CODE: string;
  ITEM_NAME: string;
  LOT: string;
  RECEIPT_DATE: string | null;     // 'YYYY-MM-DD'
  MANUFACTURE_DATE: string | null; // 'YYYY-MM-DD'
  LIFE_CYCLE: number;              // 일 수
  REMAINING_DAYS: number;          // 음수면 만료
  INVENTORY_QTY: number;
}

/** API 응답 */
export interface LiquidShelfLifeResponse {
  rows: LiquidShelfLifeRow[];
  /** 잔여일자 ≤ 7일(만료 포함) 건수 — 알람 배너에 표시 */
  warningCount: number;
  /** 이미 만료(REMAINING_DAYS < 0) 건수 */
  expiredCount: number;
  lastUpdated: string;
}

/** 잔여일자 임계값 (일) */
export const SHELF_LIFE_THRESHOLD = {
  EXPIRED: 0,    // 미만이면 만료
  CRITICAL: 7,   // 이하 빨강
  WARNING: 30,   // 이하 노랑
} as const;
