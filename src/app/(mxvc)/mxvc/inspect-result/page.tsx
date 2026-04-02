/**
 * @file src/app/(mxvc)/mxvc/inspect-result/page.tsx
 * @description 설비호출저장이력 검색 페이지 — IQ_MACHINE_INSPECT_RESULT
 * 초보자 가이드:
 * 1. display/50(설비호출이력검색)과 동일한 패턴
 * 2. 날짜/라인/설비/키워드 필터 + AG Grid 서버 페이지네이션
 * 3. 멕시코전장 카테고리 메뉴에서 진입
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import InspectResultGrid from "@/components/mxvc/InspectResultGrid";
import type { InspectResultFilters } from "@/lib/queries/inspect-result";

const SCREEN_ID = "mxvc-inspect-result";
const API_BASE = "/api/mxvc/inspect-result";

interface SearchResponse {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
function todayStr(): string { return new Date().toISOString().slice(0, 10); }

const selectClass = "rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";
const inputClass = selectClass;

export default function InspectResultPage() {
  const t = useTranslations("common");

  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [keyword, setKeyword] = useState("");
  const [lineCode, setLineCode] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [isLast, setIsLast] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortCol, setSortCol] = useState("INSPECT_DATE");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [searchTrigger, setSearchTrigger] = useState<string | null>(null);

  const { data: filterOpts } = useSWR<InspectResultFilters>(
    `${API_BASE}?mode=filters`, fetcher, { revalidateOnFocus: false },
  );

  const apiUrl = searchTrigger
    ? `${API_BASE}?fromDate=${fromDate}&toDate=${toDate}`
      + `&keyword=${encodeURIComponent(keyword)}`
      + `&lineCode=${encodeURIComponent(lineCode)}`
      + `&machineCode=${encodeURIComponent(machineCode)}`
      + `&isLast=${encodeURIComponent(isLast)}`
      + `&sortCol=${sortCol}&sortDir=${sortDir}`
      + `&page=${page}&pageSize=${pageSize}`
    : null;

  const { data, error, isLoading } = useSWR<SearchResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const handleSearch = useCallback(() => {
    setPage(1);
    setSearchTrigger(Date.now().toString());
  }, []);

  useEffect(() => {
    if (searchTrigger) setSearchTrigger(Date.now().toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortCol, sortDir]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); },
    [handleSearch],
  );

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="설비호출저장이력" screenId={SCREEN_ID} />

      {/* 검색 필터 바 */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">기간</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
          <span className="text-gray-400">~</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">LINE</label>
          <select value={lineCode} onChange={(e) => setLineCode(e.target.value)} className={selectClass}>
            <option value="">전체</option>
            {filterOpts?.lineCodeList.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">머신</label>
          <select value={machineCode} onChange={(e) => setMachineCode(e.target.value)} className={selectClass}>
            <option value="">전체</option>
            {filterOpts?.machineCodeList.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">IS_LAST</label>
          <select value={isLast} onChange={(e) => setIsLast(e.target.value)} className={selectClass}>
            <option value="">전체</option>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">검색</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="PID, 결과, 머신 등"
            className={`w-44 ${inputClass} placeholder-gray-400 dark:placeholder-gray-500`}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {isLoading ? t("loading") : t("refresh")}
        </button>
      </div>

      {/* 결과 영역 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center text-red-500">{t("error")}</div>
        ) : !searchTrigger ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="mb-3 h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">날짜를 선택하고 검색 버튼을 눌러주세요</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            {t("loading")}
          </div>
        ) : (
          <InspectResultGrid
            rows={data?.rows ?? []}
            totalCount={data?.totalCount ?? 0}
            page={data?.page ?? page}
            totalPages={data?.totalPages ?? 0}
            pageSize={pageSize}
            sortCol={sortCol}
            sortDir={sortDir}
            onPageChange={setPage}
            onSort={(col) => {
              if (col === sortCol) {
                setSortDir((prev) => (prev === "ASC" ? "DESC" : "ASC"));
              } else {
                setSortCol(col);
                setSortDir(col === "INSPECT_DATE" ? "DESC" : "ASC");
              }
              setPage(1);
            }}
          />
        )}
      </div>

      <DisplayFooter
        loading={isLoading}
        lastUpdated={data?.timestamp}
        statusText={data ? `${data.totalCount}건 조회됨` : undefined}
      />
    </div>
  );
}
