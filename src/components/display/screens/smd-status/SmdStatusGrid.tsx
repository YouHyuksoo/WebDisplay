/**
 * @file SmdStatusGrid.tsx
 * @description SMD 생산현황 모니터링 화면의 상단 그리드 컴포넌트.
 * 초보자 가이드: 각 SMD 라인(S01~S06)의 실시간 상태를 2줄 구조로 표시한다.
 * - 메인행: 상태, 라인명, 모델, Step, 계획일자, 제조번호, 계획/실적/비율
 * - 서브행: LCR 상태, WAIT 정보, AOI, Start/AOI 시간
 * TV 모니터에 걸어두는 용도라 폰트가 크고 가독성을 최우선으로 설계되었다.
 */
'use client';

import { formatNumber } from '../../shared/DataBadges';

/**
 * DB LINE_STATUS 코드값 기반 배경색 반환.
 * 실제 DB 값: 'N'=정상(OK), 'S'=정지(STOP).
 * @param statusCode - DB LINE_STATUS 값
 */
function getStatusColor(statusCode?: string | number): string {
  const code = String(statusCode ?? '').toUpperCase();
  if (code === 'N') return 'bg-emerald-600 text-white';
  if (code === 'S') return 'bg-red-600 text-white animate-pulse';
  return 'bg-zinc-500 text-white';
}

/** SMD 라인별 기계 상태 데이터 행 */
export interface MachineStatusRow {
  LINE_NAME?: string;
  LINE_STATUS?: string | number;
  LINE_STATUS_NAME?: string;
  RUNNING_MODEL_NAME?: string;
  USE_RATE?: number;
  RUNNING_RUN_DATE?: string;
  RUNNING_RUN_NO?: string;
  RUNNING_LOT_PLAN_QTY?: number;
  RUNNING_LOT_ACTUAL_QTY?: number;
  LCR_CHECK_STATUS?: string;
  NSNP_LOCK_TYPE_NAME?: string;
  ITEM_CODE?: string;
  STATUS_CHANGE_DATE?: string;
  RUN_DATE?: string;
  LINE_PRODUCT_DIVISION_NAME?: string;
  [key: string]: unknown;
}

interface SmdStatusGridProps {
  rows: MachineStatusRow[];
}

/** 정렬 클래스 매핑 (Tailwind JIT가 동적 클래스를 인식하지 못하므로 명시적 매핑) */
const ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** 메인행 헤더 정의 */
const MAIN_HEADERS = [
  { label: '상태', align: 'center' },
  { label: '라인', align: 'left' },
  { label: '모델명', align: 'left' },
  { label: 'Step', align: 'center' },
  { label: '계획일자', align: 'center' },
  { label: '제조번호', align: 'center' },
  { label: '계획', align: 'right' },
  { label: '실적', align: 'right' },
  { label: '비율', align: 'right' },
] as const;

/** 날짜 문자열에서 년월일(YYYY-MM-DD)만 추출한다. */
function dateOnly(val?: string): string {
  if (!val) return '-';
  return val.slice(0, 10);
}

/**
 * 계획 대비 실적 비율을 계산한다.
 * @param plan - 계획 수량
 * @param actual - 실적 수량
 */
function calcRate(plan?: number, actual?: number): string {
  if (!plan || plan === 0) return '-';
  if (actual == null) return '0.0%';
  return `${((actual / plan) * 100).toFixed(1)}%`;
}

/**
 * SMD 생산현황 그리드 컴포넌트.
 * 각 라인마다 메인행 + 서브행 2줄 구조로 표시한다.
 */
export default function SmdStatusGrid({ rows }: SmdStatusGridProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
        데이터 없음
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
      {/* 메인행 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-zinc-900 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex w-32 shrink-0 items-center justify-center text-lg font-black text-zinc-100 dark:text-zinc-100">
          상태
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-8 gap-px px-1">
          {MAIN_HEADERS.filter((h) => h.label !== '상태').map((h) => (
            <div
              key={h.label}
              className={`px-2 py-3 text-lg font-black text-zinc-100 dark:text-zinc-100 ${ALIGN[h.align]}`}
            >
              {h.label}
            </div>
          ))}
        </div>
      </div>

      {/* 라인별 2줄 구조 — 남은 공간을 균등 분배 */}
      <div className="min-h-0 flex-1">
      {rows.map((row, idx) => {
        const rate = calcRate(row.RUNNING_LOT_PLAN_QTY, row.RUNNING_LOT_ACTUAL_QTY);
        const hasStep = row.USE_RATE != null && row.USE_RATE > 0;

        return (
          <div
            key={row.LINE_NAME ?? idx}
            className={`border-b border-zinc-100 last:border-b-0 dark:border-white/5 ${
              idx % 2 === 0
                ? 'bg-white dark:bg-zinc-950'
                : 'bg-zinc-50/50 dark:bg-zinc-900/40'
            }`}
          >
            <div className="flex">
              {/* 좌: 상태 — 행 전체 높이를 꽉 채움 */}
              <div
                className={`flex w-32 shrink-0 items-center justify-center text-3xl font-black ${
                  getStatusColor(row.LINE_STATUS)
                }`}
              >
                {row.LINE_STATUS_NAME || '-'}
              </div>

              {/* 우: 메인정보 + 서브정보 2줄 */}
              <div className="min-w-0 flex-1">
                {/* 1줄: 메인 정보 */}
                <div className="grid grid-cols-8 items-center gap-px px-1">
                  <div className="px-2 py-1 text-3xl font-black text-zinc-900 dark:text-white">
                    {row.LINE_NAME ?? '-'}
                  </div>
                  <div className="truncate px-2 py-1 text-2xl font-bold text-zinc-700 dark:text-zinc-300">
                    {row.RUNNING_MODEL_NAME ?? '-'}
                  </div>
                  <div className="px-2 py-1 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xl font-bold ${
                        hasStep
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {row.USE_RATE != null ? `${row.USE_RATE}min.` : '-'}
                    </span>
                  </div>
                  <div className="px-2 py-1 text-center text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                    {dateOnly(row.RUNNING_RUN_DATE)}
                  </div>
                  <div className="px-2 py-1 text-center text-2xl font-bold text-zinc-700 dark:text-zinc-300">
                    {row.RUNNING_RUN_NO ?? '-'}
                  </div>
                  <div className="px-2 py-1 text-right text-3xl font-bold text-zinc-600 dark:text-zinc-400">
                    {formatNumber(row.RUNNING_LOT_PLAN_QTY)}
                  </div>
                  <div className="px-2 py-1 text-right text-4xl font-black text-zinc-900 dark:text-white">
                    {formatNumber(row.RUNNING_LOT_ACTUAL_QTY)}
                  </div>
                  <div className="px-2 py-1 text-right text-3xl font-black text-sky-600 dark:text-sky-400">
                    {rate}
                  </div>
                </div>
                {/* 2줄: 서브 정보 */}
                <div className="grid grid-cols-6 items-center gap-px border-t border-zinc-100/60 bg-zinc-50/30 px-1 dark:border-white/[0.03] dark:bg-zinc-900/20">
                  <div className="px-2 py-0.5 text-center text-lg font-semibold text-zinc-500 dark:text-zinc-500">
                    {row.LCR_CHECK_STATUS ?? '-'}
                  </div>
                  <div className="truncate px-2 py-0.5 text-lg font-semibold text-zinc-500 dark:text-zinc-500">
                    {row.NSNP_LOCK_TYPE_NAME ?? '-'}
                  </div>
                  <div className="truncate px-2 py-0.5 text-lg font-semibold text-zinc-500 dark:text-zinc-500">
                    {row.ITEM_CODE ?? '-'}
                  </div>
                  <div className="px-2 py-0.5 text-center text-lg font-semibold text-zinc-500 dark:text-zinc-500">
                    {dateOnly(row.STATUS_CHANGE_DATE)}
                  </div>
                  <div className="px-2 py-0.5 text-center text-lg font-semibold text-zinc-500 dark:text-zinc-500">
                    {dateOnly(row.RUN_DATE)}
                  </div>
                  <div className="px-2 py-0.5 text-center text-lg font-semibold text-zinc-400 dark:text-zinc-600">
                    {row.LINE_PRODUCT_DIVISION_NAME ?? '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </section>
  );
}
