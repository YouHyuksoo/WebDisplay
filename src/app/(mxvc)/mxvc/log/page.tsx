/**
 * @file src/app/(mxvc)/mxvc/log/page.tsx
 * @description 멕시코전장 로그조회 메인 페이지.
 * 초보자 가이드:
 * - DisplayHeader/Footer: 다른 페이지와 동일한 공통 헤더/푸터
 * - 좌측 사이드바: LOG_ 테이블 목록 (LogTableSidebar)
 * - 우측 메인: AG Grid 기반 데이터 그리드 (LogDataGrid)
 * - LINE_CODE 필터: 테이블 선택 시 해당 테이블의 LINE_CODE 고유값 드롭다운 제공
 * - 날짜 기간 필터와 엑셀 다운로드 기능 포함
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import LogTableSidebar from '@/components/mxvc/LogTableSidebar';
import LogDataGrid from '@/components/mxvc/LogDataGrid';
import LogEolMasterDetail from '@/components/mxvc/LogEolMasterDetail';
import LogIctMasterDetail from '@/components/mxvc/LogIctMasterDetail';

const SCREEN_ID = 'mxvc-log';

export default function MexicoLogPage() {
  const [selectedTable, setSelectedTable] = useState('');
  const [lineCodes, setLineCodes] = useState<string[]>([]);
  const [lineCode, setLineCode] = useState('');

  /** 테이블 변경 시 LINE_CODE 목록 조회 */
  useEffect(() => {
    setLineCode('');
    setLineCodes([]);
    if (!selectedTable) return;

    (async () => {
      try {
        const res = await fetch(`/api/mxvc/line-codes?table=${selectedTable}`);
        if (!res.ok) return;
        const data = await res.json();
        setLineCodes(data.lineCodes ?? []);
      } catch { /* 무시 */ }
    })();
  }, [selectedTable]);

  const handleSelectTable = useCallback((table: string) => {
    setSelectedTable(table);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-white">
      <DisplayHeader title="멕시코전장 로그조회" screenId={SCREEN_ID} />

      {/* 본문: 사이드바 + 그리드 */}
      <div className="flex-1 flex min-h-0">
        <LogTableSidebar
          selectedTable={selectedTable}
          onSelectTable={handleSelectTable}
        />
        {selectedTable === 'LOG_EOL'
          ? <LogEolMasterDetail lineCode={lineCode} lineCodes={lineCodes} onLineCodeChange={setLineCode} />
          : selectedTable === 'LOG_ICT'
            ? <LogIctMasterDetail lineCode={lineCode} lineCodes={lineCodes} onLineCodeChange={setLineCode} />
            : <LogDataGrid tableName={selectedTable} lineCode={lineCode} lineCodes={lineCodes} onLineCodeChange={setLineCode} />
        }
      </div>

      <DisplayFooter />
    </div>
  );
}
