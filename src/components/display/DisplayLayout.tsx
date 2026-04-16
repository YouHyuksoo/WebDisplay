/**
 * @file DisplayLayout.tsx
 * @description 디스플레이 화면 공통 레이아웃. 100vh 꽉 채움, 페이지 스크롤 없음.
 * 초보자 가이드: 헤더(h-12) + 콘텐츠(flex-1, 여기만 스크롤) + 메시지바(h-8) 구조.
 * ESC 키를 누르면 메뉴로 돌아간다.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DisplayHeader from './DisplayHeader';
import DisplayMessageBar from './DisplayMessageBar';
import { usePageRolling } from '@/hooks/usePageRolling';
import { SCREENS } from '@/lib/screens';

interface DisplayLayoutProps {
  /** 타이틀 직접 지정. 미지정 시 screenId로 SCREENS에서 자동 조회 */
  title?: string;
  screenId?: string;
  message?: string;
  /** 설정 모달 렌더 함수. 미지정 시 기본 LineSelectModal 사용 */
  renderSettingsModal?: (props: { isOpen: boolean; onClose: () => void; screenId: string }) => React.ReactNode;
  /** 헤더 우측 아이콘 영역 앞에 삽입할 추가 콘텐츠 */
  extraHeaderContent?: React.ReactNode;
  /** "새로고침/스크롤 주기" 배지 숨김 여부 (기본: false) */
  hideTimingBadge?: boolean;
  children: React.ReactNode;
}

export default function DisplayLayout({
  title,
  screenId,
  message,
  renderSettingsModal,
  extraHeaderContent,
  hideTimingBadge,
  children,
}: DisplayLayoutProps) {
  const router = useRouter();
  usePageRolling();

  const screen = screenId ? SCREENS[screenId] : undefined;
  const resolvedTitle = title ?? screen?.titleKo ?? screen?.title ?? '';

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [router]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <DisplayHeader title={resolvedTitle} screenId={screenId} renderSettingsModal={renderSettingsModal} extraHeaderContent={extraHeaderContent} hideTimingBadge={hideTimingBadge} />
      <main className="min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
      <DisplayMessageBar message={message} />
    </div>
  );
}
