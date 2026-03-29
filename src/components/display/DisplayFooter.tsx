/**
 * @file src/components/display/DisplayFooter.tsx
 * @description 디스플레이 화면 하단 공통 상태바 — 로딩 상태, 갱신 시각 표시
 */

"use client";

import { useTranslations } from "next-intl";
import { useFooter } from "@/components/providers/FooterProvider";

interface Props {
  loading?: boolean;
  lastUpdated?: string | number | Date | null;
  statusText?: string | null;
}

export default function DisplayFooter(props: Props) {
  const t = useTranslations("ctq");
  const globalState = useFooter();

  // Props가 있으면 우선 사용, 없으면 전역 상태 사용
  const loading = props.loading !== undefined ? props.loading : globalState.loading;
  const lastUpdated = props.lastUpdated !== undefined ? props.lastUpdated : globalState.lastUpdated;
  const statusText = props.statusText !== undefined ? props.statusText : globalState.statusText;

  const formattedTime = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString() 
    : null;

  return (
    <footer className="shrink-0 bg-gray-900 border-t border-gray-700 px-6 py-1.5 z-30">
      <div className="flex items-center justify-between max-w-[1920px] mx-auto">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
            loading ? "bg-yellow-500 animate-pulse" : "bg-green-500"
          }`} />
          <span className="font-medium">
            {statusText || (loading ? t("common.dataLoading") : t("common.statusNormal"))}
          </span>
        </div>

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
