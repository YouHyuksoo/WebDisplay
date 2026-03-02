/**
 * @file useDisplayTiming.ts
 * @description 디스플레이 공통 타이밍 설정 훅.
 * 초보자 가이드: localStorage에서 새로고침/스크롤 간격을 읽어온다.
 * 설정 모달에서 변경 시 커스텀 이벤트로 즉시 반영된다.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_TIMING_CONFIG } from '@/types/option';
import type { DisplayTimingConfig } from '@/types/option';

const STORAGE_KEY = 'mes-display-timing';
const EVENT_NAME = 'display-timing-changed';

/** localStorage에서 타이밍 설정을 읽어온다 */
export function loadTiming(): DisplayTimingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DisplayTimingConfig>;
      return {
        refreshSeconds: parsed.refreshSeconds ?? DEFAULT_TIMING_CONFIG.refreshSeconds,
        scrollSeconds: parsed.scrollSeconds ?? DEFAULT_TIMING_CONFIG.scrollSeconds,
      };
    }
  } catch { /* 무시 */ }
  return { ...DEFAULT_TIMING_CONFIG };
}

/** 타이밍 설정을 localStorage에 저장하고 이벤트를 발생시킨다 */
export function saveTiming(config: DisplayTimingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** 디스플레이 공통 타이밍 설정 훅 */
export default function useDisplayTiming(): DisplayTimingConfig {
  const [timing, setTiming] = useState<DisplayTimingConfig>(DEFAULT_TIMING_CONFIG);

  const reload = useCallback(() => setTiming(loadTiming()), []);

  useEffect(() => {
    reload();
    window.addEventListener(EVENT_NAME, reload);
    return () => window.removeEventListener(EVENT_NAME, reload);
  }, [reload]);

  return timing;
}
