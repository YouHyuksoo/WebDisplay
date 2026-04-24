/**
 * @file src/app/ai-chat/analytics/_components/FeedbackDetailModal.tsx
 * @description 피드백 상세 모달 — 메타, 성능 바, 질문, AI 응답(마크다운), SQL.
 *
 * 초보자 가이드:
 * - ESC 키 또는 오버레이 클릭으로 닫기
 * - 성능 바: SQL생성/실행/분석/전체 4개 표시
 * - AI 응답은 ReactMarkdown + remarkGfm으로 렌더링
 */
'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import type { FeedbackRow } from './FeedbackTable';

interface Props {
  feedback: FeedbackRow | null;
  isOpen: boolean;
  onClose: () => void;
}

/** 평점 배지 (큰 사이즈) */
function RatingBadge({ rating }: { rating: string }) {
  const t = useTranslations('aiChat.analytics');
  if (rating === 'POSITIVE') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"><ThumbsUp size={13} /> {t('ratingPositive')}</span>;
  if (rating === 'NEGATIVE') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"><ThumbsDown size={13} /> {t('ratingNegative')}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"><Minus size={13} /> {t('ratingNeutral')}</span>;
}

/** 성능 수평 바 */
function PerfBar({ label, ms, maxMs, color }: { label: string; ms: number; maxMs: number; color: string }) {
  const pct = maxMs > 0 ? Math.min(100, (ms / maxMs) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-gray-500 dark:text-gray-400">{(ms / 1000).toFixed(2)}s</span>
    </div>
  );
}

export default function FeedbackDetailModal({ feedback, isOpen, onClose }: Props) {
  const t = useTranslations('aiChat.analytics');
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  if (!isOpen || !feedback) return null;

  const maxMs = Math.max(feedback.TOTAL_MS, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <RatingBadge rating={feedback.RATING} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{feedback.PROVIDER_ID} / {feedback.MODEL_ID}</span>
            <span className="text-xs text-gray-400">
              {new Date(feedback.CREATED_AT).toLocaleString('ko-KR')}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 성능 바 */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('perfSection')}</h4>
            <PerfBar label={t('perfSqlGen')} ms={feedback.SQL_GEN_MS} maxMs={maxMs} color="bg-blue-500" />
            <PerfBar label={t('perfSqlExec')} ms={feedback.SQL_EXEC_MS} maxMs={maxMs} color="bg-cyan-500" />
            <PerfBar label={t('perfAnalysis')} ms={feedback.ANALYSIS_MS} maxMs={maxMs} color="bg-purple-500" />
            <PerfBar label={t('perfTotal')} ms={feedback.TOTAL_MS} maxMs={maxMs} color="bg-amber-500" />
          </div>

          {/* 사용자 질문 */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('userQuestion')}</h4>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{feedback.USER_QUERY || '-'}</p>
          </div>

          {/* AI 응답 */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('aiResponse')}</h4>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {feedback.LLM_RESPONSE || '-'}
              </ReactMarkdown>
            </div>
          </div>

          {/* SQL */}
          {feedback.SQL_QUERY && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">SQL</h4>
              <pre className="bg-gray-100 dark:bg-gray-800 text-xs p-3 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200">
                {feedback.SQL_QUERY}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
