/**
 * @file src/components/menu/MenuScene.tsx
 * @description mydesktop 3D 메뉴 시스템의 React 호스트 컴포넌트
 *
 * 초보자 가이드:
 * 1. **주요 개념**: mydesktop의 DOM 구조를 JSX로 렌더링하고,
 *    useEffect에서 init.ts를 호출하여 모든 JS 모듈을 초기화한다.
 * 2. **사용 방법**: Next.js dynamic import로 SSR 비활성화 후 렌더링
 *    ```tsx
 *    const MenuScene = dynamic(() => import('@/components/menu/MenuScene'), { ssr: false });
 *    ```
 * 3. **구조**:
 *    - MenuCanvas: Three.js 캔버스, 글로우, 카드 공간, 스크롤 힌트
 *    - MenuWidgets: 검색, 시계, 날씨, 시스템, 이스터에그
 *    - MenuControls: 사이드바, 설정 메뉴, 하단 버튼
 *    - MenuSubmenus: 터널/카드 스타일 서브메뉴, 토스트, 컨텍스트 메뉴
 *    - MenuModals: 모든 모달 다이얼로그
 * 4. **라이프사이클**: mount 시 initMenuSystem(), unmount 시 destroyMenuSystem()
 * 5. **내비게이션**: 카드 클릭 시 'mes-navigate' CustomEvent → router.push()
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MenuCanvas from './MenuCanvas';
import MenuWidgets from './MenuWidgets';
import MenuControls from './MenuControls';
import MenuSubmenus from './MenuSubmenus';
import MenuModals from './MenuModals';

/**
 * mydesktop 3D 메뉴 시스템을 호스팅하는 메인 컴포넌트
 *
 * - 전체 HTML 구조를 서브 컴포넌트로 분할 렌더링
 * - useEffect에서 initMenuSystem()으로 모든 모듈 초기화
 * - CustomEvent 'mes-navigate'를 감지하여 Next.js 라우팅 연동
 */
export default function MenuScene() {
  const router = useRouter();
  const initialized = useRef(false);

  // 메뉴 시스템 초기화 (StrictMode 이중 호출 방지)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let destroy: (() => void) | null = null;

    import('@/lib/menu/init').then(({ initMenuSystem, destroyMenuSystem }) => {
      initMenuSystem();
      destroy = destroyMenuSystem;
    });

    return () => {
      if (destroy) destroy();
    };
  }, []);

  // 카드 클릭 → Next.js 라우팅 (별도 useEffect로 분리하여 StrictMode에서도 항상 등록)
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string; title: string }>).detail;
      if (detail?.url) {
        router.push(detail.url);
      }
    };
    window.addEventListener('mes-navigate', handleNavigate);
    return () => {
      window.removeEventListener('mes-navigate', handleNavigate);
    };
  }, [router]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050508]">
      <MenuCanvas />
      <MenuWidgets />
      <MenuControls />
      <MenuSubmenus />
      <MenuModals />
    </div>
  );
}
