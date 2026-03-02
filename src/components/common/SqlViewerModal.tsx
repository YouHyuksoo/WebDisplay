/**
 * @file SqlViewerModal.tsx
 * @description 각 페이지에 적용된 SQL 쿼리를 보여주는 모달.
 * DisplayHeader의 설정 버튼에서 열 수 있으며, 탭으로 여러 쿼리를 전환합니다.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SqlEntry } from '@/lib/queries/sql-registry';

interface SqlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenId: string;
}

export default function SqlViewerModal({ isOpen, onClose, screenId }: SqlViewerModalProps) {
  const [queries, setQueries] = useState<SqlEntry[]>([]);
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSql = useCallback(async () => {
    if (!screenId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/debug/sql?screenId=${screenId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '알 수 없는 오류');
        setQueries([]);
        return;
      }
      const data = await res.json();
      setTitle(data.title ?? `화면 ${screenId}`);
      setQueries(data.queries ?? []);
      setActiveTab(0);
    } catch {
      setError('SQL 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [screenId]);

  useEffect(() => {
    if (isOpen) loadSql();
  }, [isOpen, loadSql]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    const sql = queries[activeTab]?.sql ?? '';
    await navigator.clipboard.writeText(sql.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              SQL Viewer
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-white">
              {title || `화면 ${screenId}`}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* 복사 버튼 */}
            {queries.length > 0 && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-400"
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    복사됨!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    복사
                  </>
                )}
              </button>
            )}
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 탭 ── */}
        {queries.length > 1 && (
          <div className="flex shrink-0 gap-1 border-b border-zinc-800 px-6 pt-3">
            {queries.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === i
                    ? 'bg-zinc-800 text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {/* ── 본문 ── */}
        <div className="min-h-0 flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex h-40 items-center justify-center text-zinc-500">
              <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              로딩 중...
            </div>
          )}

          {!loading && error && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-red-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
              </svg>
              <p className="text-sm">{error}</p>
              <p className="text-xs text-zinc-600">이 화면의 SQL이 sql-registry.ts에 등록되지 않았습니다.</p>
            </div>
          )}

          {!loading && !error && queries.length > 0 && (
            <div className="relative">
              {/* SQL 코드 블록 */}
              <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-5 font-mono text-sm leading-relaxed text-emerald-300">
                <SqlHighlight sql={queries[activeTab]?.sql ?? ''} />
              </pre>

              {/* 쿼리 단독인 경우 탭 레이블을 코드 블록 위에 표시 */}
              {queries.length === 1 && (
                <span className="absolute left-4 top-3 rounded bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-400">
                  {queries[0].label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="shrink-0 border-t border-zinc-800 px-6 py-3 text-xs text-zinc-600">
          화면 ID: {screenId} &nbsp;·&nbsp; 총 {queries.length}개 쿼리&nbsp;
          {queries[activeTab] && (
            <>
              · &nbsp;현재: {queries[activeTab].label}&nbsp;
              ({queries[activeTab].sql.trim().split('\n').length} lines)
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** SQL 키워드 강조 (간단한 클라이언트 사이드 하이라이팅) */
function SqlHighlight({ sql }: { sql: string }) {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'BY', 'GROUP',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'IN',
    'NOT', 'NULL', 'IS', 'LIKE', 'BETWEEN', 'HAVING', 'UNION', 'ALL',
    'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP',
    'DISTINCT', 'TOP', 'LIMIT', 'OFFSET', 'CASE', 'WHEN', 'THEN',
    'ELSE', 'END', 'EXISTS', 'WITH', 'DECODE', 'NVL', 'TRUNC',
    'ROUND', 'SUM', 'COUNT', 'MAX', 'MIN', 'AVG', 'SYSDATE',
  ];

  const lines = sql.trim().split('\n');

  return (
    <>
      {lines.map((line, li) => {
        // 주석 줄
        if (line.trim().startsWith('--') || line.trim().startsWith('/*')) {
          return (
            <span key={li} className="text-zinc-500">
              {line}
              {'\n'}
            </span>
          );
        }

        // 키워드 강조
        const parts = line.split(/(\s+|,|\(|\))/);
        return (
          <span key={li}>
            {parts.map((part, pi) => {
              if (keywords.includes(part.trim().toUpperCase())) {
                return <span key={pi} className="font-bold text-sky-400">{part}</span>;
              }
              if (/^:\w+$/.test(part.trim())) {
                return <span key={pi} className="text-amber-400">{part}</span>;
              }
              if (/^'[^']*'$/.test(part.trim())) {
                return <span key={pi} className="text-orange-300">{part}</span>;
              }
              return <span key={pi}>{part}</span>;
            })}
            {'\n'}
          </span>
        );
      })}
    </>
  );
}
