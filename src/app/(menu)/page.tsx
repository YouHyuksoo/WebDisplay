/**
 * @file page.tsx
 * @description 메인 페이지. 자동 실행 설정 확인 후, mydesktop 3D 메뉴 시스템 표시.
 *
 * 초보자 가이드:
 * 1. **자동 실행**: useAutoLaunch 훅이 localStorage를 확인하여 설정된 화면으로 자동 이동
 * 2. **SSR 비활성화**: Three.js, GSAP, DOM 조작 등 브라우저 API가 필요하므로 ssr: false
 * 3. **로딩 상태**: 컴포넌트 로드 전까지 로딩 화면을 표시
 */
'use client';

import dynamic from 'next/dynamic';
import { useAutoLaunch } from '@/hooks/useAutoLaunch';

const MenuScene = dynamic(() => import('@/components/menu/MenuScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-[#050508]">
      <div className="text-zinc-500 dark:text-zinc-400">Loading...</div>
    </div>
  ),
});

export default function Home() {
  useAutoLaunch();
  return <MenuScene />;
}
