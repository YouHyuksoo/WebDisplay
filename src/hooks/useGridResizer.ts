/**
 * @file useGridResizer.ts
 * @description 그리드 컬럼 폭 조정 및 설정을 저장하는 공통 커스텀 훅.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const MIN_COLUMN_WIDTH = 50; // 최소 폭 (px)

export function useGridResizer(storageKey: string, initialWidths: (number | string)[]) {
  // 1. 상태: 컬럼들의 너비 배열
  const [widths, setWidths] = useState<(number | string)[]>(() => {
    if (typeof window === 'undefined') return initialWidths;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : initialWidths;
    } catch {
      return initialWidths;
    }
  });

  // 2. 내부 상태 (드래그용)
  const resizingIndex = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // 3. 드래그 시작 핸들러
  const handleMouseDown = useCallback((index: number, e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    resizingIndex.current = index;
    startX.current = e.clientX;

    // 클릭된 핸들의 부모(th, td, div 등)로부터 현재 너비를 직접 측정
    const handleElement = e.currentTarget as HTMLElement;
    const columnElement = handleElement.parentElement;
    if (columnElement) {
      startWidth.current = columnElement.getBoundingClientRect().width;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (resizingIndex.current === null) return;

      const diff = moveEvent.clientX - startX.current;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth.current + diff);

      setWidths((prev) => {
        const next = [...prev];
        next[resizingIndex.current!] = newWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      resizingIndex.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.classList.add('resizing');
  }, []);

  // 4. 저장 (Widths 변경될 때마다 localStorage 업데이트)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    }
  }, [storageKey, widths]);

  return { widths, handleMouseDown };
}
