/**
 * @file EquipmentLogStatus.tsx
 * @description 설비 로그 검색 메인 컨테이너 컴포넌트.
 * 초보자 가이드: ICOM_WEB_SERVICE_LOG 테이블을 날짜/키워드/개별필터로 검색하는 화면.
 * 기존 모니터링 화면과 달리 자동 갱신 대신 사용자가 검색 버튼으로 조회한다.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '@/components/display/DisplayLayout';
import EquipmentLogGrid from './EquipmentLogGrid';
import type { EquipmentLogRow } from '@/lib/queries/equipment-log';
import type { FilterOptions } from '@/lib/queries/equipment-log';

interface Props {
  screenId: string;
}

interface LogResponse {
  logList: EquipmentLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const selectClass = 'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';
const inputClass = selectClass;

export default function EquipmentLogStatus({ screenId }: Props) {
  const t = useTranslations('equipmentLog');

  /* 검색 조건 상태 */
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [keyword, setKeyword] = useState('');
  const [addr, setAddr] = useState('');
  const [lineCode, setLineCode] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortCol, setSortCol] = useState('CALL_DATE');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [searchTrigger, setSearchTrigger] = useState<string | null>(null);

  /* 필터 고유값 목록 (드롭다운 옵션) */
  const { data: filterOpts } = useSWR<FilterOptions>(
    '/api/display/50?mode=filters', fetcher, { revalidateOnFocus: false },
  );

  /* 로그 검색 API URL */
  const apiUrl = searchTrigger
    ? `/api/display/50?fromDate=${fromDate}&toDate=${toDate}`
      + `&keyword=${encodeURIComponent(keyword)}`
      + `&addr=${encodeURIComponent(addr)}`
      + `&lineCode=${encodeURIComponent(lineCode)}`
      + `&workstageCode=`
      + `&sortCol=${sortCol}&sortDir=${sortDir}`
      + `&page=${page}&pageSize=${pageSize}`
    : null;

  const { data, error, isLoading } = useSWR<LogResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const handleSearch = useCallback(() => {
    setPage(1);
    setSearchTrigger(Date.now().toString());
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  useEffect(() => {
    if (searchTrigger) setSearchTrigger(Date.now().toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortCol, sortDir]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); },
    [handleSearch],
  );

  const statusMessage = data
    ? t('searchResult', { count: data.totalCount })
    : isLoading ? t('searching') : t('searchGuide');

  return (
    <DisplayLayout screenId={screenId} message={statusMessage}>
      <div className="flex h-full flex-col">
        {/* 검색 필터 바 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
          {/* 날짜 범위 */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('dateRange')}</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            <span className="text-gray-400">~</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
          </div>

          {/* 대상 필터 */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('addr')}</label>
            <select value={addr} onChange={(e) => setAddr(e.target.value)} className={selectClass}>
              <option value="">{t('filterAll')}</option>
              {filterOpts?.addrList.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          {/* 라인 필터 */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('lineCode')}</label>
            <select value={lineCode} onChange={(e) => setLineCode(e.target.value)} className={selectClass}>
              <option value="">{t('filterAll')}</option>
              {filterOpts?.lineCodeList.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          {/* 키워드 검색 */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('keyword')}</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('keywordPlaceholder')}
              className={`w-44 ${inputClass} placeholder-gray-400 dark:placeholder-gray-500`}
            />
          </div>

          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {isLoading ? t('searching') : t('search')}
          </button>
        </div>

        {/* 결과 영역 */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex h-full items-center justify-center text-red-500">{t('loadError')}</div>
          ) : !searchTrigger ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <svg className="mb-3 h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm">{t('searchGuide')}</p>
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              {t('searching')}
            </div>
          ) : (
            <EquipmentLogGrid
              rows={data?.logList ?? []}
              totalCount={data?.totalCount ?? 0}
              page={data?.page ?? page}
              totalPages={data?.totalPages ?? 0}
              pageSize={pageSize}
              sortCol={sortCol}
              sortDir={sortDir}
              onPageChange={handlePageChange}
              onSort={(col) => {
                if (col === sortCol) {
                  setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
                } else {
                  setSortCol(col);
                  setSortDir(col === 'CALL_DATE' ? 'DESC' : 'ASC');
                }
                setPage(1);
              }}
            />
          )}
        </div>
      </div>
    </DisplayLayout>
  );
}
