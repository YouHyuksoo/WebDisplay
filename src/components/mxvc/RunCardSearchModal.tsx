/**
 * @file src/components/mxvc/RunCardSearchModal.tsx
 * @description RUN_NO 조회 모달 — 날짜 구간으로 IP_PRODUCT_RUN_CARD 검색.
 * 초보자 가이드:
 * 1. 날짜 구간 입력 → 조회 → 작업지시 목록 표시
 * 2. 행 클릭 → RUN_NO 선택 → onSelect 콜백 호출 → 모달 닫힘
 * 3. 키워드 필터로 모델명/RUN_NO 검색 가능
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import Spinner from '@/components/ui/Spinner';

interface RunCard {
  RUN_NO: string;
  RUN_DATE: string;
  MODEL_NAME: string | null;
  LINE_CODE: string | null;
  LOT_SIZE: number | null;
  RUN_STATUS: string | null;
  LOT_NO: string | null;
  MFS_GROUP_NO: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (runNo: string) => void;
}

/** 오늘 날짜 YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 7일 전 */
function weekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function RunCardSearchModal({ isOpen, onClose, onSelect }: Props) {
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<RunCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/mxvc/traceability/runcards?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.runcards ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return rows;
    const kw = keyword.trim().toUpperCase();
    return rows.filter((r) =>
      r.RUN_NO.toUpperCase().includes(kw) ||
      (r.MODEL_NAME ?? '').toUpperCase().includes(kw) ||
      (r.LINE_CODE ?? '').toUpperCase().includes(kw),
    );
  }, [rows, keyword]);

  const [selected, setSelected] = useState('');

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700
                   w-[1100px] min-h-[70vh] max-h-[90vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">작업지시(RUN NO) 조회</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">×</button>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="h-8 px-2 text-xs rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            <span className="text-gray-400">~</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="h-8 px-2 text-xs rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="h-8 px-4 text-xs font-semibold rounded bg-blue-500 hover:bg-blue-600
                       text-white disabled:opacity-50 transition-colors">
            조회
          </button>
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="RUN NO / 모델명 필터"
            className="h-8 px-2 text-xs rounded border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-44
                       placeholder:text-gray-400" />
          <span className="ml-auto text-xs text-gray-400">{filtered.length}/{rows.length}건</span>
        </div>

        {/* 에러 */}
        {error && (
          <div className="px-5 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20">{error}</div>
        )}

        {/* 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">RUN NO</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">날짜</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">모델</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">라인</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">수량</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">LOT NO</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">MFS그룹</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300">상태</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="py-8 text-center">
                  <Spinner size="sm" label="조회 중..." />
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">
                  {rows.length === 0 ? '날짜를 선택하고 조회하세요' : '검색 결과 없음'}
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.RUN_NO}
                    onClick={() => setSelected(r.RUN_NO)}
                    className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors
                      ${selected === r.RUN_NO
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                  <td className="px-4 py-2.5 font-mono font-medium text-blue-600 dark:text-blue-400">{r.RUN_NO}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{r.RUN_DATE}</td>
                  <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{r.MODEL_NAME ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{r.LINE_CODE ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{r.LOT_SIZE ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-300">{r.LOT_NO ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-300">{r.MFS_GROUP_NO ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{r.RUN_STATUS ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단 버튼 */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selected ? `선택: ${selected}` : '행을 선택하세요'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600
                         text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button onClick={handleConfirm} disabled={!selected}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-500 hover:bg-blue-600
                         text-white disabled:opacity-40 transition-colors">
              선택
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
