/**
 * @file PageIndicator.tsx
 * @description 그리드 페이지 인디케이터 공통 컴포넌트.
 * 초보자 가이드: 모니터링 그리드 하단에 현재 페이지 위치를 점(dot)으로 표시한다.
 * activeColor prop으로 화면별 활성 색상을 지정할 수 있다.
 */
'use client';

interface PageIndicatorProps {
  /** 현재 페이지 (0-based) */
  page: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 활성 dot의 Tailwind 배경색 클래스 (기본: 'bg-cyan-400') */
  activeColor?: string;
}

export default function PageIndicator({ page, totalPages, activeColor = 'bg-cyan-400' }: PageIndicatorProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-zinc-700 bg-zinc-900 py-1">
      {Array.from({ length: totalPages }, (_, i) => (
        <div key={i} className={`h-2 rounded-full transition-all ${i === page ? `w-6 ${activeColor}` : 'w-2 bg-zinc-600'}`} />
      ))}
      <span className="ml-2 text-xs text-zinc-400">{page + 1} / {totalPages}</span>
    </div>
  );
}
