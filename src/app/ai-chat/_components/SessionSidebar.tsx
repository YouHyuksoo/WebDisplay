/**
 * @file src/app/ai-chat/_components/SessionSidebar.tsx
 * @description 좌측 세션 목록 — 신규 / 단건 삭제 / 다건 선택 + 일괄 삭제.
 *   alert/confirm 사용 금지 — 인라인 확인 UI 사용.
 *
 * 초보자 가이드:
 * - `selectMode` = true 이면 체크박스 노출, 행 클릭 시 선택 토글 (네비게이션 X)
 * - 일괄 삭제는 `Promise.allSettled`로 병렬 호출 → 부분 실패도 허용
 * - 현재 선택된 세션이 삭제 대상에 포함되면 onSelect('')로 해제
 */
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, MessageSquareText, Trash2, Check, X, ListChecks, Square, CheckSquare, BarChart3 } from 'lucide-react';
import type { SessionMeta } from '@/lib/ai/chat-store';

interface Props {
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

export default function SessionSidebar({ currentSessionId, onSelect, onNew }: Props) {
  const t = useTranslations('aiChat');
  const tc = useTranslations('common');
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // 다건 선택 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/ai-chat/sessions');
    const d = await r.json();
    setSessions(d.sessions || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refresh(); }, [currentSessionId, refresh]);

  const handleDelete = async (sid: string) => {
    await fetch(`/api/ai-chat/sessions/${sid}`, { method: 'DELETE' });
    if (currentSessionId === sid) onSelect('');
    setConfirmDeleteId(null);
    refresh();
  };

  // 선택 모드 토글 — 진입/해제 시 선택 초기화
  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
    setBulkConfirm(false);
    setConfirmDeleteId(null);
  }, []);

  const toggleSelected = useCallback((sid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  }, []);

  const allSelected = useMemo(
    () => sessions.length > 0 && selectedIds.size === sessions.length,
    [sessions.length, selectedIds.size],
  );

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sessions.map((s) => s.sessionId)));
  }, [allSelected, sessions]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selectedIds);
    // 서버에서 원자적으로 일괄 삭제 (index.json lost-update 방지)
    try {
      await fetch('/api/ai-chat/sessions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds: ids }),
      });
    } catch (e) {
      console.error('[bulk-delete]', e);
    }
    // 현재 세션이 삭제 대상이면 해제
    if (currentSessionId && selectedIds.has(currentSessionId)) onSelect('');
    setSelectedIds(new Set());
    setBulkConfirm(false);
    setSelectMode(false);
    setBulkBusy(false);
    refresh();
  }, [selectedIds, currentSessionId, onSelect, refresh]);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 헤더 — 새 대화 / 선택 모드 토글 */}
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800 space-y-2">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          <Plus className="size-4" />
          {t('newChat')}
        </button>
        <button
          onClick={toggleSelectMode}
          className={`flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            selectMode
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
          title={selectMode ? t('selectModeOff') : t('selectMultipleSessions')}
        >
          {selectMode ? <X className="size-3.5" /> : <ListChecks className="size-3.5" />}
          {selectMode ? t('cancelSelect') : t('selectMode')}
        </button>
      </div>

      {/* 선택 요약 바 — 선택 모드일 때만 노출 */}
      {selectMode && sessions.length > 0 && (
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1 text-zinc-600 hover:text-cyan-600 dark:text-zinc-300 dark:hover:text-cyan-400"
          >
            {allSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
            {allSelected ? t('deselectAll') : t('selectAll')}
          </button>
          <span className="text-zinc-500 dark:text-zinc-400">
            {t('selectedCount', { selected: selectedIds.size, total: sessions.length })}
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-zinc-500">{t('noSessions')}</div>
        )}
        {sessions.map((s) => {
          const isChecked = selectedIds.has(s.sessionId);
          return (
            <div key={s.sessionId}>
              <button
                onClick={() => (selectMode ? toggleSelected(s.sessionId) : onSelect(s.sessionId))}
                className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                  selectMode && isChecked
                    ? 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100'
                    : currentSessionId === s.sessionId && !selectMode
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                }`}
              >
                {selectMode ? (
                  isChecked
                    ? <CheckSquare className="size-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    : <Square className="size-4 shrink-0 text-zinc-400" />
                ) : (
                  <MessageSquareText className="size-4 shrink-0 text-zinc-400" />
                )}
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                {/* 단건 삭제 — 선택 모드가 아닐 때만 노출 */}
                {!selectMode && (
                  <Trash2
                    className="size-4 shrink-0 text-zinc-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.sessionId); }}
                  />
                )}
              </button>
              {/* 단건 삭제 인라인 확인 */}
              {!selectMode && confirmDeleteId === s.sessionId && (
                <div className="ml-6 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs dark:bg-red-950/30">
                  <span className="flex-1 text-red-600 dark:text-red-400">{t('deleteQ')}</span>
                  <button onClick={() => handleDelete(s.sessionId)}
                    className="rounded p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50">
                    <Check className="size-3" />
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 분석 페이지 링크 */}
      <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <Link
          href="/ai-chat/analytics"
          className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
        >
          <BarChart3 className="size-4" />
          <span>{t('analyticsLink')}</span>
        </Link>
      </div>

      {/* 하단 일괄 삭제 액션 바 — 선택 모드 + 1개 이상 선택 시 */}
      {selectMode && selectedIds.size > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {!bulkConfirm ? (
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={bulkBusy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              {t('deleteSelectedCount', { count: selectedIds.size })}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs dark:bg-red-950/30">
              <span className="flex-1 text-red-600 dark:text-red-400">
                {t('deleteCountQ', { count: selectedIds.size })}
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkBusy}
                className="rounded p-1 text-red-600 hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/50"
                title={tc('delete')}
              >
                {bulkBusy
                  ? <span className="size-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  : <Check className="size-3" />}
              </button>
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={bulkBusy}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 disabled:opacity-50 dark:hover:bg-zinc-700"
                title={tc('cancel')}
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
