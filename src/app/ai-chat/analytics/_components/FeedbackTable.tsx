/**
 * @file src/app/ai-chat/analytics/_components/FeedbackTable.tsx
 * @description 피드백 목록 테이블 — 체크박스 선택, 페이지네이션, 행 클릭 상세 보기.
 *
 * 초보자 가이드:
 * - 평점 배지: ThumbsUp(초록), ThumbsDown(빨강) 아이콘 + 색상
 * - 질문 80자 truncate, 응답시간 초 단위
 * - 페이지네이션: <<, <, page/total, >, >>
 */
'use client';

import { ThumbsUp, ThumbsDown, Minus, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

/** 피드백 행 타입 */
export interface FeedbackRow {
  FEEDBACK_ID: string;
  MESSAGE_ID: string;
  SESSION_ID: string;
  RATING: string;
  USER_QUERY: string;
  LLM_RESPONSE: string;
  SQL_QUERY: string | null;
  RESULT_JSON: string | null;
  PROVIDER_ID: string;
  MODEL_ID: string;
  TOTAL_MS: number;
  SQL_GEN_MS: number;
  SQL_EXEC_MS: number;
  ANALYSIS_MS: number;
  CREATED_AT: string;
}

interface Props {
  rows: FeedbackRow[];
  page: number;
  totalPages: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onPageChange: (p: number) => void;
  onSelect: (row: FeedbackRow) => void;
}

/** 평점 배지 */
function RatingBadge({ rating }: { rating: string }) {
  if (rating === 'POSITIVE') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"><ThumbsUp size={13} /> 긍정</span>;
  }
  if (rating === 'NEGATIVE') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400"><ThumbsDown size={13} /> 부정</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400"><Minus size={13} /> 중립</span>;
}

/** 텍스트 truncate */
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/** 페이지 버튼 */
function PgBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
    >
      {children}
    </button>
  );
}

export default function FeedbackTable({ rows, page, totalPages, selectedIds, onToggle, onToggleAll, onPageChange, onSelect }: Props) {
  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.has(r.FEEDBACK_ID));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2 w-10">
                <input type="checkbox" checked={allChecked} onChange={onToggleAll}
                  className="accent-blue-500 rounded" />
              </th>
              <th className="px-3 py-2">평점</th>
              <th className="px-3 py-2">질문</th>
              <th className="px-3 py-2">프로바이더</th>
              <th className="px-3 py-2 text-right">응답시간</th>
              <th className="px-3 py-2 text-right">일시</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.FEEDBACK_ID}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition"
                onClick={() => onSelect(r)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(r.FEEDBACK_ID)}
                    onChange={() => onToggle(r.FEEDBACK_ID)} className="accent-blue-500 rounded" />
                </td>
                <td className="px-3 py-2"><RatingBadge rating={r.RATING} /></td>
                <td className="px-3 py-2 text-gray-900 dark:text-white">{truncate(r.USER_QUERY || '-', 80)}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.PROVIDER_ID}</td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{(r.TOTAL_MS / 1000).toFixed(1)}s</td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(r.CREATED_AT).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">피드백 데이터가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-200 dark:border-gray-800">
        <PgBtn disabled={page <= 1} onClick={() => onPageChange(1)}><ChevronFirst size={16} /></PgBtn>
        <PgBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16} /></PgBtn>
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px] text-center">{page} / {totalPages || 1}</span>
        <PgBtn disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight size={16} /></PgBtn>
        <PgBtn disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}><ChevronLast size={16} /></PgBtn>
      </div>
    </div>
  );
}
