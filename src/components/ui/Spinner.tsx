/**
 * @file src/components/ui/Spinner.tsx
 * @description 공용 스피너 — BouncingBars 기반 + 선택적 라벨
 *
 * 초보자 가이드:
 * - size: 'sm'(18px) | 'md'(28px) | 'lg'(44px)
 * - label 지정 시 우측(또는 하단, vertical=true)에 텍스트 표시
 * - fullscreen=true 주면 중앙 배치 + min-height 가드
 *
 * 사용 예:
 *   <Spinner />                                       // 기본 md, 라벨 없음
 *   <Spinner size="sm" />                             // 버튼 내부용
 *   <Spinner label="데이터 로딩 중..." />               // 가로 레이아웃
 *   <Spinner size="lg" vertical label="조회 중..." />   // 세로 레이아웃
 *   <Spinner fullscreen label="..." />                // 화면 중앙 배치
 */
'use client';

import BouncingBars from './spinners/BouncingBars';

interface Props {
  size?:     'sm' | 'md' | 'lg';
  label?:    string;
  vertical?: boolean;
  fullscreen?: boolean;
  className?:      string;
  labelClassName?: string;
}

export default function Spinner({
  size       = 'md',
  label,
  vertical   = false,
  fullscreen = false,
  className  = '',
  labelClassName = '',
}: Props) {
  const layoutCls = vertical ? 'flex-col' : 'flex-row';
  const gapCls    = vertical ? 'gap-2'    : 'gap-3';
  const content = (
    <div className={`inline-flex items-center justify-center ${layoutCls} ${gapCls} ${className}`}>
      <BouncingBars size={size} />
      {label && (
        <span className={`text-sm text-zinc-400 ${labelClassName}`}>
          {label}
        </span>
      )}
    </div>
  );
  if (!fullscreen) return content;
  return (
    <div className="flex min-h-32 w-full items-center justify-center p-6">
      {content}
    </div>
  );
}
