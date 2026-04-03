/**
 * @file src/app/(mxvc)/mxvc/inspect-result/page.tsx
 * @description 설비호출저장이력 검색 페이지 — IQ_MACHINE_INSPECT_RESULT
 * 초보자 가이드:
 * 1. 좌측 사이드바: LINE/머신 체크박스 다중선택
 * 2. 상단 필터: 날짜/IS_LAST/키워드 + 검색 버튼
 * 3. AG Grid 서버 페이지네이션
 */
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import InspectResultGrid from "@/components/mxvc/InspectResultGrid";
import type { InspectResultFilters } from "@/lib/queries/inspect-result";
import { useServerTime } from "@/hooks/useServerTime";

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

const inputClass = "rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

export default function InspectResultPage() {
  const t = useTranslations("common");
  const serverToday = useServerTime();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (serverToday && !fromDate) {
      setFromDate(serverToday);
      setToDate(serverToday);
    }
  }, [serverToday, fromDate]);
  const [keyword, setKeyword] = useState("");
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [selectedWorkstages, setSelectedWorkstages] = useState<Set<string>>(new Set());
  const [isLast, setIsLast] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortCol, setSortCol] = useState("INSPECT_DATE");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [searchTrigger, setSearchTrigger] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: filterOpts } = useSWR<InspectResultFilters>(
    `${API_BASE}?mode=filters`, fetcher, { revalidateOnFocus: false },
  );

  const lineParam = useMemo(() => Array.from(selectedLines).join(","), [selectedLines]);
  const machineParam = useMemo(() => Array.from(selectedMachines).join(","), [selectedMachines]);
  const workstageParam = useMemo(() => Array.from(selectedWorkstages).join(","), [selectedWorkstages]);

  const filterQs = `fromDate=${fromDate}&toDate=${toDate}`
    + `&keyword=${encodeURIComponent(keyword)}`
    + `&lineCode=${encodeURIComponent(lineParam)}`
    + `&machineCode=${encodeURIComponent(machineParam)}`
    + `&workstageCode=${encodeURIComponent(workstageParam)}`
    + `&isLast=${encodeURIComponent(isLast)}`
    + `&sortCol=${sortCol}&sortDir=${sortDir}`;

  const apiUrl = searchTrigger
    ? `${API_BASE}?${filterQs}&page=${page}&pageSize=${pageSize}`
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

  const toggleLine = (v: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const toggleWorkstage = (v: string) => {
    setSelectedWorkstages((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const toggleMachine = (v: string) => {
    setSelectedMachines((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="설비호출저장이력" screenId={SCREEN_ID} />

      {/* 상단 필터 바: 날짜 + IS_LAST + 키워드 + 검색 */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">기간</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
          <span className="text-gray-400">~</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">IS_LAST</label>
          <select value={isLast} onChange={(e) => setIsLast(e.target.value)} className={inputClass}>
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

        <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
          {selectedLines.size > 0 && <span>LINE {selectedLines.size}개</span>}
          {selectedMachines.size > 0 && <span>머신 {selectedMachines.size}개</span>}
          {selectedWorkstages.size > 0 && <span>공정 {selectedWorkstages.size}개</span>}
        </div>
      </div>

      {/* 본문: 사이드바 + 결과 */}
      <div className="flex flex-1 min-h-0">
        {/* 사이드바 토글 버튼 (접힌 상태) */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-28 left-0 z-20 p-1.5 rounded-r-md bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-700 text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
            title="사이드바 열기"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* 사이드바: LINE + 머신 체크박스 */}
        <div className={`
          relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "w-0 min-w-0 p-0 overflow-hidden border-none" : "w-[260px] min-w-[260px]"}
        `}>
          <div className={sidebarCollapsed ? "hidden" : "p-3 flex flex-col gap-3 h-full"}>
            {/* 접기 버튼 */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="shrink-0 self-end p-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-400 hover:text-blue-500"
              title="접기"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* LINE 체크박스 */}
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">LINE</span>
                <button
                  onClick={() => setSelectedLines(new Set())}
                  className="text-[9px] text-blue-500 hover:text-blue-400"
                >
                  초기화
                </button>
              </div>
              <div className="space-y-0.5">
                {filterOpts?.lineCodeList.map((v) => (
                  <label key={v.value} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedLines.has(v.value)}
                      onChange={() => toggleLine(v.value)}
                      className="accent-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{v.label}</span>
                  </label>
                ))}
                {!filterOpts?.lineCodeList.length && (
                  <span className="text-[10px] text-gray-400">{t("loading")}</span>
                )}
              </div>
            </div>

            {/* 머신 체크박스 */}
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">머신</span>
                <button
                  onClick={() => setSelectedMachines(new Set())}
                  className="text-[9px] text-blue-500 hover:text-blue-400"
                >
                  초기화
                </button>
              </div>
              <div className="space-y-0.5">
                {filterOpts?.machineCodeList.map((v) => (
                  <label key={v.value} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedMachines.has(v.value)}
                      onChange={() => toggleMachine(v.value)}
                      className="accent-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{v.label}</span>
                  </label>
                ))}
                {!filterOpts?.machineCodeList.length && (
                  <span className="text-[10px] text-gray-400">{t("loading")}</span>
                )}
              </div>
            </div>

            {/* 공정코드 체크박스 — 남은 공간 최대 활용 */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-1.5 shrink-0">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">공정</span>
                <button
                  onClick={() => setSelectedWorkstages(new Set())}
                  className="text-[9px] text-blue-500 hover:text-blue-400"
                >
                  초기화
                </button>
              </div>
              <div className="space-y-0.5 overflow-y-auto flex-1">
                {filterOpts?.workstageCodeList.map((v) => (
                  <label key={v.value} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedWorkstages.has(v.value)}
                      onChange={() => toggleWorkstage(v.value)}
                      className="accent-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{v.label}</span>
                  </label>
                ))}
                {!filterOpts?.workstageCodeList.length && (
                  <span className="text-[10px] text-gray-400">{t("loading")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 영역 */}
        <div className="flex-1 min-w-0 overflow-hidden">
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
              exportParams={filterQs}
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
      </div>

      <DisplayFooter
        loading={isLoading}
        lastUpdated={data?.timestamp}
        statusText={data ? `${data.totalCount}건 조회됨` : undefined}
      />
    </div>
  );
}
