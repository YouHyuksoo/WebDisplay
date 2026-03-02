/**
 * @file PbaMonitoringSection.tsx
 * @description 도움말 - PBA 모니터링 섹션. 화면 21 설명.
 * 초보자 가이드: PBA(Printed Board Assembly) 생산현황 화면의 기능을 안내.
 */
import SectionWrapper from './SectionWrapper';
import ScreenCard from './ScreenCard';

export default function PbaMonitoringSection() {
  return (
    <SectionWrapper id="pba-monitoring" title="PBA 모니터링" icon="📦">
      <div className="space-y-6">
        <p className="text-zinc-300">
          PBA(Printed Board Assembly) 공정의 생산현황을 모니터링합니다.
          ASSY 조립 라인의 생산 실적과 투입/산출 현황을 추적합니다.
        </p>

        <ScreenCard
          screenId="21"
          title="제품생산현황"
          titleEn="PBA Production Status"
          route="/display/21"
          description="ASSY 조립 라인의 제품 생산현황을 실시간으로 표시합니다. 라인별 생산 계획, 투입, 실적, NG 수량을 확인하고 생산 목표 달성률을 모니터링합니다."
          features={[
            '라인별 ASSY 생산 수량 (계획/투입/실적/NG)',
            '생산 진행률 프로그레스 바',
            '라인 선택 필터링 (특정 라인만 표시 가능)',
            '자동 스크롤 페이징 (다수 라인 지원)',
            '30초 주기 자동 갱신',
          ]}
          columns={['라인', '모델', '계획', '투입', '실적', 'NG', '수율']}
          refreshSeconds={30}
        />
      </div>
    </SectionWrapper>
  );
}
