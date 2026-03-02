/**
 * @file QualitySection.tsx
 * @description 도움말 - 품질 관리 섹션. 화면 29, 30, 31, 37 설명.
 * 초보자 가이드: MSL 경고, 솔더 페이스트, 온습도 관리 화면의 기능을 안내.
 */
import SectionWrapper from './SectionWrapper';
import ScreenCard from './ScreenCard';

export default function QualitySection() {
  return (
    <SectionWrapper id="quality" title="품질 관리" icon="✅">
      <div className="space-y-6">
        <p className="text-zinc-300">
          제조 공정의 품질 관련 항목을 모니터링합니다. MSL(Moisture Sensitivity Level) 관리,
          솔더 페이스트 사용 기한, 온습도 환경 등을 실시간으로 감시합니다.
        </p>

        <ScreenCard
          screenId="29"
          title="MSL Warning (장착 기준)"
          titleEn="MSL Warning List (Mount)"
          route="/display/29"
          description="부품의 MSL(습기 감도 레벨) 경과 시간을 장착 기준으로 모니터링합니다. MSL 허용 시간이 초과된 부품은 빨간색으로 경고하여 품질 사고를 예방합니다."
          features={[
            '부품별 MSL 레벨 및 허용 시간 표시',
            '경과 시간 / 잔여 시간 실시간 카운트다운',
            'NG 항목 빨간색 강조 + 상단 경고 배너',
            '초과 건수 경고음 알림',
          ]}
          columns={['라인명', '위치', 'MSL 레벨', '품목코드', 'Lot No', '최대시간', '경과시간', '잔여시간']}
          refreshSeconds={30}
        />

        <ScreenCard
          screenId="30"
          title="MSL Warning (출고 기준)"
          titleEn="MSL Warning List (Issue)"
          route="/display/30"
          description="MSL 경과 시간을 자재 출고 기준으로 모니터링합니다. 출고 시점부터의 노출 시간을 추적하여 자재 창고 관리에 활용합니다."
          features={[
            '출고 기준 MSL 시간 추적',
            '장착 기준(#29)과 다른 시점 기준 적용',
            'NG 초과 건수 배너 + 경고음',
          ]}
          columns={['라인명', '위치', 'MSL 레벨', '품목코드', 'Lot No', '최대시간', '경과시간', '잔여시간']}
          refreshSeconds={30}
        />

        <ScreenCard
          screenId="31"
          title="Solder Paste 관리"
          titleEn="Solder Paste Management"
          route="/display/31"
          description="솔더 페이스트(납땜용 크림)의 사용 기한과 상태를 관리합니다. 개봉 후 유효 시간이 초과되면 경고를 표시하여 불량을 예방합니다."
          features={[
            '솔더 페이스트 사용 기한 모니터링',
            '개봉 후 경과 시간 추적',
            '유효기간 초과 항목 빨간색 경고',
            'NG 건수 상단 배너',
          ]}
          columns={['라인', '위치', '제품명', '개봉시간', '경과시간', '유효시간', '잔여시간', '판정']}
          refreshSeconds={30}
        />

        <ScreenCard
          screenId="37"
          title="온습도"
          titleEn="Temperature & Humidity"
          route="/display/37"
          description="작업장 내 온도와 습도를 실시간으로 모니터링합니다. 설정된 기준 범위를 벗어나면 경고를 표시하여 작업 환경을 관리합니다."
          features={[
            '센서별 온도/습도 실시간 표시',
            '기준 범위 초과 시 빨간색 경고',
            'NG 건수 배너 (기준 이탈 센서 수)',
            '온도/습도 상한·하한 기준값 표시',
          ]}
          columns={['라인', '위치', '온도', '습도', '온도기준', '습도기준', '판정']}
          refreshSeconds={30}
        />
      </div>
    </SectionWrapper>
  );
}
