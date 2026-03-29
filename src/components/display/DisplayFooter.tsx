/**
 * @file src/components/display/DisplayFooter.tsx
 * @description 디스플레이 화면 하단 공통 상태바 — 로딩 상태, 갱신 시각 표시
 */

"use client";

import { useTranslations } from "next-intl";

interface Props {
  loading?: boolean;
  lastUpdated?: string | number | Date | null;
  statusText?: string;
}

export default function DisplayFooter({ loading, lastUpdated, statusText }: Props) {
  const t = useTranslations("ctq"); // CTQ 네임스페이스 사용 (공통 항목 포함됨)

  const formattedTime = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString() 
    : null;

  return (
    <footer className="shrink-0 bg-gray-900 border-t border-gray-700 px-6 py-1.5 z-30">
      <div className="flex items-center justify-between max-w-[1920px] mx-auto">
        {/* 왼쪽: 상태 표시등 및 텍스트 */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
            loading ? "bg-yellow-500 animate-pulse" : "bg-green-500"
          }`} />
          <span className="font-medium">
            {statusText || (loading ? t("common.dataLoading") : t("common.statusNormal"))}
          </span>
        </div>

        {/* 오른쪽: 마지막 갱신 시간 */}
        <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
          {formattedTime && (
            <div className="flex items-center gap-1.5">
              <span className="opacity-60">{t("common.refresh")}:</span>
              <span className="text-gray-400">{formattedTime}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
