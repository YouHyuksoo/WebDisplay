/**
 * @file src/components/mxvc/PostProcessKpiCards.tsx
 * @description 후공정생산현황 KPI 요약 카드 6개
 * 초보자 가이드:
 * - 달성율/계획/실적: IRPT_PRODUCT_LINE_TARGET_MONITORING 집계
 * - 불량율/재검사율: 5개 LOG 테이블 바코드 단위 집계 결과
 * - 수리대기/완료: IP_PRODUCT_WORK_QC.QC_INSPECT_HANDLING ('W'=대기, 'U'=완료)
 * 색상 기준: 달성율 ≥95% 녹색, 불량/재검사율 ≤1% 녹색
 */
import type { PostProcessKpi } from '@/types/mxvc/post-process';

interface Props {
  kpi: PostProcessKpi;
}

/** 달성율 기준 색상 (높을수록 좋음) */
function achCls(rate: number): string {
  if (rate >= 95) return 'text-emerald-500 dark:text-emerald-400';
  if (rate >= 90) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
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

export default function PostProcessKpiCards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4 shrink-0">
      <KpiCard
        label="생산 달성율"
        value={`${kpi.achievementRate.toFixed(1)}%`}
        sub={`목표 ${kpi.targetQty.toLocaleString()} 기준`}
        valueClass={achCls(kpi.achievementRate)}
      />
      <KpiCard
        label="생산 계획"
        value={kpi.planQty.toLocaleString()}
        sub="수량 (lot_qty)"
        valueClass="text-gray-800 dark:text-gray-100"
      />
      <KpiCard
        label="생산 실적"
        value={kpi.actualQty.toLocaleString()}
        sub={`목표 대비 ${kpi.achievementRate.toFixed(1)}%`}
        valueClass="text-blue-600 dark:text-blue-400"
      />
      <KpiCard
        label="불량율"
        value={`${kpi.defectRate.toFixed(2)}%`}
        sub="ICT / EOL / COATING 1·2 / DOWNLOAD"
        valueClass={badCls(kpi.defectRate)}
      />
      <KpiCard
        label="재검사율"
        value={`${kpi.retestRate.toFixed(2)}%`}
        sub="동일 바코드 2회 이상 검사"
        valueClass={badCls(kpi.retestRate)}
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
