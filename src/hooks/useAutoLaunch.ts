/**
 * @file useAutoLaunch.ts
 * @description 자동 실행 훅. 설정된 화면으로 자동 라우팅한다.
 * 초보자 가이드: localStorage에 autoLaunchScreen이 설정되어 있으면 메뉴를 건너뛰고 바로 해당 화면으로 이동.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SCREENS } from '@/lib/screens';

const STORAGE_KEY = 'mes-display-auto-launch';

export function useAutoLaunch() {
  const router = useRouter();

  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEY);
    if (screenId && SCREENS[screenId]) {
      router.replace(`/display/${screenId}`);
    }
  }, [router]);
}

export function setAutoLaunch(screenId: string | null) {
  if (screenId) {
    localStorage.setItem(STORAGE_KEY, screenId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAutoLaunch(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
