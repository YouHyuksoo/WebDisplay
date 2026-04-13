/**
 * @file src/app/(mxvc)/mxvc/production-kpi/page.tsx
 * @description 멕시코전장 모니터링 — 라인별 생산현황 (display/26 독립 버전)
 *
 * 초보자 가이드:
 * - screenId='mxvc-production-kpi' 로 display/26 과 완전히 독립된 상태를 유지한다.
 * - 라인 선택, API 호출, localStorage 모두 별도로 동작한다.
 */
import MxvcProductionKpiStatus from '@/components/mxvc/MxvcProductionKpiStatus';

export default function MxvcProductionKpiPage() {
  return <MxvcProductionKpiStatus />;
}
