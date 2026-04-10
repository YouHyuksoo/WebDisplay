/**
 * @file FoolproofCard.tsx
 * @description 종합F/P현황 라인별 카드 컴포넌트.
 * 초보자 가이드: 한 라인의 점검 항목을 카드 형태로 표시.
 * OK=초록, NG=빨강+깜빡임, 미등록=회색. 카드 테두리로 라인 전체 상태를 한눈에 파악.
 *
 * PB 원본 색상 로직:
 *   - OK → 초록 배경(rgb(0,255,0))
 *   - NG → 빨간 배경(rgb(255,0,0)) + 노란 텍스트
 *   - '-' → 회색(rgb(190,190,190))
 */
'use client';

import { useTranslations } from 'next-intl';
import { getCheckBadgeClass } from '../../shared/status-styles';

/** 라인 1건의 점검 데이터 */
export interface FoolproofRow {
  LINE_NAME?: string;
  LINE_CODE?: string;
  RUNNING_RUN_NO?: string;
  RUNNING_LOT_PLAN_QTY?: number;
  MODEL_NAME?: string;
  LINE_STATUS_NAME?: string;
  LINE_STATUS_CODE_NAME?: string;
  NSNP_REASON?: string;
  NSNP_STATUS_NAME?: string;
  MASK_CHECK?: string;
  MASK_CHECK_DATE?: string;
  SQUEEZE_CHECK?: string;
  SQUEEZE_CHECK_DATE?: string;
  SQUEEZE_LOT_NO?: string;
  SQUEEZE_LOT_NO2?: string;
  SOLDER_CHECK?: string;
  SOLDER_CHECK_VAL?: string;
  SOLDER_CHECK_HOUR?: string;
  LCR_CHECK_STATUS?: string;
  LCR_CHECK_DATE?: string;
  MASTER_CHECK_AOI?: string;
  MASTER_CHECK_AOI_LOT?: string;
  RUNNING_RUN_DATE?: string;
  PCB_ITEM?: string;
  MODEL_SPEC?: string;
  MASK_HIT_RATE1?: number;
  MASK_HIT_RATE2?: number;
  SQUEEZE_HIT_RATE1?: number;
  SQUEEZE_HIT_RATE2?: number;
  [key: string]: unknown;
}

/** 점검 항목 정의 — PB DataWindow 컬럼 순서 매핑 */
const CHECK_ITEMS = [
  { labelKey: 'runNo' as const, valueKey: 'RUNNING_RUN_NO', badgeKey: 'LINE_STATUS_NAME', badgeKey2: 'LINE_STATUS_CODE_NAME' },
  { labelKey: 'modelName' as const, valueKey: 'MODEL_NAME', subKey: 'PCB_ITEM', subKey2: 'MODEL_SPEC' },
  { labelKey: 'metalMask' as const, statusKey: 'MASK_CHECK', dateKey: 'MASK_CHECK_DATE', rateKeys: ['MASK_HIT_RATE1', 'MASK_HIT_RATE2'] },
  { labelKey: 'squeegee' as const, statusKey: 'SQUEEZE_CHECK', dateKey: 'SQUEEZE_CHECK_DATE', lotKeys: ['SQUEEZE_LOT_NO', 'SQUEEZE_LOT_NO2'], rateKeys: ['SQUEEZE_HIT_RATE1', 'SQUEEZE_HIT_RATE2'] },
  { labelKey: 'solderEpoxy' as const, statusKey: 'SOLDER_CHECK', dateKey: 'SOLDER_CHECK_VAL', hourKey: 'SOLDER_CHECK_HOUR' },
  { labelKey: 'lcrCheck' as const, statusKey: 'LCR_CHECK_STATUS', dateKey: 'LCR_CHECK_DATE' },
  { labelKey: 'aoiSample' as const, statusKey: 'MASTER_CHECK_AOI', lotKeys: ['MASTER_CHECK_AOI_LOT'] },
] as const;

/** 라인에 NG 항목이 하나라도 있는지 판별 */
function hasNg(row: FoolproofRow): boolean {
  return CHECK_ITEMS.some((item) => 'statusKey' in item && row[item.statusKey] === 'NG');
}

interface FoolproofCardProps {
  row: FoolproofRow;
}

export default function FoolproofCard({ row }: FoolproofCardProps) {
  const tCheck = useTranslations('checkItem');
  const lineName = String(row.LINE_NAME ?? row.LINE_CODE ?? '-');
  const ng = hasNg(row);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border-2 bg-zinc-900 dark:bg-zinc-900 ${
        ng ? 'border-red-500' : 'border-emerald-600/50'
      }`}
    >
      {/* 카드 헤더 — 라인명 + 상태변경일시 */}
      <div
        className={`flex items-center justify-between px-4 py-2 ${
          ng
            ? 'bg-red-600 text-white animate-pulse'
            : 'bg-emerald-700 text-white'
        }`}
      >
        <span className="text-xl font-black">{lineName}</span>
        {row.RUNNING_RUN_DATE && (
          <span className="text-base font-semibold opacity-90">
            {row.RUNNING_RUN_DATE}
          </span>
        )}
      </div>

      {/* 점검 항목 리스트 — 균등 높이 */}
      <div className="grid flex-1 divide-y divide-zinc-700/50" style={{ gridTemplateRows: `repeat(${CHECK_ITEMS.length}, 1fr)` }}>
        {CHECK_ITEMS.map((item, idx) => {
          const isValueOnly = 'valueKey' in item;
          const status = isValueOnly ? '' : String(row[(item as { statusKey: string }).statusKey] ?? '');
          const dateVal = isValueOnly ? '' : String(row[(item as { dateKey: string }).dateKey] ?? '');
          const plainVal = isValueOnly ? String(row[(item as { valueKey: string }).valueKey] ?? '') : '';
          const itemKey = isValueOnly ? (item as { valueKey: string }).valueKey : (item as { statusKey: string }).statusKey;
          const isActive = isValueOnly ? plainVal !== '' : status !== '';

          return (
            <div
              key={itemKey}
              className={`flex items-center gap-2 px-3 py-1 ${
                idx % 2 === 0 ? 'bg-zinc-900 dark:bg-zinc-900' : 'bg-zinc-800/50 dark:bg-zinc-800/50'
              }`}
            >
              {/* 항목명 */}
              <span className="w-28 shrink-0 truncate text-sm font-bold text-white">
                {tCheck(item.labelKey)}
              </span>

              {isValueOnly ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cyan-300">
                    {plainVal || '-'}
                    {itemKey === 'RUNNING_RUN_NO' && row.RUNNING_LOT_PLAN_QTY != null && (
                      <span className="ml-2 text-zinc-400">LOT: {row.RUNNING_LOT_PLAN_QTY}</span>
                    )}
                    {'subKey' in item && row[(item as { subKey: string }).subKey] ? (
                      <span className="ml-2 text-xs text-zinc-400">[{String(row[(item as { subKey: string }).subKey])}]</span>
                    ) : null}
                    {'subKey2' in item && row[(item as { subKey2: string }).subKey2] ? (
                      <span className="ml-1 text-xs text-zinc-500">{String(row[(item as { subKey2: string }).subKey2])}</span>
                    ) : null}
                  </span>
                  {'badgeKey' in item && row[(item as { badgeKey: string }).badgeKey] && (
                    <span className={`ml-auto shrink-0 rounded-lg px-4 py-1 text-base font-black ${
                      String(row[(item as { badgeKey: string }).badgeKey]) === 'OK'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-black'
                    }`}>
                      {String(row[(item as { badgeKey: string }).badgeKey])}
                    </span>
                  )}
                  {'badgeKey2' in item && row[(item as { badgeKey2: string }).badgeKey2] && (
                    <span className="shrink-0 rounded-lg bg-zinc-700 px-4 py-1 text-base font-black text-zinc-200">
                      {String(row[(item as { badgeKey2: string }).badgeKey2])}
                    </span>
                  )}
                </>
              ) : isActive ? (
                <>
                  {/* 상태 뱃지 */}
                  <span className={`shrink-0 rounded px-2.5 py-0.5 text-sm font-black ${getCheckBadgeClass(status)}`}>
                    {status}
                  </span>
                  {/* LOT NO 또는 값/날짜 표시 */}
                  {'lotKeys' in item ? (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                        {(item as { lotKeys: readonly string[] }).lotKeys
                          .map((lk) => String(row[lk] ?? '')).filter(Boolean).join(' / ')}
                      </span>
                      {'rateKeys' in item && (
                        <span className="ml-auto shrink-0 text-sm font-bold text-yellow-300">
                          {(item as unknown as { rateKeys: string[] }).rateKeys
                            .map((rk) => row[rk] != null ? `${Number(row[rk]).toFixed(1)}%` : '').filter(Boolean).join('/')}
                        </span>
                      )}
                    </>
                  ) : dateVal ? (
                    <>
                      <span className={`min-w-0 truncate text-sm ${
                        status === 'NG' ? 'font-bold text-red-400' : 'text-zinc-300'
                      }`}>
                        {dateVal}
                      </span>
                      {'rateKeys' in item && (
                        <span className="ml-auto shrink-0 text-sm font-bold text-yellow-300">
                          {(item as unknown as { rateKeys: string[] }).rateKeys
                            .map((rk) => row[rk] != null ? `${Number(row[rk]).toFixed(1)}%` : '').filter(Boolean).join('/')}
                        </span>
                      )}
                      {'hourKey' in item && row[(item as { hourKey: string }).hourKey] && (
                        <span className={`ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                          String(row[(item as { hourKey: string }).hourKey]) === 'NG' ? 'bg-red-600 text-white' :
                          String(row[(item as { hourKey: string }).hourKey]) === 'WN' ? 'bg-amber-500 text-black' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {String(row[(item as { hourKey: string }).hourKey])}
                        </span>
                      )}
                    </>
                  ) : null}
                </>
              ) : (
                <span className="text-sm text-zinc-600">-</span>
              )}
            </div>
          );
        })}
      </div>

      {/* NSNP 사유 상태바 */}
      {row.NSNP_REASON && (
        <div className="shrink-0 bg-amber-600 px-4 py-1.5 text-center text-sm font-bold text-white">
          {row.NSNP_STATUS_NAME && <span>[{row.NSNP_STATUS_NAME}]</span>} {row.NSNP_REASON}
        </div>
      )}
    </div>
  );
}
