/**
 * @file MachineStatusSmd.tsx
 * @description SMD 기계 상태 화면 (메뉴 24). SWR polling으로 자동 갱신.
 * 초보자 가이드: 상단에 라인 상태 테이블, 하단에 점검 항목 테이블을 표시.
 * 데이터 영역만 내부 스크롤. 페이지 스크롤 없음.
 */
'use client';

import useSWR from 'swr';
import { useRef } from 'react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { StatusBadge, CheckBadge, formatNumber } from '../shared/DataBadges';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MachineStatusSmdProps {
  /** SWR 자동 갱신 주기 (초) */
  refreshInterval?: number;
}

/** SMD 기계 상태 화면 컴포넌트 */
export default function MachineStatusSmd({
  refreshInterval = 30,
}: MachineStatusSmdProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, error, isLoading } = useSWR(
    '/api/display/24?orgId=1',
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  useAutoScroll({ containerRef: scrollRef, interval: 5000, enabled: !isLoading });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        데이터 로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
        데이터 로드 실패
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <MachineStatusTable rows={data?.machineStatus ?? []} />
      <CheckItemsTable rows={data?.checkItems ?? []} />
    </div>
  );
}

/** 라인 상태 테이블 */
function MachineStatusTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-black/30">
      <div className="border-b border-zinc-200 px-4 py-2 dark:border-white/10">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          라인 상태
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-zinc-100 dark:bg-zinc-800/50">
            <tr>
              {['라인', '상태', '모델', '계획', '투입', '실적', 'NG', 'AOI', '가동률'].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 ${
                      i >= 3 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-zinc-900 dark:text-white">
                  {String(row.LINE_NAME ?? '')}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <StatusBadge status={String(row.LINE_STATUS_NAME ?? '')} />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600 dark:text-zinc-400">
                  {String(row.RUNNING_MODEL_NAME ?? '')}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-zinc-600 dark:text-zinc-400">
                  {formatNumber(row.DAY_PLAN_QTY)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-zinc-600 dark:text-zinc-400">
                  {formatNumber(row.DAY_INPUT_QTY)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-zinc-900 dark:text-white">
                  {formatNumber(row.DAY_ACTUAL_QTY)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-red-500">
                  {formatNumber(row.DAY_NG_QTY)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-zinc-600 dark:text-zinc-400">
                  {row.AOI_PASS_RATE != null
                    ? `${Number(row.AOI_PASS_RATE).toFixed(1)}%`
                    : '-'}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-zinc-600 dark:text-zinc-400">
                  {row.USE_RATE != null
                    ? `${Number(row.USE_RATE).toFixed(1)}%`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** 점검 항목 테이블 */
function CheckItemsTable({ rows }: { rows: Record<string, unknown>[] }) {
  const checks = [
    'MASK_CHECK', 'SQUEEZE_CHECK', 'CCS_CHECK', 'XRAY_CHECK',
    'SOLDER_CHECK', 'AOI_SAMPLE_CHECK', 'LV_SAMPLE_CHECK', 'TILT_SAMPLE_CHECK',
  ];
  const headers = ['Mask', 'Squeeze', 'CCS', 'X-Ray', 'Solder', 'AOI', 'LV', 'Tilt'];

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-black/30">
      <div className="border-b border-zinc-200 px-4 py-2 dark:border-white/10">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          점검 항목
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-zinc-100 dark:bg-zinc-800/50">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                라인
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2 text-center font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-zinc-900 dark:text-white">
                  {String(row.LINE_NAME ?? '')}
                </td>
                {checks.map((key) => (
                  <td key={key} className="px-3 py-1.5 text-center">
                    <CheckBadge value={String(row[key] ?? '')} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
