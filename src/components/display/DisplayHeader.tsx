/**
 * @file DisplayHeader.tsx
 * @description 디스플레이 화면 공통 헤더. 화면 제목, 현재 시간, 새로고침/스크롤 주기 표시.
 * 초보자 가이드: 모든 디스플레이 화면 상단에 고정되는 얇은 바.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LineSelectModal from '../common/LineSelectModal';
import SqlViewerModal from '../common/SqlViewerModal';
import useDisplayTiming from '@/hooks/useDisplayTiming';

interface DisplayHeaderProps {
  title: string;
  screenId?: string;
  /** 설정 모달 렌더 함수. 미지정 시 기본 LineSelectModal 사용 */
  renderSettingsModal?: (props: { isOpen: boolean; onClose: () => void; screenId: string }) => React.ReactNode;
}

export default function DisplayHeader({ title, screenId, renderSettingsModal }: DisplayHeaderProps) {
  const router = useRouter();
  const [time, setTime] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const timing = useDisplayTiming();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ko-KR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-900 px-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h1 className="text-3xl font-black text-white">
        {title}
      </h1>
      <div className="flex items-center gap-4 text-base text-zinc-400">
        <span>새로고침: {timing.refreshSeconds}초</span>
        <span>스크롤: {timing.scrollSeconds}초</span>
        <span className="font-mono text-white">{time}</span>
        {screenId && (
          <>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Settings"
              data-tooltip="설정"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {renderSettingsModal
              ? renderSettingsModal({ isOpen: isModalOpen, onClose: () => setIsModalOpen(false), screenId })
              : <LineSelectModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  screenId={screenId}
                />
            }

            {/* SQL 뷰어 버튼 */}
            <button
              onClick={() => setIsSqlOpen(true)}
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
              aria-label="SQL 보기"
              title="적용된 SQL 쿼리 보기"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16h8" />
              </svg>
            </button>
            <SqlViewerModal
              isOpen={isSqlOpen}
              onClose={() => setIsSqlOpen(false)}
              screenId={screenId}
            />
          </>
        )}
        <button
          onClick={() => router.push('/')}
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="나가기"
          data-tooltip="메뉴로 돌아가기 (ESC)"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
