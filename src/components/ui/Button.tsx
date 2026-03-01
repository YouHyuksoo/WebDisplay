/**
 * @file src/components/ui/Button.tsx
 * @description 공통 버튼 컴포넌트. WBSMaster 표준 디자인을 WebDisplay에 맞게 적용.
 *
 * 초보자 가이드:
 * 1. **variant**: 버튼 스타일 (primary, secondary, ghost, outline, danger)
 * 2. **size**: 버튼 크기 (sm, md, lg)
 * 3. **fullWidth**: true면 부모 너비 100% 채움
 * 4. primary 버튼은 glow 테마 색상(--glow-primary)을 자동 적용
 *
 * @example
 * <Button variant="primary" size="lg" onClick={handleSave}>저장</Button>
 * <Button variant="ghost" onClick={onCancel}>취소</Button>
 * <Button variant="danger" onClick={onDelete}>삭제</Button>
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-500 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600 hover:-translate-y-0.5',
  secondary:
    'bg-zinc-100 border border-zinc-300 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5',
  outline:
    'bg-transparent border border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:border-zinc-500',
  danger:
    'bg-transparent text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-10 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
