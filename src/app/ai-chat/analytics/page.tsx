/**
 * @file src/app/ai-chat/analytics/page.tsx
 * @description AI 챗 분석 대시보드 — 통계 카드, 일별 차트, TOP 질문, 프로바이더 비교, 피드백 목록.
 *
 * 초보자 가이드:
 * - SWR로 stats / list API 동시 호출
 * - 필터 바: 기간 프리셋(오늘/7일/30일/전체), 평점, 프로바이더, 조회 버튼
 * - 선택삭제 / 전체삭제 핸들러 (alert/confirm 사용 금지 → 인라인 확인)
 * - 하위 컴포넌트: StatsCards, DailyChart, FeedbackTable, FeedbackDetailModal
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Search, Trash2, X } from 'lucide-react';
import StatsCards from './_components/StatsCards';
import DailyChart from './_components/DailyChart';
import FeedbackTable from './_components/FeedbackTable';
import FeedbackDetailModal from './_components/FeedbackDetailModal';
import type { StatsData } from './_components/StatsCards';
import type { FeedbackRow } from './_components/FeedbackTable';

/* ── 기간 프리셋 (key 는 i18n 키, 라벨은 런타임에 t() 로 변환) ── */
const PRESETS = [
  { key: 'today', days: 0 },
  { key: 'days7', days: 7 },
  { key: 'days30', days: 30 },
  { key: 'all', days: -1 },
] as const;

/** SWR fetcher */
const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** 날짜 → YYYY-MM-DD */
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** 프리셋으로 from/to 계산 */
function presetRange(days: number): { from: string; to: string } {
  const now = new Date();
  const to = fmtDate(now);
  if (days <= 0) return { from: '', to: '' };
  if (days === 0) return { from: to, to };
  const past = new Date(now);
  past.setDate(past.getDate() - days);
  return { from: fmtDate(past), to };
}

/* ── stats 응답 확장 ── */
interface StatsResponse extends StatsData {
  dailyUsage: { date: string; count: number; positive: number }[];
  topQueries: { query: string; count: number }[];
  providerStats: { providerId: string; count: number; positiveRate: number; avgTotalMs: number }[];
}

interface ListResponse {
  rows: FeedbackRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AnalyticsPage() {
  const t = useTranslations('aiChat.analytics');
  /* ── 필터 상태 ── */
  const [preset, setPreset] = useState(1); // 7일
  const [dateFrom, setDateFrom] = useState(() => presetRange(7).from);
  const [dateTo, setDateTo] = useState(() => presetRange(7).to);
  const [rating, setRating] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);

  /* ── 검색 파라미터 (조회 버튼 클릭 시 갱신) ── */
  const [searchKey, setSearchKey] = useState(0);
  const qp = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    if (rating) p.set('rating', rating);
    if (provider) p.set('provider', provider);
    return p.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  /* ── SWR 호출 ── */
  const { data: stats, mutate: mutateStats } = useSWR<StatsResponse>(
    `/api/ai-chat/feedback?mode=stats${qp ? `&${qp}` : ''}`, fetcher,
  );
  const { data: list, mutate: mutateList } = useSWR<ListResponse>(
    `/api/ai-chat/feedback?mode=list&page=${page}&pageSize=20${qp ? `&${qp}` : ''}`, fetcher,
  );

  /* ── 프리셋 클릭 ── */
  const handlePreset = (idx: number) => {
    setPreset(idx);
    const { from, to } = presetRange(PRESETS[idx].days);
    setDateFrom(from);
    setDateTo(to);
  };

  /* ── 조회 ── */
  const handleSearch = () => { setPage(1); setSearchKey((k) => k + 1); };

  /* ── 선택 삭제 ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (!list?.rows) return;
    const allIds = list.rows.map((r) => r.FEEDBACK_ID);
    const allChecked = allIds.every((id) => selectedIds.has(id));
    setSelectedIds(allChecked ? new Set() : new Set(allIds));
  };

  const handleDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    await fetch('/api/ai-chat/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds] }),
    });
    setSelectedIds(new Set());
    setDeleteConfirm(false);
    setDeleting(false);
    mutateStats();
    mutateList();
  }, [selectedIds, mutateStats, mutateList]);

  /* ── 상세 모달 ── */
  const [detail, setDetail] = useState<FeedbackRow | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 space-y-5">
      {/* 제목 */}
      <div className="flex items-center gap-3">
        <Link href="/ai-chat" className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('pageTitle')}</h1>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        {/* 프리셋 */}
        <div className="flex gap-1">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => handlePreset(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${preset === i
                ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {t(`presets.${p.key}`)}
            </button>
          ))}
        </div>

        {/* 날짜 */}
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPreset(-1); }}
          className="h-8 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        <span className="text-gray-400 text-xs">~</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPreset(-1); }}
          className="h-8 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />

        {/* 평점 */}
        <select value={rating} onChange={(e) => setRating(e.target.value)}
          className="h-8 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
          <option value="">{t('ratingAll')}</option>
          <option value="POSITIVE">{t('ratingPositive')}</option>
          <option value="NEGATIVE">{t('ratingNegative')}</option>
          <option value="NEUTRAL">{t('ratingNeutral')}</option>
        </select>

        {/* 프로바이더 */}
        <select value={provider} onChange={(e) => setProvider(e.target.value)}
          className="h-8 px-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
          <option value="">{t('providerAll')}</option>
          {(stats?.providerStats ?? []).map((p) => (
            <option key={p.providerId} value={p.providerId}>{p.providerId}</option>
          ))}
        </select>

        {/* 조회 */}
        <button onClick={handleSearch}
          className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition">
          <Search size={14} /> {t('search')}
        </button>
      </div>

      {/* 통계 카드 */}
      <StatsCards stats={stats} />

      {/* 일별 차트 */}
      <DailyChart dailyUsage={stats?.dailyUsage} />

      {/* TOP 질문 + 프로바이더 비교 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP 질문 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('topQuestions')}</h3>
          {(stats?.topQueries ?? []).length === 0
            ? <p className="text-xs text-gray-400">{t('noData')}</p>
            : <ul className="space-y-1.5">
                {stats!.topQueries.slice(0, 10).map((q, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-right text-gray-400 font-mono">{i + 1}</span>
                    <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{q.query}</span>
                    <span className="text-gray-400">{t('countItems', { count: q.count })}</span>
                  </li>
                ))}
              </ul>
          }
        </div>

        {/* 프로바이더 비교 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('providerCompare')}</h3>
          {(stats?.providerStats ?? []).length === 0
            ? <p className="text-xs text-gray-400">{t('noData')}</p>
            : <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 text-left">
                    <th className="pb-1">{t('col.provider')}</th><th className="pb-1 text-right">{t('col.count')}</th>
                    <th className="pb-1 text-right">{t('col.positiveRate')}</th><th className="pb-1 text-right">{t('col.avgResponse')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats!.providerStats.map((p) => (
                    <tr key={p.providerId} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-1 text-gray-800 dark:text-gray-200">{p.providerId}</td>
                      <td className="py-1 text-right text-gray-600 dark:text-gray-400">{p.count}</td>
                      <td className="py-1 text-right text-green-600 dark:text-green-400">{p.positiveRate.toFixed(1)}%</td>
                      <td className="py-1 text-right text-gray-600 dark:text-gray-400">{(p.avgTotalMs / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>

      {/* 삭제 액션 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2">
          <span className="text-xs text-gray-600 dark:text-gray-300">{t('selectedCount', { count: selectedIds.size })}</span>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition">
              <Trash2 size={13} /> {t('delete')}
            </button>
          ) : (
            <>
              <span className="text-xs text-red-500 font-medium">{t('confirmDelete')}</span>
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg disabled:opacity-50">
                {deleting ? t('deleting') : t('confirm')}
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <X size={14} className="text-gray-500" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 피드백 테이블 */}
      <FeedbackTable
        rows={list?.rows ?? []}
        page={list?.page ?? 1}
        totalPages={list?.totalPages ?? 1}
        selectedIds={selectedIds}
        onToggle={toggleId}
        onToggleAll={toggleAll}
        onPageChange={(p) => setPage(p)}
        onSelect={setDetail}
      />

      {/* 상세 모달 */}
      <FeedbackDetailModal feedback={detail} isOpen={!!detail} onClose={() => setDetail(null)} />
    </div>
  );
}
