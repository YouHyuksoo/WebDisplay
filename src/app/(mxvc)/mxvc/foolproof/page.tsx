/**
 * @file src/app/(mxvc)/mxvc/foolproof/page.tsx
 * @description 멕시코전장 모니터링 — 종합 F/P 현황 (display/25 복사본)
 *
 * 초보자 가이드:
 * - display/25의 FoolproofStatus 컴포넌트를 그대로 재사용
 * - 멕시코전장 DB 프로필이 활성화되어 있으면 해당 데이터 조회
 */
import FoolproofStatus from '@/components/display/screens/foolproof-status/FoolproofStatus';

export default function MxvcFoolproofPage() {
  return <FoolproofStatus screenId="25" />;
}
