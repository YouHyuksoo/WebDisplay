/**
 * @file src/types/ctq/material.ts
 * @description 원자재 동일부품 모니터링 타입 정의
 *
 * 초보자 가이드:
 * - IP_PRODUCT_WORK_QC 테이블 기반
 * - 동일 부품(DEFECT_ITEM_CODE 또는 COMMENTS) 기준 일/90일 누적 판정
 * - A급: 일 3건+, C급: 90일 누적 3건+
 */

export type MaterialGrade = "A" | "C" | "OK";

/** NG 상세 레코드 (툴팁용) */
export interface NgDetailRecord {
  time: string;
  pid: string;
  model: string;
  receiptDeficit: string;
  locationCode: string;
  repairResult: string;
  qcHandling: string;
  defectItem: string;
}

export interface MaterialDefectItem {
  defectItem: string;
  dailyCount: number;
  cumulativeCount: number;
  ngDetails: NgDetailRecord[];
}

export interface MaterialLineCardData {
  lineCode: string;
  lineName: string;
  defects: MaterialDefectItem[];
  totalDailyNg: number;
  totalCumulativeNg: number;
  overallGrade: MaterialGrade;
}

export interface MaterialResponse {
  lines: MaterialLineCardData[];
  lastUpdated: string;
}
