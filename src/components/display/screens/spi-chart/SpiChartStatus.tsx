/**
 * @file SpiChartStatus.tsx
 * @description SPI 차트분석 메인 컴포넌트. 2x2 대시보드 그리드 레이아웃.
 * 초보자 가이드: DisplayLayout으로 감싸고 4개 차트 패널을 그리드로 배치한다.
 * 좌상: 라인별불량현황, 우상: 직행율추이, 좌하: 불량율현황, 우하: 위치별TOP5
 */
'use client';

import DisplayLayout from '@/components/display/DisplayLayout';
import DefectByLineChart from './DefectByLineChart';
import FpyTrendChart from './FpyTrendChart';
import DefectRatePanel from './DefectRatePanel';
import TopDefectChart from './TopDefectChart';

interface SpiChartStatusProps {
  screenId: string;
}

export default function SpiChartStatus({ screenId }: SpiChartStatusProps) {
  return (
    <DisplayLayout screenId={screenId}>
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2">
        <DefectByLineChart />
        <FpyTrendChart />
        <DefectRatePanel />
        <TopDefectChart />
      </div>
    </DisplayLayout>
  );
}
