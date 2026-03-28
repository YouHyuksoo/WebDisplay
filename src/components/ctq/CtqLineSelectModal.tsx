/**
 * @file src/components/ctq/CtqLineSelectModal.tsx
 * @description 라인 선택 모달 - 그룹별 체크박스로 모니터링 대상 라인 선택
 *
 * 초보자 가이드:
 * 1. **forced 모드**: 최초 진입 시 닫기 불가, 1개+ 선택 필수
 * 2. **그룹 선택**: LINE_PRODUCT_DIVISION별 전체선택/해제 토글
 * 3. **API 호출**: /api/ctq/lines에서 라인 목록 fetch
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface LineItem {
  lineCode: string;
  lineName: string;
}

interface LineGroup {
  division: string;
  lines: LineItem[];
}

interface LineSelectModalProps {
  open: boolean;
  forced?: boolean;
  initialSelected: string[];
  onApply: (lines: string[]) => void;
  onClose: () => void;
}

export default function CtqLineSelectModal({
  open,
  forced = false,
  initialSelected,
  onApply,
  onClose,
}: LineSelectModalProps) {
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const t = useTranslations("ctq");

  /* 라인 목록 fetch */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/ctq/lines")
      .then((res) => res.json())
      .then((data) => {
        setGroups(data.groups ?? []);
        setSelected(new Set(initialSelected));
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [open, initialSelected]);

  const toggle = useCallback((code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleGroup = useCallback(
    (group: LineGroup) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const allSelected = group.lines.every((l) => next.has(l.lineCode));
        for (const l of group.lines) {
          if (allSelected) next.delete(l.lineCode);
          else next.add(l.lineCode);
        }
        return next;
      });
    },
    []
  );

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

  const handleApply = () => {
    if (selected.size === 0) return;
    onApply([...selected].sort());
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="w-full max-w-2xl max-h-[70vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">{t("lineSelect.title")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {forced
                ? t("lineSelect.forcedDesc")
                : `${selected.size}${t("lineSelect.selectedCount")}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              {t("lineSelect.selectAll")}
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              {t("lineSelect.deselectAll")}
            </button>
            {!forced && (
              <button
                onClick={onClose}
                className="ml-2 p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {t("lineSelect.loadingLines")}
            </div>
          ) : (
            groups.map((group) => {
              const groupAllSelected = group.lines.every((l) =>
                selected.has(l.lineCode)
              );
              const groupSomeSelected =
                !groupAllSelected &&
                group.lines.some((l) => selected.has(l.lineCode));

              return (
                <div key={group.division} className="space-y-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 ml-6">
                    {group.lines.map((line) => (
                      <label
                        key={line.lineCode}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                          selected.has(line.lineCode)
                            ? "bg-blue-900/30 border border-blue-700"
                            : "bg-gray-800/50 border border-transparent hover:bg-gray-800"
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

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <span className="text-sm text-gray-400">
            {selected.size}{t("lineSelect.selectedCount")}
          </span>
          <div className="flex gap-2">
            {!forced && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                {t("lineSelect.cancel")}
              </button>
            )}
            <button
              onClick={handleApply}
              disabled={selected.size === 0}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                selected.size > 0
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              {t("lineSelect.apply")} ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
