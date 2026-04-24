/**
 * @file src/components/mxvc/ReverseTracePanelSplitter.tsx
 * @description 좌우 분할 드래그 리사이저.
 *
 * 초보자 가이드:
 * - 세로 바 드래그로 좌우 너비 비율 조정 (20~80% 범위 제한)
 * - onChange 콜백으로 부모에게 새로운 우측 너비(%) 전달
 * - 드래그 중 user-select:none으로 텍스트 선택 방지
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  onChange: (rightWidthPercent: number) => void;
  minPercent?: number;
  maxPercent?: number;
}

export default function ReverseTracePanelSplitter({
  onChange, minPercent = 20, maxPercent = 80,
}: Props) {
  const t = useTranslations('common');
  const [dragging, setDragging] = useState(false);
  const parentWidthRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    parentWidthRef.current = barRef.current?.parentElement?.offsetWidth ?? 0;
    setDragging(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const parent = barRef.current?.parentElement;
      if (!parent || parentWidthRef.current === 0) return;
      const rect = parent.getBoundingClientRect();
      const rightWidth = rect.right - e.clientX;
      const percent = (rightWidth / parentWidthRef.current) * 100;
      const clamped = Math.min(maxPercent, Math.max(minPercent, percent));
      onChange(clamped);
    };
    const onUp = () => setDragging(false);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, onChange, minPercent, maxPercent]);

  return (
    <div
      ref={barRef}
      onMouseDown={handleMouseDown}
      className={`w-1 shrink-0 cursor-col-resize transition-colors ${
        dragging ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700 hover:bg-blue-400'
      }`}
      title={t('dragToResize')}
    />
  );
}
