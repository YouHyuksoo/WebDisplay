/**
 * @file LineSelectModal.tsx
 * @description 모니터링 라인 선택 모달. PB 원본 w_line_multi_select_flat_smd 대응.
 *
 * 초보자 가이드:
 * 1. 공장 대형 모니터 환경에 맞춘 큰 UI (터치 친화적)
 * 2. 라인별 카드 형태로 선택 상태를 시각적으로 표현
 * 3. 선택값은 localStorage에 저장되어 새로고침 후에도 유지
 * 4. useTranslations()로 모든 UI 텍스트 다국어 적용
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LineItem {
  lineCode: string;
  lineName: string;
  sequence: number;
}

interface LineSelectModalProps {
  storageKey: string;
  open: boolean;
  onClose: () => void;
  onSave: (lineCodes: string[]) => void;
}

/** 모니터링 라인 선택 모달 (공장 대형 모니터 최적화) */
export default function LineSelectModal({
  storageKey,
  open,
  onClose,
  onSave,
}: LineSelectModalProps) {
  const t = useTranslations();
  const { data } = useSWR<{ lines: LineItem[] }>(
    open ? '/api/display/lines?orgId=1' : null,
    fetcher,
  );
  const lines = data?.lines ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [animate, setAnimate] = useState(false);

  /* 모달 열릴 때 localStorage에서 기존 선택값 복원 + 등장 애니메이션 */
  useEffect(() => {
    if (!open) {
      setAnimate(false);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSelected(new Set(JSON.parse(stored)));
    } catch { /* 무시 */ }
    requestAnimationFrame(() => setAnimate(true));
  }, [open, storageKey]);

  const allSelected = lines.length > 0 && lines.every((l) => selected.has(l.lineCode));

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(lines.map((l) => l.lineCode)));
  }, [allSelected, lines]);

  const toggle = useCallback((code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const handleSave = () => {
    const codes = Array.from(selected);
    localStorage.setItem(storageKey, JSON.stringify(codes));
    onSave(codes);
    onClose();
  };

  /* ESC로 닫기 */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const isLoading = lines.length === 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300
        ${animate ? 'bg-black/50' : 'bg-black/0'}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl overflow-hidden rounded-lg border shadow-2xl transition-all duration-300
          border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900
          ${animate ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-700">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t('display.lineSelect')}
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t('common.selected', { count: selected.size })} / {lines.length} {t('table.line')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── 전체 선택 ── */}
        <div className="border-b border-zinc-100 px-6 py-3 dark:border-zinc-800">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <Checkbox checked={allSelected} />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t('common.selectAll')}
            </span>
            <input type="checkbox" className="hidden" checked={allSelected} onChange={toggleAll} />
          </label>
        </div>

        {/* ── 라인 목록 ── */}
        <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
                  <div className="h-5 w-5 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {lines.map((line) => {
                const isOn = selected.has(line.lineCode);
                return (
                  <label
                    key={line.lineCode}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all duration-150
                      ${isOn
                        ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/30'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'}`}
                  >
                    <Checkbox checked={isOn} />
                    <div className="min-w-0 flex-1">
                      <div className={`font-mono text-base font-bold ${isOn ? 'text-sky-700 dark:text-sky-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {line.lineCode}
                      </div>
                      <div className={`truncate text-sm ${isOn ? 'text-sky-600/70 dark:text-sky-400/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {line.lineName}
                      </div>
                    </div>
                    <input type="checkbox" className="hidden" checked={isOn} onChange={() => toggle(line.lineCode)} />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <Button variant="secondary" size="md" onClick={onClose} className="min-w-[100px]">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={selected.size === 0}
            className="min-w-[100px]"
          >
            {t('common.save')} ({selected.size})
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 체크박스 아이콘 */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all
        ${checked
          ? 'border-sky-500 bg-sky-500 dark:border-sky-400 dark:bg-sky-400'
          : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'}`}
    >
      {checked && (
        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}
