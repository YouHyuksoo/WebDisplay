/**
 * @file src/components/mxvc/PostProcessDashboard.tsx
 * @description 후공정생산현황 대시보드 — 필터바 + 레이아웃 오케스트레이터
 * 초보자 가이드:
 * 1. DisplayHeader: 상단 제목 + 화면 ID 기반 설정 연동
 * 2. 필터바: 기간(dateFrom~dateTo), 오늘 버튼, 새로고침
 * 3. PostProcessKpiCards: 생산달성율/계획/실적/불량율/재검사율/수리
 * 4. PostProcessFpyChart: 5개 검사공정 직행율 통합 LineChart
 * 5. PostProcessMagazineTable: 매거진 대기재공 현황
 * 6. DisplayFooter: 마지막 갱신 시각
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { useServerTime } from '@/hooks/useServerTime';
import PostProcessKpiCards from './PostProcessKpiCards';
import PostProcessFpyChart from './PostProcessFpyChart';
import PostProcessMagazineTable from './PostProcessMagazineTable';
import type { PostProcessResponse, PostProcessSettings } from '@/types/mxvc/post-process';

const SCREEN_ID = 'mxvc-post-process';

const inputCls =
  'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs';

const EMPTY_KPI = {
  planQty: 0, targetQty: 0, actualQty: 0, achievementRate: 0,
  defectRate: 0, retestRate: 0, repairWaiting: 0, repairDone: 0,
};

export default function PostProcessDashboard() {
  const timing      = useDisplayTiming();
  const serverToday = useServerTime();

  const [settings, setSettings] = useState<PostProcessSettings>({ dateFrom: '', dateTo: '' });
  const [data,     setData]     = useState<PostProcessResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  /* 서버 날짜 로드 후 기본 기간 설정: 당일 08:00 ~ 현재 */
  useEffect(() => {
    if (!serverToday || settings.dateFrom) return;
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    setSettings({ dateFrom: `${serverToday}T08:00`, dateTo: `${serverToday}T${hh}:${mm}` });
  }, [serverToday, settings.dateFrom]);

  const fetchData = useCallback(async () => {
    if (!settings.dateFrom) return;
    setLoading(true);
    try {
      const qs  = new URLSearchParams({ dateFrom: settings.dateFrom, dateTo: settings.dateTo });
      const res = await fetch(`/api/mxvc/post-process?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [settings.dateFrom, settings.dateTo]);

  /* 자동 갱신 */
  useEffect(() => {
    if (!settings.dateFrom) return;
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds, settings.dateFrom]);

  const setToday = () => {
    const now   = new Date();
    const hh    = String(now.getHours()).padStart(2, '0');
    const mm    = String(now.getMinutes()).padStart(2, '0');
    const today = serverToday ?? now.toISOString().slice(0, 10);
    setSettings({ dateFrom: `${today}T08:00`, dateTo: `${today}T${hh}:${mm}` });
  };

  const kpi = data?.kpi ?? EMPTY_KPI;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="후공정생산현황" screenId={SCREEN_ID} />

      {/* ── 필터바 ── */}
      <div className="shrink-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap min-h-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">기간</span>
            <input
              type="datetime-local"
              value={settings.dateFrom}
              onChange={(e) => setSettings((s) => ({ ...s, dateFrom: e.target.value }))}
              className={`${inputCls} w-44`}
            />
            <span className="text-xs text-gray-500">~</span>
            <input
              type="datetime-local"
              value={settings.dateTo}
              onChange={(e) => setSettings((s) => ({ ...s, dateTo: e.target.value }))}
              className={`${inputCls} w-44`}
            />
            <button
              onClick={setToday}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              오늘
            </button>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? '조회 중...' : '새로고침'}
          </button>
          {error && (
            <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-xs" title={error}>
              오류: {error}
            </span>
          )}
        </div>
      </div>

      {/* ── 콘텐츠 영역 ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* KPI 카드 */}
        <PostProcessKpiCards kpi={kpi} />

        {/* 로딩/에러 오버레이 */}
        {loading && !data && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
            <span className="w-8 h-8 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            데이터 조회 중...
          </div>
        )}

        {/* 차트 + 테이블 */}
        {data && (
          <>
            <PostProcessFpyChart fpyChart={data.fpyChart} />
            <PostProcessMagazineTable magazine={data.magazine} />
          </>
        )}
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
