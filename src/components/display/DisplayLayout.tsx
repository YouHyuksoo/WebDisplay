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

interface DisplayLayoutProps {
  title: string;
  screenId?: string;
  refreshInterval?: number;
  message?: string;
  children: React.ReactNode;
}

export default function DisplayLayout({
  title,
  screenId,
  refreshInterval = 30,
  message,
  children,
}: DisplayLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [router]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <DisplayHeader title={title} screenId={screenId} refreshInterval={refreshInterval} />
      <main className="min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
      <DisplayMessageBar message={message} />
    </div>
  );
}
