/**
 * @file LiquidShelfLifeStatus.tsx
 * @description 액형자재 유효기간 모니터링 메인 — 설정바 + SWR polling + 알람 + 그리드
 *
 * 초보자 가이드:
 * 1. 상단 설정바: "재고 있는 LOT만" 토글 (localStorage 저장)
 * 2. /api/mxvc/liquid-shelf-life?inStock=1|0 호출 (refresh: useDisplayTiming)
 * 3. expiredCount > 0 또는 warningCount > 0 시 NgAlertBanner
 */
'use client';

import useSWR from 'swr';
import DisplayLayout from '@/components/display/DisplayLayout';
import NgAlertBanner from '@/components/display/NgAlertBanner';
import LiquidShelfLifeGrid from './LiquidShelfLifeGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { usePersistedState } from '@/hooks/ctq/usePersistedState';
import { fetcher } from '@/lib/fetcher';
import type { LiquidShelfLifeResponse } from '@/types/mxvc/liquid-shelf-life';

interface Props {
  screenId: string;
}

export default function LiquidShelfLifeStatus({ screenId }: Props) {
  const timing = useDisplayTiming();
  const [inStockOnly, setInStockOnly] = usePersistedState<boolean>(
    'mxvc-liquid-instock-only',
    true,
  );

  const url = `/api/mxvc/liquid-shelf-life?inStock=${inStockOnly ? '1' : '0'}`;
  const { data, error, isLoading } = useSWR<LiquidShelfLifeResponse>(url, fetcher, {
    refreshInterval: timing.refreshSeconds * 1000,
  });

  const rows = data?.rows ?? [];
  const expiredCount = data?.expiredCount ?? 0;
  const warningCount = data?.warningCount ?? 0;
  const bannerMsg =
    expiredCount > 0
      ? `만료된 액형자재 ${expiredCount}건이 있습니다. 즉시 조치 필요.`
      : warningCount > 0
        ? `유효기간 임박(7일 이내) 액형자재 ${warningCount}건이 있습니다.`
        : '';

  return (
    <DisplayLayout title="액형자재 유효기간 모니터링" screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        {/* 설정바 */}
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-100 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-amber-500"
              />
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                재고 있는 LOT만 (INVENTORY_QTY &gt; 0)
              </span>
            </label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              총 <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{rows.length}</span> 건
              {warningCount > 0 && (
                <>
                  · 임박 <span className="font-mono font-bold text-red-500">{warningCount}</span>
                </>
              )}
              {expiredCount > 0 && (
                <>
                  · 만료 <span className="font-mono font-bold text-red-600">{expiredCount}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 알람 배너 */}
        {bannerMsg && <NgAlertBanner message={bannerMsg} />}

        {/* 본문: 로딩 / 에러 / 그리드 */}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          {isLoading && !data ? (
            <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              데이터 로딩 중...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
              데이터 조회 실패
            </div>
          ) : (
            <LiquidShelfLifeGrid rows={rows} scrollSeconds={timing.scrollSeconds} />
          )}
        </div>
      </div>
    </DisplayLayout>
  );
}
