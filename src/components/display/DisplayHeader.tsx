/**
 * @file DisplayHeader.tsx
 * @description 디스플레이 화면 공통 헤더. 화면 제목, 현재 시간, 새로고침 주기 표시.
 * 초보자 가이드: 모든 디스플레이 화면 상단에 고정되는 얇은 바.
 */
'use client';

import { useEffect, useState } from 'react';

interface DisplayHeaderProps {
  title: string;
  refreshInterval?: number;
}

export default function DisplayHeader({ title, refreshInterval = 30 }: DisplayHeaderProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ko-KR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 dark:border-white/10 dark:bg-black/50">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-white" style={{ color: 'var(--glow-primary)' }}>
        {title}
      </h1>
      <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        <span>새로고침: {refreshInterval}초</span>
        <span className="font-mono text-zinc-900 dark:text-white">{time}</span>
      </div>
    </header>
  );
}
