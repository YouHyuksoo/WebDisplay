/**
 * @file src/components/ctq/LineSelectButton.tsx
 * @description 라인 선택 버튼 — 최상단 헤더 타이틀 옆에 배치
 *
 * 초보자 가이드:
 * 1. 깔때기 아이콘 + 선택된 라인 수 뱃지
 * 2. 클릭 시 LineSelectModal 팝업
 * 3. LineFilterContext를 통해 상태 공유
 */

"use client";

import { useState } from "react";
import { useLineFilter } from "@/hooks/ctq/LineFilterContext";
import LineSelectModal from "./CtqLineSelectModal";
import { useTranslations } from "next-intl";

export default function LineSelectButton() {
  const { selectedLines, setSelectedLines } = useLineFilter();
  const t = useTranslations("ctq");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="ml-4 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-600"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {t("nav.lineSelect")}
        {selectedLines.length > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {selectedLines.length}
          </span>
        )}
      </button>

      <LineSelectModal
        open={modalOpen}
        forced={false}
        initialSelected={selectedLines}
        onApply={(lines) => {
          setSelectedLines(lines);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
