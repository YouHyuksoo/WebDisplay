/**
 * @file sql-registry.ts
 * @description 화면 ID → SQL 쿼리 매핑 레지스트리.
 * 초보자 가이드: 새 화면 SQL을 추가하려면 SCREEN_SQL_REGISTRY에 항목을 추가하면 됩니다.
 *
 * 각 엔트리:
 *   screenId : SCREENS 또는 라우트의 숫자 ID (문자열)
 *   title    : 화면 이름
 *   queries  : { label: 쿼리 용도 설명, sql: 실제 SQL 문자열 }[]
 */

import { sqlCheckItems, sqlSmdProduction } from './smd-production';
import { sqlSmdDualProduction, sqlSmdDualNgCount } from './smd-dual-production';
import { sqlAssyProductionList } from './assy-production-status';
import { sqlMslWarningList, sqlMslNgCount } from './msl-warning-list';
import { sqlMslWarningIssueList, sqlMslWarningIssueNgCount } from './msl-warning-issue';
import { sqlSolderWarningList, sqlSolderNgCount } from './solder-warning';
import { sqlSmtPickupRateBaseList, sqlSmtPickupRateBaseNgCount } from './smt-pickup-rate-base';
import { sqlSmtPickupRateHeadList, sqlSmtPickupRateHeadNgCount } from './smt-pickup-rate-head';
import { sqlTempHumidityStatus, sqlTempHumidityNgCount } from './temperature-humidity';
import { sqlProductionKpiList } from './production-kpi';
import { sqlSpiByLine, sqlSpiFpyTrend, sqlSpiSummary, sqlSpiTopLines } from './spi-chart';
import { sqlAoiByLine, sqlAoiFpyTrend, sqlAoiSummary, sqlAoiTopLines } from './aoi-chart';
import { sqlEquipmentLogList, sqlEquipmentLogCount } from './equipment-log';

export interface SqlEntry {
  label: string;
  sql: string;
}

export interface ScreenSqlInfo {
  screenId: string;
  title: string;
  queries: SqlEntry[];
}

/** 화면별 SQL 빌더 맵 — 호출 시점에만 SQL 문자열을 생성하여 불필요한 즉시 평가를 방지 */
const SCREEN_SQL_BUILDERS: Record<string, () => ScreenSqlInfo> = {
  '21': () => ({
    screenId: '21',
    title: '제품생산현황 (Assy Production Status)',
    queries: [
      { label: '메인 리스트', sql: sqlAssyProductionList('/* AND line_code IN (:line0, ...) */') },
    ],
  }),
  '24': () => ({
    screenId: '24',
    title: 'SMD 생산현황 (SMD Production Status)',
    queries: [
      { label: 'SMD 생산 리스트', sql: sqlSmdProduction('/* AND line_code IN (:line0, ...) */') },
      { label: '점검 항목', sql: sqlCheckItems('/* AND line_code IN (:line0, ...) */') },
    ],
  }),
  '25': () => ({
    screenId: '25',
    title: '종합 F/P 현황 (Foolproof Status)',
    queries: [
      { label: 'SMD 생산 리스트', sql: sqlSmdProduction('/* AND line_code IN (:line0, ...) */') },
      { label: '점검 항목', sql: sqlCheckItems('/* AND line_code IN (:line0, ...) */') },
    ],
  }),
  '26': () => ({
    screenId: '26',
    title: '라인별 생산현황 (Line Production KPI)',
    queries: [
      { label: '생산 KPI', sql: sqlProductionKpiList('/* AND line_code IN (:line0, ...) */') },
    ],
  }),
  '27': () => ({
    screenId: '27',
    title: 'SMD 듀얼생산현황 (SMD Dual Production Status)',
    queries: [
      { label: '생산현황 상세', sql: sqlSmdDualProduction('/* AND line_code IN (:line0, ...) */') },
      { label: '점검 항목', sql: sqlCheckItems('/* AND line_code IN (:line0, ...) */') },
      { label: 'NG 건수', sql: sqlSmdDualNgCount('/* AND line_code IN (:line0, ...) */') },
    ],
  }),
  '29': () => ({
    screenId: '29',
    title: 'MSL Warning (장착 기준)',
    queries: [
      { label: 'MSL 경고 리스트', sql: sqlMslWarningList() },
      { label: 'NG 건수', sql: sqlMslNgCount() },
    ],
  }),
  '30': () => ({
    screenId: '30',
    title: 'MSL Warning (출고 기준)',
    queries: [
      { label: 'MSL 이슈 리스트', sql: sqlMslWarningIssueList() },
      { label: 'NG 건수', sql: sqlMslWarningIssueNgCount() },
    ],
  }),
  '31': () => ({
    screenId: '31',
    title: 'Solder Paste 관리',
    queries: [
      { label: '솔더 경고 리스트', sql: sqlSolderWarningList() },
      { label: 'NG 건수', sql: sqlSolderNgCount() },
    ],
  }),
  '34': () => ({
    screenId: '34',
    title: '픽업률 현황 (BASE)',
    queries: [
      { label: '픽업률 BASE 리스트', sql: sqlSmtPickupRateBaseList() },
      { label: 'NG 건수', sql: sqlSmtPickupRateBaseNgCount() },
    ],
  }),
  '35': () => ({
    screenId: '35',
    title: '픽업률 현황 (HEAD)',
    queries: [
      { label: '픽업률 HEAD 리스트', sql: sqlSmtPickupRateHeadList() },
      { label: 'NG 건수', sql: sqlSmtPickupRateHeadNgCount() },
    ],
  }),
  '37': () => ({
    screenId: '37',
    title: '온습도 (Temperature & Humidity)',
    queries: [
      { label: '온습도 현황', sql: sqlTempHumidityStatus() },
      { label: 'NG 건수', sql: sqlTempHumidityNgCount() },
    ],
  }),
  '40': () => ({
    screenId: '40',
    title: 'SPI 차트분석 (SPI Chart Analysis)',
    queries: [
      { label: '라인별 불량현황', sql: sqlSpiByLine('/* AND LINE_CODE IN (:line0, ...) */') },
      { label: '직행율 7일 추이', sql: sqlSpiFpyTrend('/* AND LINE_CODE IN (:line0, ...) */') },
      { label: '당일 요약', sql: sqlSpiSummary('/* AND LINE_CODE IN (:line0, ...) */') },
      { label: '라인별 불량 TOP5', sql: sqlSpiTopLines('/* AND LINE_CODE IN (:line0, ...) */') },
    ],
  }),
  '41': () => ({
    screenId: '41',
    title: 'AOI 차트분석 (AOI Chart Analysis)',
    queries: [
      { label: '라인별 불량현황', sql: sqlAoiByLine('/* AND LINE_CODE IN (:line0, ...) */') },
      { label: '직행율 7일 추이', sql: sqlAoiFpyTrend('/* AND LINE_CODE IN (:line0, ...) */') },
      { label: '당일 요약', sql: sqlAoiSummary('/* AND LINE_CODE IN (:line0, ...) */') },
      { label: '라인별 불량 TOP5', sql: sqlAoiTopLines('/* AND LINE_CODE IN (:line0, ...) */') },
    ],
  }),
  '50': () => ({
    screenId: '50',
    title: '설비로그검색 (Equipment Log Search)',
    queries: [
      { label: '로그 목록', sql: sqlEquipmentLogList('/* AND keyword LIKE ... */') },
      { label: '로그 건수', sql: sqlEquipmentLogCount('/* AND keyword LIKE ... */') },
    ],
  }),
};

/** 특정 화면의 SQL 정보를 반환 (lazy — 요청 시점에만 SQL 생성) */
export function getScreenSql(screenId: string): ScreenSqlInfo | undefined {
  return SCREEN_SQL_BUILDERS[screenId]?.();
}

/** 등록된 모든 screenId 목록 반환 */
export function getRegisteredScreenIds(): string[] {
  return Object.keys(SCREEN_SQL_BUILDERS);
}
