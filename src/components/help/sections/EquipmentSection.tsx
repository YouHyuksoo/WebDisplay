/**
 * @file EquipmentSection.tsx
 * @description 도움말 - 설비 모니터링 섹션. 화면 34, 35 설명.
 * 초보자 가이드: SMT 픽업률(Pickup Rate) 모니터링 화면 2종의 기능을 안내.
 */
import SectionWrapper from './SectionWrapper';
import ScreenCard from './ScreenCard';

export default function EquipmentSection() {
  return (
    <SectionWrapper id="equipment" title="설비 모니터링" icon="⚙️">
      <div className="space-y-6">
        <p className="text-zinc-300">
          SMT 설비의 픽업률(Pickup Rate)을 모니터링합니다. 픽업률은 칩 마운터가 부품을 정상적으로
          픽업하는 비율로, 설비 상태의 핵심 지표입니다.
        </p>

        <ScreenCard
          screenId="34"
          title="픽업률현황 (BASE)"
          titleEn="SMT Pickup Rate (Base)"
          route="/display/34"
          description="SMT 칩 마운터의 BASE 기준 픽업률을 모니터링합니다. 각 설비별 전체 픽업률과 NG 건수를 확인하여 설비 이상을 조기에 감지합니다."
          features={[
            'BASE 단위 픽업률 현황',
            'NG 건수 배너 (기준치 미달 시 경고)',
            '설비별 픽업률 비교',
            '기준치 미달 항목 빨간색 강조',
          ]}
          columns={['라인', '설비', '픽업률', 'NG 수량', '총 수량', '판정']}
          refreshSeconds={30}
        />

        <ScreenCard
          screenId="35"
          title="픽업률현황 (HEAD)"
          titleEn="SMT Pickup Rate (Head)"
          route="/display/35"
          description="SMT 칩 마운터의 HEAD 기준 픽업률을 모니터링합니다. 개별 헤드 단위로 세분화하여 어느 헤드에서 문제가 발생하는지 정확히 파악합니다."
          features={[
            'HEAD 단위 세분화 모니터링',
            '개별 헤드 픽업률 확인',
            '문제 헤드 빠르게 식별',
            'NG 건수 기준 경고 배너',
          ]}
          columns={['라인', '설비', '헤드', '픽업률', 'NG 수량', '총 수량', '판정']}
          refreshSeconds={30}
        />
      </div>
    </SectionWrapper>
  );
}
