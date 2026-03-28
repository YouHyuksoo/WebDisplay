/**
 * @file src/components/ctq/SettingsPanel.tsx
 * @description 모니터링 설정 패널 - 갱신 주기, 롤링 시간 조정
 *
 * 초보자 가이드:
 * 1. **톱니바퀴 아이콘**: 클릭 시 설정 드롭다운 표시
 * 2. **모니터링 주기**: API 데이터 갱신 간격 (기본 30초)
 * 3. **롤링 시간**: 페이지 자동 전환 간격 (기본 10초)
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

interface SettingsPanelProps {
  monitorInterval: number;
  rollingInterval: number;
  rollingEnabled: boolean;
  onMonitorIntervalChange: (ms: number) => void;
  onRollingIntervalChange: (ms: number) => void;
  onRollingEnabledChange: (enabled: boolean) => void;
}

export default function SettingsPanel({
  monitorInterval,
  rollingInterval,
  rollingEnabled,
  onMonitorIntervalChange,
  onRollingIntervalChange,
  onRollingEnabledChange,
}: SettingsPanelProps) {
  const t = useTranslations("ctq");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const monitorOptions = [
    { label: t("settings.sec10"), value: 10000 },
    { label: t("settings.sec30"), value: 30000 },
    { label: t("settings.sec60"), value: 60000 },
    { label: t("settings.sec120"), value: 120000 },
    { label: t("settings.min5"), value: 300000 },
    { label: t("settings.min10"), value: 600000 },
  ];
  const rollingOptions = [
    { label: t("settings.sec5"), value: 5000 },
    { label: t("settings.sec10"), value: 10000 },
    { label: t("settings.sec15"), value: 15000 },
    { label: t("settings.sec30"), value: 30000 },
  ];

  /* 외부 클릭 시 닫기 */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        title={t("settings.title")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <h3 className="text-sm font-bold text-gray-200 mb-3">{t("settings.title")}</h3>

          {/* 모니터링 갱신 주기 */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">{t("settings.dataInterval")}</label>
            <div className="flex gap-1">
              {monitorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onMonitorIntervalChange(opt.value)}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    monitorInterval === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 롤링 ON/OFF */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">{t("settings.screenRolling")}</label>
              <button
                onClick={() => onRollingEnabledChange(!rollingEnabled)}
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  rollingEnabled ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    rollingEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 롤링 시간 */}
          {rollingEnabled && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t("settings.rollingInterval")}</label>
              <div className="flex gap-1">
                {rollingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onRollingIntervalChange(opt.value)}
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      rollingInterval === opt.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
