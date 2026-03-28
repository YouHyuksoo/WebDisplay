/**
 * @file LineSelectModal.tsx
 * @description 라인 선택 모달 - SOLUMCTQ 스타일 그룹별 체크박스 선택.
 * 초보자 가이드:
 * 1. **createPortal**: document.body에 직접 렌더링하여 z-index 충돌 방지
 * 2. **그룹 선택**: line_product_division_name별로 묶어 전체선택/해제 토글
 * 3. **indeterminate**: 그룹 내 일부만 선택 시 체크박스에 '-' 표시
 * 4. **required 모드**: 최초 진입 시 닫기 불가, 1개+ 선택 필수
 * 5. **localStorage 연동**: 선택 결과를 화면별로 저장하고 이벤트 발행
 * PB 원본: w_line_multi_select_flat 대응
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { DEFAULT_TIMING_CONFIG } from '@/types/option';
import type { DisplayTimingConfig } from '@/types/option';
import { saveTiming, loadTiming } from '@/hooks/useDisplayTiming';
import { DEFAULT_ORG_ID } from '@/lib/display-helpers';

/* ───────────── 타입 ───────────── */

interface LineItem {
  lineCode: string;
  lineName: string;
}

interface LineGroup {
  division: string;
  lines: LineItem[];
}

interface LineSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenId: string;
  /** true이면 최소 1개 이상 선택 필수 (저장값 없으면 닫기 불가) */
  required?: boolean;
}

/* ───────────── 상수 ───────────── */

const STORAGE_PREFIX = 'display-lines-';
const EVENT_PREFIX = 'line-config-changed-';

/* ───────────── 컴포넌트 ───────────── */

export default function LineSelectModal({
  isOpen,
  onClose,
  screenId,
  required = false,
}: LineSelectModalProps) {
  const t = useTranslations('display');

  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [timing, setTiming] = useState<DisplayTimingConfig>(DEFAULT_TIMING_CONFIG);

  /** 저장값이 이미 존재하는지 여부 */
  const hasSaved =
    typeof window !== 'undefined' &&
    localStorage.getItem(`${STORAGE_PREFIX}${screenId}`) !== null;

  /* ── 모달 열릴 때 데이터 fetch + localStorage 복원 ── */
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    /* localStorage에서 기존 선택 복원 */
    let savedSet = new Set<string>();
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${screenId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) savedSet = new Set(parsed);
      } catch {
        /* 무시 */
      }
    }

    fetch(`/api/display/lines?orgId=${DEFAULT_ORG_ID}`)
      .then((res) => res.json())
      .then((data) => {
        const fetchedGroups: LineGroup[] = data.groups ?? [];
        setGroups(fetchedGroups);

        /* '%'(전체) 저장값이면 모든 라인코드로 확장 */
        if (savedSet.has('%')) {
          const allCodes = new Set<string>();
          for (const g of fetchedGroups) {
            for (const l of g.lines) allCodes.add(l.lineCode);
          }
          setSelected(allCodes);
        } else {
          setSelected(savedSet);
        }
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));

    setTiming(loadTiming());
  }, [isOpen, screenId]);

  /* ── ESC 키 닫기 ── */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(required && !hasSaved)) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, required, hasSaved, onClose]);

  /* ── 개별 토글 ── */
  const toggle = useCallback((code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  /* ── 그룹 전체 토글 ── */
  const toggleGroup = useCallback((group: LineGroup) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = group.lines.every((l) => next.has(l.lineCode));
      for (const l of group.lines) {
        if (allSelected) next.delete(l.lineCode);
        else next.add(l.lineCode);
      }
      return next;
    });
  }, []);

  /* ── 전체 선택 / 해제 ── */
  const selectAll = useCallback(() => {
    const all = new Set<string>();
    for (const g of groups) {
      for (const l of g.lines) all.add(l.lineCode);
    }
    setSelected(all);
  }, [groups]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  /* ── 닫기 (required 모드 보호) ── */
  const handleClose = () => {
    if (required && !hasSaved) return;
    onClose();
  };

  /* ── 적용(저장) ── */
  const handleApply = () => {
    if (selected.size === 0) return;

    /* 전체 선택이면 '%'로 저장, 아니면 개별 코드 배열 */
    const totalLines = groups.reduce((sum, g) => sum + g.lines.length, 0);
    const arr =
      selected.size === totalLines ? ['%'] : [...selected].sort();

    localStorage.setItem(
      `${STORAGE_PREFIX}${screenId}`,
      JSON.stringify(arr),
    );
    window.dispatchEvent(new Event(`${EVENT_PREFIX}${screenId}`));
    saveTiming(timing);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{t('lineSelect')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {required && !hasSaved
                ? '표시할 라인을 선택한 후 적용을 눌러 주세요.'
                : `${selected.size}개 라인 선택됨`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              전체선택
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              전체해제
            </button>
            {!(required && !hasSaved) && (
              <button
                onClick={handleClose}
                className="ml-2 p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 타이밍 설정 */}
          <div className="rounded-lg border border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">타이밍 설정</h3>
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs text-gray-400">새로고침</label>
              <input
                type="range"
                min={5} max={300} step={5}
                value={timing.refreshSeconds}
                onChange={(e) => setTiming((p) => ({ ...p, refreshSeconds: Number(e.target.value) }))}
                className="h-1.5 flex-1 cursor-pointer accent-blue-500"
              />
              <span className="w-14 text-right font-mono text-xs font-bold text-blue-400">
                {timing.refreshSeconds}초
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs text-gray-400">스크롤 전환</label>
              <input
                type="range"
                min={3} max={60} step={1}
                value={timing.scrollSeconds}
                onChange={(e) => setTiming((p) => ({ ...p, scrollSeconds: Number(e.target.value) }))}
                className="h-1.5 flex-1 cursor-pointer accent-blue-500"
              />
              <span className="w-14 text-right font-mono text-xs font-bold text-blue-400">
                {timing.scrollSeconds}초
              </span>
            </div>
          </div>

          {/* 라인 그룹 목록 */}
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              라인 목록 불러오는 중...
            </div>
          ) : groups.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              라인 목록이 없습니다.
            </div>
          ) : (
            groups.map((group) => {
              const groupAllSelected = group.lines.every((l) =>
                selected.has(l.lineCode),
              );
              const groupSomeSelected =
                !groupAllSelected &&
                group.lines.some((l) => selected.has(l.lineCode));

              return (
                <div key={group.division} className="space-y-2">
                  {/* 그룹 헤더 (indeterminate 체크박스) */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = groupSomeSelected;
                      }}
                      onChange={() => toggleGroup(group)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-blue-400">
                      {group.division}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({group.lines.filter((l) => selected.has(l.lineCode)).length}/{group.lines.length})
                    </span>
                  </label>
                  {/* 라인 아이템 그리드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 ml-6">
                    {group.lines.map((line) => (
                      <label
                        key={line.lineCode}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                          selected.has(line.lineCode)
                            ? 'bg-blue-900/30 border border-blue-700'
                            : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(line.lineCode)}
                          onChange={() => toggle(line.lineCode)}
                          className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-300 truncate">
                          <span className="text-gray-500 mr-1">{line.lineCode}</span>
                          {line.lineName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 shrink-0">
          <span className="text-sm text-gray-400">
            {selected.size}개 라인 선택됨
          </span>
          <div className="flex gap-2">
            {!(required && !hasSaved) && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                취소
              </button>
            )}
            <button
              onClick={handleApply}
              disabled={selected.size === 0}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                selected.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              적용 ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
