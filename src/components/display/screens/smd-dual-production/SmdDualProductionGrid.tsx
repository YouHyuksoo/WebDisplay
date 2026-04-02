/**
 * @file SmdDualProductionGrid.tsx
 * @description SMD 듀얼생산현황 상세 그리드 컴포넌트 (메뉴 27).
 * 초보자 가이드: PB 원본의 FreeForm DataWindow를 React 카드형 그리드로 변환.
 * 각 라인별로 상태/라인명/모델/계획/Target/투입/실적/진행률/AOI FPY/UPH를 표시한다.
 * useGridResizer 훅으로 컬럼 폭 드래그 조정 + localStorage 저장.
 * PB 원본: d_display_machine_status_single (FreeForm layout)
 */
'use client';

import { useGridResizer } from '@/hooks/useGridResizer';
import { useTranslations } from 'next-intl';
import { formatNumber } from '../../shared/DataBadges';

/** SMD 듀얼 생산현황 데이터 행 */
export interface SmdDualRow {
  LINE_NAME?: string;
  LINE_STATUS?: string;
  LINE_STATUS_NAME?: string;
  NSNP_STATUS?: string;
  NSNP_STATUS_NAME?: string;
  NSNP_LOCK_TYPE_NAME?: string;
  RUNNING_MODEL_NAME?: string;
  RUNNING_RUN_NO?: string;
  RUNNING_RUN_DATE?: string;
  ITEM_CODE?: string;
  RUN_STATUS_NAME?: string;
  LCR_CHECK_STATUS?: string;
  UPH_VALUE?: number;
  USE_RATE?: number;
  RUNNING_LOT_PLAN_QTY?: number;
  RUNNING_LOT_INPUT_QTY?: number;
  RUNNING_LOT_ACTUAL_QTY?: number;
  TARGET_QTY?: number;
  AOI_PASS_RATE?: number;
  PRODUCT_RUN_TYPE_NAME?: string;
  CARRIER_SIZE?: number;
  [key: string]: unknown;
}

interface SmdDualProductionGridProps {
  rows: SmdDualRow[];
}

/** 헤더 정의 — PB FreeForm 컬럼 매핑 */
const HEADERS = [
  { label: '상태', align: 'center' },
  { label: '라인', align: 'left' },
  { label: '모델명', align: 'left' },
  { label: '계획', align: 'right' },
  { label: 'Target', align: 'right' },
  { label: '투입', align: 'right' },
  { label: '실적', align: 'right' },
  { label: '진행률', align: 'right' },
  { label: 'AOI FPY', align: 'right' },
  { label: 'UPH', align: 'right' },
] as const;

/** 초기 폭 (px) — 컬럼 수와 동일 */
const INITIAL_WIDTHS = [100, 110, 220, 110, 110, 110, 110, 100, 100, 90];

/** 정렬 클래스 매핑 */
const ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * 라인 상태에 따른 색상 클래스 반환.
 * PB 원본: line_status='N' + nsnp_status='N' → 초록, 그 외 → 빨강
 */
function getStatusColor(lineStatus?: string, nsnpStatus?: string): string {
  const ls = String(lineStatus ?? '').toUpperCase();
  const ns = String(nsnpStatus ?? '').toUpperCase();
  if (ls === 'N' && (ns === 'N' || ns === 'WAIT' || ns === 'WAIT[X]')) {
    return 'bg-emerald-600 text-white';
  }
  return 'bg-red-600 text-yellow-200 animate-pulse';
}

/** 상태 표시 텍스트 (PB: line_status='N'이면 상태명, 아니면 NSNP 상태) */
function getStatusText(row: SmdDualRow): string {
  const ls = String(row.LINE_STATUS ?? '').toUpperCase();
  const ns = String(row.NSNP_STATUS ?? '').toUpperCase();
  if (ls === 'N' && (ns === 'N' || ns === 'WAIT')) {
    return row.LINE_STATUS_NAME || 'OK';
  }
  if (ls !== 'N') return row.LINE_STATUS_NAME || 'STOP';
  return row.NSNP_STATUS_NAME || row.NSNP_LOCK_TYPE_NAME || 'NG';
}

/** 진행률 계산 */
function calcRate(plan?: number, actual?: number): string {
  if (!plan || plan === 0) return '-';
  if (actual == null) return '0%';
  return `${Math.round((actual / plan) * 100)}%`;
}

/** 날짜에서 yyyy-mm-dd만 추출 */
function dateOnly(val?: string): string {
  if (!val) return '-';
  return val.slice(0, 10);
}

/** SMD 듀얼 생산현황 그리드 (라인별 2줄 구조) */
export default function SmdDualProductionGrid({ rows }: SmdDualProductionGridProps) {
  const t = useTranslations('common');
  const { widths, handleMouseDown } = useGridResizer('grid-widths-smd-dual', INITIAL_WIDTHS);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
        {t('noData')}
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
      {/* 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-zinc-900 dark:border-zinc-700 dark:bg-zinc-900">
        {HEADERS.map((h, i) => (
          <div
            key={h.label}
            className={`relative shrink-0 px-2 py-3 text-lg font-black text-zinc-100 dark:text-zinc-100 ${ALIGN[h.align]}`}
            style={{ width: widths[i] }}
          >
            {h.label}
            <div className="resize-handle" onMouseDown={(e) => handleMouseDown(i, e)} />
          </div>
        ))}
      </div>

      {/* 데이터 행 — 남은 공간 균등 분배 */}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.map((row, idx) => {
          const rate = calcRate(row.RUNNING_LOT_PLAN_QTY, row.RUNNING_LOT_ACTUAL_QTY);

          return (
            <div
              key={row.LINE_NAME ?? idx}
              className={`border-b border-zinc-100 last:border-b-0 dark:border-white/5 ${
                idx % 2 === 0
                  ? 'bg-white dark:bg-zinc-950'
                  : 'bg-zinc-50/50 dark:bg-zinc-900/40'
              }`}
            >
              {/* 1줄: 메인 정보 */}
              <div className="flex">
                <div
                  className={`flex shrink-0 items-center justify-center text-2xl font-black ${getStatusColor(row.LINE_STATUS, row.NSNP_STATUS)}`}
                  style={{ width: widths[0] }}
                >
                  {getStatusText(row)}
                </div>
                <div className="shrink-0 truncate px-2 py-1 text-3xl font-black text-zinc-900 dark:text-white" style={{ width: widths[1] }}>
                  {row.LINE_NAME ?? '-'}
                </div>
                <div className="shrink-0 truncate px-2 py-1 text-2xl font-bold text-zinc-700 dark:text-zinc-300" style={{ width: widths[2] }}>
                  {row.RUNNING_MODEL_NAME ?? '-'}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-2xl font-bold text-zinc-500 dark:text-zinc-400" style={{ width: widths[3] }}>
                  {formatNumber(row.RUNNING_LOT_PLAN_QTY)}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-2xl font-bold text-zinc-600 dark:text-zinc-300" style={{ width: widths[4] }}>
                  {formatNumber(row.TARGET_QTY)}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-2xl font-bold text-blue-600 dark:text-blue-400" style={{ width: widths[5] }}>
                  {formatNumber(row.RUNNING_LOT_INPUT_QTY)}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-3xl font-black text-zinc-900 dark:text-white" style={{ width: widths[6] }}>
                  {formatNumber(row.RUNNING_LOT_ACTUAL_QTY)}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-3xl font-black text-sky-600 dark:text-sky-400" style={{ width: widths[7] }}>
                  {rate}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-2xl font-bold text-zinc-600 dark:text-zinc-300" style={{ width: widths[8] }}>
                  {row.AOI_PASS_RATE != null ? `${row.AOI_PASS_RATE}%` : '-'}
                </div>
                <div className="shrink-0 px-2 py-1 text-right text-2xl font-bold text-amber-500 dark:text-amber-400" style={{ width: widths[9] }}>
                  {formatNumber(row.UPH_VALUE)}
                </div>
              </div>

              {/* 2줄: 서브 정보 */}
              <div className="flex gap-4 border-t border-zinc-100/60 bg-zinc-50/30 px-3 py-0.5 dark:border-white/[0.03] dark:bg-zinc-900/20">
                <span className="text-lg text-zinc-500 dark:text-zinc-500">
                  {row.ITEM_CODE ?? '-'}
                </span>
                <span className="text-lg text-zinc-500 dark:text-zinc-500">
                  {row.RUNNING_RUN_NO ?? '-'}
                </span>
                <span className="text-lg text-zinc-500 dark:text-zinc-500">
                  {dateOnly(row.RUNNING_RUN_DATE)}
                </span>
                {row.LCR_CHECK_STATUS && (
                  <span className={`text-lg font-semibold ${
                    row.LCR_CHECK_STATUS === 'WAIT'
                      ? 'text-red-400'
                      : 'text-blue-400'
                  }`}>
                    LCR: {row.LCR_CHECK_STATUS}
                  </span>
                )}
                {row.PRODUCT_RUN_TYPE_NAME && (
                  <span className="text-lg text-zinc-400 dark:text-zinc-600">
                    {row.PRODUCT_RUN_TYPE_NAME}
                  </span>
                )}
                {row.NSNP_LOCK_TYPE_NAME && row.NSNP_STATUS !== 'N' && (
                  <span className="text-lg font-semibold text-yellow-400">
                    {row.NSNP_LOCK_TYPE_NAME}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
