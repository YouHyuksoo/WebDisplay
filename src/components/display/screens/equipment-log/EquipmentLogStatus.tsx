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
import { useServerTime } from '@/hooks/useServerTime';
import EquipmentLogGrid from './EquipmentLogGrid';
import InspectResultGrid from './InspectResultGrid';
import Spinner from '@/components/ui/Spinner';
import type { EquipmentLogRow } from '@/lib/queries/equipment-log';
import type { FilterOptions } from '@/lib/queries/equipment-log';
import type { InspectRow } from './InspectResultGrid';

type ViewTab = 'log' | 'inspect';

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

interface InspectResponse {
  rows: InspectRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const selectClass = 'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';
const inputClass = selectClass;

export default function EquipmentLogStatus({ screenId }: Props) {
  const t = useTranslations('equipmentLog');
  const serverToday = useServerTime();

  const [viewTab, setViewTab] = useState<ViewTab>('log');

  /* 검색 조건 상태 */
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* 서버 시간 로드 후 초기값 설정 */
  useEffect(() => {
    if (serverToday && !fromDate) {
      setFromDate(serverToday);
      setToDate(serverToday);
    }
  }, [serverToday, fromDate]);
  const [keyword, setKeyword] = useState('');
  const [addr, setAddr] = useState('');
  const [lineCode, setLineCode] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sorts, setSorts] = useState<{ col: string; dir: 'ASC' | 'DESC' }[]>([{ col: 'CALL_DATE', dir: 'DESC' }]);
  const [searchTrigger, setSearchTrigger] = useState<string | null>(null);

  /* 필터 고유값 목록 (드롭다운 옵션) */
  const { data: filterOpts } = useSWR<FilterOptions>(
    '/api/display/50?mode=filters', fetcher, { revalidateOnFocus: false },
  );

  /* 로그 검색 API URL */
  const sortColParam = sorts.map((s) => s.col).join(',');
  const sortDirParam = sorts.map((s) => s.dir).join(',');
  const apiUrl = searchTrigger
    ? `/api/display/50?fromDate=${fromDate}&toDate=${toDate}`
      + `&keyword=${encodeURIComponent(keyword)}`
      + `&addr=${encodeURIComponent(addr)}`
      + `&lineCode=${encodeURIComponent(lineCode)}`
      + `&workstageCode=`
      + `&sortCol=${sortColParam}&sortDir=${sortDirParam}`
      + `&page=${page}&pageSize=${pageSize}`
      + `&_t=${searchTrigger}`
    : null;

  const { data, error, isLoading } = useSWR<LogResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  /* ── 호출저장이력 (inspect) 상태 ── */
  const [inspPage, setInspPage] = useState(1);
  const [inspSorts, setInspSorts] = useState<{ col: string; dir: 'ASC' | 'DESC' }[]>([{ col: 'INSPECT_DATE', dir: 'DESC' }]);
  const [inspTrigger, setInspTrigger] = useState<string | null>(null);

  const inspApiUrl = inspTrigger
    ? `/api/display/50?mode=inspect&fromDate=${fromDate}&toDate=${toDate}`
      + `&keyword=${encodeURIComponent(keyword)}`
      + `&lineCode=${encodeURIComponent(lineCode)}`
      + `&sortCol=${inspSorts[0]?.col ?? 'INSPECT_DATE'}&sortDir=${inspSorts[0]?.dir ?? 'DESC'}`
      + `&page=${inspPage}&pageSize=${pageSize}`
      + `&_t=${inspTrigger}`
    : null;

  const { data: inspData, error: inspError, isLoading: inspLoading } = useSWR<InspectResponse>(
    inspApiUrl, fetcher, { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  useEffect(() => {
    if (inspTrigger) setInspTrigger(Date.now().toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspPage, inspSorts]);

  const handleSearch = useCallback(() => {
    setPage(1);
    setSearchTrigger(Date.now().toString());
    setInspPage(1);
    setInspTrigger(Date.now().toString());
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  useEffect(() => {
    if (searchTrigger) setSearchTrigger(Date.now().toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sorts]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); },
    [handleSearch],
  );

  const statusMessage = data
    ? t('searchResult', { count: data.totalCount })
    : isLoading ? t('searching') : t('searchGuide');

  return (
    <DisplayLayout screenId={screenId} message={statusMessage} sqlTabIndex={viewTab === 'inspect' ? 2 : 0}>
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
            disabled={isLoading || inspLoading}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {(isLoading || inspLoading) ? t('searching') : t('search')}
          </button>

          {/* 탭 토글 */}
          <div className="ml-2 flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
            <button
              onClick={() => setViewTab('log')}
              className={`px-3 py-1.5 transition-colors ${
                viewTab === 'log'
                  ? 'bg-blue-500 text-white font-semibold'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('tabLog')}
            </button>
            <button
              onClick={() => setViewTab('inspect')}
              className={`px-3 py-1.5 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                viewTab === 'inspect'
                  ? 'bg-emerald-500 text-white font-semibold'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('tabInspect')}
            </button>
          </div>
        </div>

        {/* 결과 영역 */}
        <div className="flex-1 overflow-hidden">
          {viewTab === 'log' ? (
            /* ── 호출이력 탭 ── */
            error ? (
              <div className="flex h-full items-center justify-center text-red-500">{t('loadError')}</div>
            ) : !searchTrigger ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <svg className="mb-3 h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-sm">{t('searchGuide')}</p>
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="md" label={t('searching')} />
              </div>
            ) : (
              <EquipmentLogGrid
                rows={data?.logList ?? []}
                totalCount={data?.totalCount ?? 0}
                page={data?.page ?? page}
                totalPages={data?.totalPages ?? 0}
                pageSize={pageSize}
                serverTimestamp={data?.timestamp}
                onPageChange={handlePageChange}
                onSortChange={(newSorts) => {
                  setSorts(newSorts);
                  setPage(1);
                }}
              />
            )
          ) : (
            /* ── 호출저장이력 탭 ── */
            inspError ? (
              <div className="flex h-full items-center justify-center text-red-500">{t('loadError')}</div>
            ) : !inspTrigger ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <svg className="mb-3 h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-sm">{t('searchGuide')}</p>
              </div>
            ) : inspLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="md" label={t('searching')} />
              </div>
            ) : (
              <InspectResultGrid
                rows={inspData?.rows ?? []}
                totalCount={inspData?.totalCount ?? 0}
                page={inspData?.page ?? inspPage}
                totalPages={inspData?.totalPages ?? 0}
                pageSize={pageSize}
                onPageChange={setInspPage}
                onSortChange={(newSorts) => {
                  setInspSorts(newSorts);
                  setInspPage(1);
                }}
              />
            )
          )}
        </div>
      </div>
    </DisplayLayout>
  );
}
