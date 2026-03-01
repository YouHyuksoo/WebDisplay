/**
 * @file usePageRolling.ts
 * @description 페이지 롤링(자동 순환) 커스텀 훅. DisplayLayout에서 호출.
 * 초보자 가이드: localStorage의 RollingConfig를 읽어 setInterval로 화면을 순환한다.
 * screenId='18'(옵션 화면)일 때는 롤링을 스킵한다.
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { KEYS } from '@/lib/menu/storage';
import type { RollingConfig } from '@/types/option';
import { DEFAULT_ROLLING_CONFIG } from '@/types/option';

function loadConfig(): RollingConfig {
  try {
    const raw = localStorage.getItem(KEYS.ROLLING);
    if (raw) return JSON.parse(raw) as RollingConfig;
  } catch { /* 기본값 */ }
  return DEFAULT_ROLLING_CONFIG;
}

/**
 * 페이지 롤링 훅. DisplayLayout 내부에서 한 번만 호출.
 * - enabled && screens.length > 0 일 때만 동작
 * - 현재 화면이 screenId='18'이면 타이머 비활성화
 * - storage 이벤트 및 커스텀 이벤트로 설정 변경 반영
 */
export function usePageRolling() {
  const router = useRouter();
  const pathname = usePathname();
  const configRef = useRef<RollingConfig>(DEFAULT_ROLLING_CONFIG);

  const refreshConfig = useCallback(() => {
    configRef.current = loadConfig();
  }, []);

  useEffect(() => {
    refreshConfig();

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.ROLLING) refreshConfig();
    };
    const onCustom = () => refreshConfig();

    window.addEventListener('storage', onStorage);
    window.addEventListener('rolling-config-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('rolling-config-changed', onCustom);
    };
  }, [refreshConfig]);

  useEffect(() => {
    const currentScreenId = pathname.split('/').pop() ?? '';
    if (currentScreenId === '18') return;

    const tick = () => {
      const cfg = configRef.current;
      if (!cfg.enabled || cfg.screens.length === 0) return;

      const idx = cfg.screens.indexOf(currentScreenId);
      const nextIdx = idx === -1 ? 0 : (idx + 1) % cfg.screens.length;
      router.push(`/display/${cfg.screens[nextIdx]}`);
    };

    // 매 tick마다 최신 config를 확인하기 위해 configRef 사용
    const id = setInterval(() => {
      const cfg = configRef.current;
      if (cfg.enabled && cfg.screens.length > 0) tick();
    }, (configRef.current.intervalSeconds || 30) * 1000);

    return () => clearInterval(id);
  }, [pathname, router]);
}
