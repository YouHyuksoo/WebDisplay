/**
 * @file src/components/mxvc/PostProcessKpiCards.tsx
 * @description 후공정생산현황 KPI 요약 카드 6개
 * 초보자 가이드:
 * - 생산계획: IP_PRODUCT_LINE + F_GET_RUN_LOT_QTY(RUN_NO) 합계
 * - ICT투입실적: LOG_ICT IS_LAST='Y' 바코드 수
 * - EOL검사실적: LOG_EOL IS_LAST='Y' 바코드 수
 * - 불량율: 5개 LOG 테이블 바코드 단위 불량율
 * - 재검 건수: 동일 바코드 FILE_NAME 2회 이상
 * - 수리대기/완료: IP_PRODUCT_WORK_QC.RECEIPT_DEFICIT ('1'=대기, '2'=완료)
 */
import type { PostProcessKpi } from '@/types/mxvc/post-process';

interface Props {
  kpi: PostProcessKpi;
  ictTotal: number;
  eolTotal: number;
}

/** 불량/재검사율 기준 색상 (낮을수록 좋음) */
function badCls(rate: number): string {
  if (rate <= 1) return 'text-emerald-500 dark:text-emerald-400';
  if (rate <= 3) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

function KpiCard({ label, value, sub, valueClass = '' }: CardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      <span className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</span>}
    </div>
  );
}

export default function PostProcessKpiCards({ kpi, ictTotal, eolTotal }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 flex-1 min-w-0">
      {/* 생산 계획 — 라인별 모델명/RUN_NO 표시 */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">생산 계획</span>
        <span className="text-3xl font-bold tabular-nums text-gray-800 dark:text-gray-100">
          {kpi.planQty.toLocaleString()}
        </span>
        <div className="mt-1.5 space-y-0.5">
          {kpi.planLines.map((l) => (
            <div key={l.runNo} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              <span className="font-semibold text-blue-500 dark:text-blue-400 w-8 shrink-0">{l.lineName}</span>
              <span className="truncate text-gray-500 dark:text-gray-400" title={l.modelName}>{l.modelName}</span>
              <span className="text-gray-300 dark:text-gray-600 shrink-0">·</span>
              <span className="shrink-0">{l.runNo}</span>
            </div>
          ))}
          {kpi.planLines.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">진행 중인 RUN 없음</span>
          )}
        </div>
      </div>
      <KpiCard
        label="ICT 투입실적"
        value={ictTotal.toLocaleString()}
        sub="당일 08:00 ~ 현재 (IS_LAST=Y)"
        valueClass="text-blue-600 dark:text-blue-400"
      />
      <KpiCard
        label="EOL 검사실적"
        value={eolTotal.toLocaleString()}
        sub="당일 08:00 ~ 현재 (IS_LAST=Y)"
        valueClass="text-violet-600 dark:text-violet-400"
      />
      <KpiCard
        label="불량율"
        value={`${kpi.defectRate.toFixed(2)}%`}
        sub="ICT / EOL / COATING 1·2 / DOWNLOAD"
        valueClass={badCls(kpi.defectRate)}
      />
      <KpiCard
        label="재검 건수"
        value={`${kpi.retestCount.toLocaleString()}건`}
        sub="동일 바코드 FILE_NAME 2회 이상"
        valueClass={kpi.retestCount === 0
          ? 'text-emerald-500 dark:text-emerald-400'
          : kpi.retestCount <= 5
          ? 'text-yellow-500 dark:text-yellow-400'
          : 'text-red-500 dark:text-red-400'}
      />
      <KpiCard
        label="수리 현황"
        value={`대기 ${kpi.repairWaiting}건`}
        sub={`완료 ${kpi.repairDone}건`}
        valueClass={kpi.repairWaiting > 0
          ? 'text-orange-500 dark:text-orange-400'
          : 'text-emerald-500 dark:text-emerald-400'}
      />
    </div>
  );
}
