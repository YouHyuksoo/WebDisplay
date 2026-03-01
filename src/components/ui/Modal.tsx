/**
 * @file src/components/ui/Modal.tsx
 * @description 공통 모달 다이얼로그. 다크 헤더 + 라이트 바디로 시각적 위계 확보.
 *
 * 초보자 가이드:
 * 1. **size**: 모달 너비 (sm=384px, md=448px, lg=512px, xl=640px, full=896px)
 * 2. **isOpen / onClose**: 열림 상태와 닫기 핸들러
 * 3. **title**: 다크 헤더에 표시할 제목 (없으면 헤더 숨김)
 * 4. **children**: 본문 콘텐츠 (스크롤 가능)
 * 5. **footer**: 하단 고정 버튼 영역
 * 6. ESC 키, 오버레이 클릭으로 닫기 지원
 *
 * @example
 * <Modal isOpen={open} onClose={() => setOpen(false)} title="라인 선택" size="lg">
 *   <p>본문</p>
 * </Modal>
 */
'use client';

import { useEffect, useCallback, useRef, type ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-[640px]',
  full: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-6
        bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full ${sizeClasses[size]} flex flex-col overflow-hidden
          rounded-lg bg-white shadow-2xl
          dark:bg-zinc-900
          animate-[scaleIn_200ms_ease-out]`}
      >
        {/* ── 헤더: 다크 배경으로 시각적 앵커 ── */}
        {title && (
          <div className="relative bg-zinc-800 px-10 py-7 dark:bg-zinc-950">
            {/* 상단 액센트 라인 */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 to-cyan-300" />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-wide text-white">
                  {title}
                </h3>
                {subtitle && (
                  <p className="mt-2 text-[13px] text-zinc-400">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 -mr-1 rounded-md p-2 text-zinc-500 transition-colors
                  hover:bg-white/10 hover:text-zinc-300"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── 본문 ── */}
        <div
          className="flex-1 overflow-y-auto px-10 py-8"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {children}
        </div>

        {/* ── 푸터 ── */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-10 py-5 dark:border-zinc-700 dark:bg-zinc-800/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
