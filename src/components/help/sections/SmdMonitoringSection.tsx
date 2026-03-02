/**
 * @file SmdMonitoringSection.tsx
 * @description 도움말 - SMD 모니터링 섹션. 화면 24, 25, 26, 27 설명.
 * 초보자 가이드: SMD 라인 관련 4개 화면의 기능, 컬럼, 상태 색상 등을 안내.
 */
import SectionWrapper from './SectionWrapper';
import ScreenCard from './ScreenCard';

export default function SmdMonitoringSection() {
  return (
    <SectionWrapper id="smd-monitoring" title="SMD 모니터링" icon="🔧">
      <div className="space-y-6">
        <p className="text-zinc-300">
          SMD(Surface Mount Device) 라인의 생산현황을 실시간으로 모니터링하는 화면 그룹입니다.
          각 라인의 가동 상태, 생산 실적, AOI 수율 등을 확인할 수 있습니다.
        </p>

        {/* Screen 24 */}
        <ScreenCard
          screenId="24"
          title="SMD 생산현황"
          titleEn="SMD Production Status"
          route="/display/24"
          description="모든 SMD 라인의 생산현황을 한 화면에 표시합니다. 라인별 모델, 계획/투입/실적 수량, AOI FPY(First Pass Yield), 가동률 등을 실시간으로 확인합니다."
          features={[
            '라인별 가동 상태 (정상: 초록, 정지: 빨강 깜빡임)',
            '계획 대비 실적 진행률 프로그레스 바',
            'AOI FPY 수율 표시 (95% 미만 시 노란색 경고)',
            '점검 항목 테이블 (마스크 체크, 스퀴즈 체크 등)',
            '자동 스크롤 (다수 라인 시 10초 주기 페이징)',
          ]}
          columns={['상태', '라인', '모델명', '계획', 'Target', '투입', '실적', '진행률', 'AOI FPY', 'UPH']}
          refreshSeconds={30}
        />

        {/* Screen 25 */}
        <ScreenCard
          screenId="25"
          title="종합 F/P 현황"
          titleEn="Foolproof Status"
          route="/display/25"
          description="Foolproof(오류 방지) 시스템의 종합 현황입니다. SMD 생산현황과 동일한 데이터를 사용하되, Foolproof 관련 항목에 초점을 맞춥니다."
          features={[
            'SMD 생산현황과 동일한 데이터 소스 사용',
            'Foolproof 점검 항목 강조 표시',
            '비정상 항목 빨간색 하이라이트',
          ]}
          columns={['상태', '라인', '모델명', '계획', 'Target', '투입', '실적', '진행률', 'AOI FPY', 'UPH']}
          refreshSeconds={30}
        />

        {/* Screen 26 */}
        <ScreenCard
          screenId="26"
          title="라인별 생산현황"
          titleEn="Line Production KPI"
          route="/display/26"
          description="라인별 핵심 생산 지표(KPI)를 요약하여 보여줍니다. 전체 공장의 라인별 생산 실적을 비교하는 데 적합합니다."
          features={[
            '라인별 KPI 한눈에 비교',
            '생산 목표 대비 달성률 표시',
            '자동 갱신 30초 주기',
          ]}
          columns={['라인', '모델', '계획', '투입', '실적', 'NG', '수율', 'UPH']}
          refreshSeconds={30}
        />

        {/* Screen 27 */}
        <ScreenCard
          screenId="27"
          title="SMD 듀얼생산현황"
          titleEn="SMD Dual Production Status"
          route="/display/27"
          description="SMD 라인의 상세 생산현황을 개별 라인 단위로 크게 표시합니다. 한 라인의 정보를 2행 구조로 보여주어 TV 모니터에서 더 큰 글자로 확인할 수 있습니다."
          features={[
            '2행 카드 구조 (상단: 생산 수량, 하단: 모델/상태 정보)',
            '라인 상태 색상 (정상: 초록, NSNP/정지: 빨강 깜빡임)',
            'AOI Pass Rate 및 Assembly Target 표시',
            '점검 항목 (마스크/스퀴즈/PCB 지그 등) 테이블',
            'NG 건수 배너 (이상 발생 시 상단 빨간색 경고)',
          ]}
          columns={['상태', '라인', '모델명', '계획', 'Target', '투입', '실적', '진행률', 'AOI FPY', 'UPH']}
          refreshSeconds={30}
        />
      </div>
    </SectionWrapper>
  );
}
