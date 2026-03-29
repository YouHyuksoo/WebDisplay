/**
 * @file CriteriaTooltip.tsx
 * @description 판정조건 툴팁 -- 각 CTQ 페이지의 등급 판정 기준과 상태 표시 안내를 표시
 * 초보자 가이드: 아이콘 click 시 해당 페이지의 판정조건(criteria)과 상태안내(status)를 팝오버로 표시
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface CriteriaTooltipProps {
  /** navTooltip 키 (repeatability, accident 등) */
  pageKey: string;
}

export default function CriteriaTooltip({ pageKey }: CriteriaTooltipProps) {
  const t = useTranslations('ctq');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const criteriaText = t(`navTooltip.${pageKey}`);
  const statusKey = `navTooltip.${pageKey}Status`;
  const statusText = t(statusKey);
  const hasStatus = statusText !== statusKey;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        title={t('navTooltip.criteria')}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t('navTooltip.criteria')}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-96 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h4 className="text-sm font-bold text-white">{t('navTooltip.criteria')}</h4>
          </div>
          <div className="px-4 py-3 text-xs text-gray-200 whitespace-pre-line leading-relaxed">
            {criteriaText}
          </div>
          {hasStatus && (
            <>
              <div className="px-4 py-2 border-t border-gray-700">
                <h4 className="text-sm font-bold text-white">{t('navTooltip.statusGuide')}</h4>
              </div>
              <div className="px-4 py-3 text-xs text-gray-200 whitespace-pre-line leading-relaxed">
                {statusText}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
