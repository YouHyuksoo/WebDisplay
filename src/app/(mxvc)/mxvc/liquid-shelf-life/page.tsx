/**
 * @file src/app/(mxvc)/mxvc/liquid-shelf-life/page.tsx
 * @description 액형자재 유효기간 모니터링 페이지 (멕시코전장 카드 메뉴 진입)
 *
 * 초보자 가이드:
 * - SCREENS 레지스트리 ID: 'mxvc-liquid-shelf-life'
 * - 클라이언트 컴포넌트(LiquidShelfLifeStatus)에서 SWR polling
 */
import LiquidShelfLifeStatus from '@/components/mxvc/liquid-shelf-life/LiquidShelfLifeStatus';

const SCREEN_ID = 'mxvc-liquid-shelf-life';

export default function MxvcLiquidShelfLifePage() {
  return <LiquidShelfLifeStatus screenId={SCREEN_ID} />;
}
