/**
 * @file src/app/(mxvc)/mxvc/production-kpi/page.tsx
 * @description 멕시코전장 모니터링 — 라인별 생산현황 (display/26 복사본)
 *
 * 초보자 가이드:
 * - display/26의 ProductionKpiStatus 컴포넌트를 그대로 재사용
 */
import ProductionKpiStatus from '@/components/display/screens/production-kpi/ProductionKpiStatus';

export default function MxvcProductionKpiPage() {
  return <ProductionKpiStatus screenId="26" />;
}
