/**
 * @file ScreenCard.tsx
 * @description 도움말 - 개별 화면 설명 카드 컴포넌트.
 * 초보자 가이드: 각 디스플레이 화면의 정보를 일관된 카드 형태로 표시.
 */
'use client';

import { useTranslations } from 'next-intl';

interface ScreenCardProps {
  screenId: string;
  title: string;
  titleEn: string;
  route: string;
  description: string;
  features: string[];
  columns: string[];
  refreshSeconds: number;
}

export default function ScreenCard({
  screenId,
  title,
  titleEn,
  route,
  description,
  features,
  columns,
  refreshSeconds,
}: ScreenCardProps) {
  const t = useTranslations('help');
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      {/* 헤더 */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="text-lg font-bold text-white">
            {title}
            <span className="ml-2 text-sm font-normal text-zinc-500">({titleEn})</span>
          </h4>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-blue-400">ID: {screenId}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-emerald-400">{route}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-yellow-400">{t('refreshSuffix', { seconds: refreshSeconds })}</span>
          </div>
        </div>
      </div>

      {/* 설명 */}
      <p className="mb-4 text-sm leading-relaxed text-zinc-300">{description}</p>

      {/* 주요 기능 */}
      <div className="mb-4">
        <h5 className="mb-2 text-sm font-bold text-zinc-300">{t('features')}</h5>
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      {/* 표시 컬럼 */}
      <div>
        <h5 className="mb-2 text-sm font-bold text-zinc-300">{t('columns')}</h5>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((col) => (
            <span key={col} className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
