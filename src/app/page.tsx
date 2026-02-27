/**
 * @file src/app/page.tsx
 * @description 메인 페이지. mydesktop 3D 메뉴 시스템을 호스팅한다.
 *
 * 초보자 가이드:
 * 1. **주요 개념**: Next.js dynamic import로 MenuScene을 CSR 전용으로 로드
 * 2. **SSR 비활성화**: Three.js, GSAP, DOM 조작 등 브라우저 API가 필요하므로 ssr: false
 * 3. **로딩 상태**: 컴포넌트 로드 전까지 로딩 화면을 표시
 */

import dynamic from 'next/dynamic';

const MenuScene = dynamic(() => import('@/components/menu/MenuScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-[#050508]">
      <div className="text-zinc-500">Loading...</div>
    </div>
  ),
});

export default function Home() {
  return <MenuScene />;
}
