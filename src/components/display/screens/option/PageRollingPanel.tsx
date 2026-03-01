/**
 * @file PageRollingPanel.tsx
 * @description 페이지 롤링(자동 순환) 설정 패널. 토글/간격/화면 목록 관리.
 * 초보자 가이드: localStorage에 RollingConfig를 저장하고 커스텀 이벤트로 변경을 알린다.
 */
'use client';

import { useState, useEffect } from 'react';
import { KEYS } from '@/lib/menu/storage';
import { SCREENS } from '@/lib/screens';
import type { RollingConfig } from '@/types/option';
import { DEFAULT_ROLLING_CONFIG } from '@/types/option';

/** 드롭다운 옵션용 화면 목록 (옵션 화면 자신은 제외) */
const SCREEN_OPTIONS = Object.values(SCREENS)
  .filter((s) => s.id !== '18')
  .map((s) => ({ id: s.id, label: `${s.titleKo} (${s.id})` }));

export default function PageRollingPanel() {
  const [config, setConfig] = useState<RollingConfig>(DEFAULT_ROLLING_CONFIG);
  const [selectedScreen, setSelectedScreen] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS.ROLLING);
      if (raw) setConfig(JSON.parse(raw) as RollingConfig);
    } catch { /* 기본값 사용 */ }
  }, []);

  const save = (cfg: RollingConfig) => {
    localStorage.setItem(KEYS.ROLLING, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('rolling-config-changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addScreen = () => {
    if (!selectedScreen || config.screens.includes(selectedScreen)) return;
    const next = { ...config, screens: [...config.screens, selectedScreen] };
    setConfig(next);
    setSelectedScreen('');
  };

  const removeScreen = (id: string) => {
    setConfig({ ...config, screens: config.screens.filter((s) => s !== id) });
  };

  const screenLabel = (id: string) =>
    SCREEN_OPTIONS.find((s) => s.id === id)?.label ?? `화면 ${id}`;

  return (
    <div className="space-y-6 p-6">
      {/* 토글 */}
      <div className="flex items-center gap-4">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-zinc-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-zinc-600" />
        </label>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          페이지 순환 활성화
        </span>
      </div>

      {/* 전환 간격 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          전환 간격 (초)
        </label>
        <input
          type="number"
          min={5}
          max={600}
          value={config.intervalSeconds}
          onChange={(e) => {
            const v = Math.max(5, Math.min(600, Number(e.target.value) || 30));
            setConfig({ ...config, intervalSeconds: v });
          }}
          className="w-28 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* 화면 추가 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          순환 화면 목록
        </label>
        <div className="flex gap-2">
          <select
            value={selectedScreen}
            onChange={(e) => setSelectedScreen(e.target.value)}
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">화면 선택...</option>
            {SCREEN_OPTIONS.filter((s) => !config.screens.includes(s.id)).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={addScreen}
            disabled={!selectedScreen}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            + 추가
          </button>
        </div>
      </div>

      {/* 등록된 화면 목록 */}
      {config.screens.length > 0 && (
        <ul className="space-y-1">
          {config.screens.map((id, idx) => (
            <li
              key={id}
              className="flex items-center justify-between rounded bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"
            >
              <span className="text-zinc-700 dark:text-zinc-200">
                {idx + 1}. {screenLabel(id)}
              </span>
              <button
                onClick={() => removeScreen(id)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 저장 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => save(config)}
          className="rounded bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          저장
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">저장 완료!</span>
        )}
      </div>
    </div>
  );
}
