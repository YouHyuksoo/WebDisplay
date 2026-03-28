/**
 * @file src/components/ctq/HeaderActions.tsx
 * @description 헤더 우측 액션 버튼 — 전체화면 + 매뉴얼
 *
 * 초보자 가이드:
 * 1. 모든 모니터링 페이지 헤더 오른쪽 끝에 배치
 * 2. 전체화면 토글: Fullscreen API로 전환/해제
 * 3. 매뉴얼 아이콘: 클릭 시 SystemManual 모달 열림 (TODO: HelpModal 구현 필요)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
// TODO: HelpModal 컴포넌트를 구현한 후 아래 import 활성화
// import SystemManual from "./HelpModal";
import { useTranslations } from "next-intl";

export default function HeaderActions() {
  const t = useTranslations("ctq");
  const [_manualOpen, setManualOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      localStorage.removeItem("ctq-fullscreen-preferred");
    } else {
      document.documentElement.requestFullscreen();
      localStorage.setItem("ctq-fullscreen-preferred", "1");
    }
  }, []);

  return (
    <>
      <div className="flex items-center gap-1 ml-3">
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title={isFullscreen ? t("common.exitFullscreen") : t("common.fullscreen")}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setManualOpen(true)}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title={t("manual.btnLabel")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
      </div>
      {/* TODO: HelpModal 컴포넌트 구현 후 아래 활성화 */}
      {/* <SystemManual open={manualOpen} onClose={() => setManualOpen(false)} /> */}
    </>
  );
}
