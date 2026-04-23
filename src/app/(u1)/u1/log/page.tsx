/**
 * @file src/app/(u1)/u1/log/page.tsx
 * @description 베트남U1 로그조회 메인 페이지.
 * 초보자 가이드:
 * - DisplayHeader/Footer: 다른 페이지와 동일한 공통 헤더/푸터
 * - 좌측 사이드바: LOG_ 테이블 목록 (LogTableSidebar, apiBase=/api/u1)
 * - 우측 메인: AG Grid 기반 데이터 그리드 (LogDataGrid, apiBase=/api/u1)
 * - 날짜 기간 필터와 엑셀 다운로드 기능 포함
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import LogTableSidebar from '@/components/mxvc/LogTableSidebar';
import LogDataGrid from '@/components/mxvc/LogDataGrid';

const SCREEN_ID = 'u1-log';
const API_BASE = '/api/u1';

export default function U1LogPage() {
  const t = useTranslations('u1Log');
  const [selectedTable, setSelectedTable] = useState('');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <DisplayHeader title={t('title')} screenId={SCREEN_ID} />

      {/* 본문: 사이드바 + 그리드 */}
      <div className="flex-1 flex min-h-0">
        <LogTableSidebar
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          apiBase={API_BASE}
        />
        <LogDataGrid tableName={selectedTable} apiBase={API_BASE} />
      </div>

      <DisplayFooter />
    </div>
  );
}
