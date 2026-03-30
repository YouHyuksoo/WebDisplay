/**
 * @file RunCardSelectModal.tsx
 * @description 런카드(모델) 선택 모달.
 * 초보자 가이드: IP_PRODUCT_RUN_CARD에서 당일 해당 라인의 런카드를 조회하여
 * 모델명/제품코드/LOT수량을 테이블로 보여준다. 행 클릭 시 선택 완료.
 */
'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useTranslations } from 'next-intl';
import { DEFAULT_ORG_ID, fmtNum } from '@/lib/display-helpers';

interface RunCardRow {
  MODEL_NAME: string;
  ITEM_CODE: string;
  LOT_SIZE: number;
  LOT_NO: string;
  RUN_NO: string;
}

interface RunCardSelectModalProps {
  isOpen: boolean;
  lineCode: string;
  onSelect: (row: RunCardRow) => void;
  onClose: () => void;
}

export default function RunCardSelectModal({ isOpen, lineCode, onSelect, onClose }: RunCardSelectModalProps) {
  const t = useTranslations('productionPlan');
  const { data, isLoading } = useSWR<{ rows: RunCardRow[] }>(
    isOpen && lineCode ? `/api/display/run-cards?orgId=${DEFAULT_ORG_ID}&lineCode=${lineCode}` : null,
    fetcher,
  );
  const rows = data?.rows ?? [];

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-zinc-300 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            {t('runCardTitle')} <span className="ml-2 text-xs font-normal text-zinc-500">({lineCode})</span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button>
        </div>

        {/* 테이블 */}
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">{t('modelName')}</th>
                <th className="px-3 py-2 text-left">{t('itemCode')}</th>
                <th className="px-3 py-2 text-right">{t('lotSize')}</th>
                <th className="px-3 py-2 text-left">{t('lotNo')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="py-6 text-center text-zinc-400">{t('runCardLoading')}</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-zinc-400">{t('runCardEmpty')}</td></tr>
              )}
              {rows.map((r, i) => (
                <tr
                  key={`${r.RUN_NO}-${i}`}
                  onClick={() => onSelect(r)}
                  className={`cursor-pointer border-t border-zinc-100 hover:bg-blue-50 dark:border-zinc-800 dark:hover:bg-zinc-700 ${
                    i % 2 === 1 ? 'bg-zinc-50 dark:bg-zinc-900/50' : 'bg-white dark:bg-zinc-950'
                  }`}
                >
                  <td className="px-3 py-2">{r.MODEL_NAME}</td>
                  <td className="px-3 py-2 text-cyan-600 dark:text-cyan-400">{r.ITEM_CODE}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(r.LOT_SIZE)}</td>
                  <td className="px-3 py-2 text-zinc-500">{r.LOT_NO}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단 */}
        <div className="border-t border-zinc-200 px-4 py-2 text-right dark:border-zinc-700">
          <span className="text-xs text-zinc-400">{rows.length}건</span>
        </div>
      </div>
    </div>
  );
}
