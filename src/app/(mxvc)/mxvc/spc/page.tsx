/**
 * @file src/app/(mxvc)/mxvc/spc/page.tsx
 * @description 멕시코전장 SPC 관리도 보기 페이지.
 * 초보자 가이드:
 * - DisplayHeader/Footer: 공통 헤더/푸터
 * - MxvcSpcControlChart: X-bar-R Chart + Cp/Cpk 관리도 컴포넌트
 * - /api/mxvc/spc API를 사용 (기존 SPC와 서버 분리)
 */
'use client';

import { useTranslations } from 'next-intl';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import MxvcSpcControlChart from '@/components/mxvc/MxvcSpcControlChart';

const SCREEN_ID = 'mxvc-spc';

export default function MexicoSpcPage() {
  const t = useTranslations('mxvcSpc');
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <DisplayHeader title={t('title')} screenId={SCREEN_ID} />

      <div className="flex-1 min-h-0">
        <MxvcSpcControlChart />
      </div>

      <DisplayFooter />
    </div>
  );
}
