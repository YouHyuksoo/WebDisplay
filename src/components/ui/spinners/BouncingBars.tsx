/**
 * @file src/components/ui/spinners/BouncingBars.tsx
 * @description 5개 막대 이퀄라이저 느낌의 바운스 — 시차 애니메이션
 */
'use client';

import '@/styles/spinners.css';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const HEIGHT = { sm: 18, md: 28, lg: 44 };
const WIDTH  = { sm: 3,  md: 4,  lg: 6  };
const GAP    = { sm: 3,  md: 4,  lg: 6  };

export default function BouncingBars({ size = 'md', className = '' }: Props) {
  const h = HEIGHT[size];
  const w = WIDTH[size];
  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap: GAP[size], height: h }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="rounded-sm bg-gradient-to-t from-blue-600 to-cyan-300"
          style={{
            width: w, height: h,
            transformOrigin: 'center bottom',
            animation: 'sp-bar-bounce 0.9s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
