/**
 * @file DisplayPlaceholder.tsx
 * @description 미구현 디스플레이 화면의 플레이스홀더. 다국어 지원.
 * 초보자 가이드: 아직 구현되지 않은 화면에 "화면 구현 예정" 메시지를 번역 적용하여 표시한다.
 */
'use client';

import { useTranslations } from 'next-intl';

interface DisplayPlaceholderProps {
  screenId: string;
}

/** 미구현 화면 플레이스홀더 (다국어 지원) */
export default function DisplayPlaceholder({ screenId }: DisplayPlaceholderProps) {
  const t = useTranslations();

  return (
    <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
      <div className="text-center">
        <p className="text-4xl font-bold" style={{ color: 'var(--glow-primary)' }}>
          {t(`screens.${screenId}`)}
        </p>
        <p className="mt-2 text-sm">
          {t('display.placeholder')} ({t('display.menuId', { id: screenId })})
        </p>
        <p className="mt-1 text-xs text-zinc-400">{t('display.escHint')}</p>
      </div>
    </div>
  );
}
