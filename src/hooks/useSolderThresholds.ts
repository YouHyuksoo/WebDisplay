/**
 * @file useSolderThresholds.ts
 * @description Solder Paste 경고 임계값 설정 훅.
 * 초보자 가이드: localStorage에서 임계값을 읽어오고, 설정 모달에서 변경 시
 * 커스텀 이벤트로 즉시 반영한다. useDisplayTiming과 동일한 패턴.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_SOLDER_THRESHOLDS } from '@/types/option';
import type { SolderThresholdConfig } from '@/types/option';

const STORAGE_KEY = 'solder-thresholds';
const EVENT_NAME = 'solder-thresholds-changed';

/** localStorage에서 Solder 임계값 설정을 읽어온다 */
function loadThresholds(): SolderThresholdConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SolderThresholdConfig>;
      return {
        gap3Danger: parsed.gap3Danger ?? DEFAULT_SOLDER_THRESHOLDS.gap3Danger,
        gap3Warning: parsed.gap3Warning ?? DEFAULT_SOLDER_THRESHOLDS.gap3Warning,
        unfreezingDanger: parsed.unfreezingDanger ?? DEFAULT_SOLDER_THRESHOLDS.unfreezingDanger,
        unfreezingWarning: parsed.unfreezingWarning ?? DEFAULT_SOLDER_THRESHOLDS.unfreezingWarning,
        validExpired: parsed.validExpired ?? DEFAULT_SOLDER_THRESHOLDS.validExpired,
        validWarning: parsed.validWarning ?? DEFAULT_SOLDER_THRESHOLDS.validWarning,
      };
    }
  } catch { /* 무시 */ }
  return { ...DEFAULT_SOLDER_THRESHOLDS };
}

/** Solder 임계값을 localStorage에 저장하고 이벤트를 발생시킨다 */
export function saveSolderThresholds(config: SolderThresholdConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Solder Paste 경고 임계값 설정 훅 */
export default function useSolderThresholds(): SolderThresholdConfig {
  const [thresholds, setThresholds] = useState<SolderThresholdConfig>(DEFAULT_SOLDER_THRESHOLDS);

  const reload = useCallback(() => setThresholds(loadThresholds()), []);

  useEffect(() => {
    reload();
    window.addEventListener(EVENT_NAME, reload);
    return () => window.removeEventListener(EVENT_NAME, reload);
  }, [reload]);

  return thresholds;
}
