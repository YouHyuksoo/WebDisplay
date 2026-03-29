/**
 * @file ProductIoGrid.tsx
 * @description 투입/포장 모니터링 그리드 컴포넌트.
 *
 * 초보자 가이드:
 * 1. 단일 라인의 생산계획 대비 시간대별 실적을 풀스크린 다크 UI로 표시한다.
 * 2. 상단: 라인명, 시프트(주간/야간), 현재 시각.
 * 3. 중간: 6개 시간대 + Total 컬럼으로 목표/실적/부족/달성률을 표시.
 * 4. 하단: 모델 정보, 공지사항, 리더/부리더 표시.
 * 5. PB 원본: w_display_product_io_status
 */
'use client';

import { useEffect, useState } from 'react';
import { fmtNum } from '@/lib/display-helpers';

/** 계획 데이터 행 타입 */
interface PlanData {
  LINE_NAME?: string; SHIFT_CODE?: string; PLAN_QTY?: number; UPH?: number;
  MODEL_NAME?: string; ITEM_CODE?: string; COMMENTS?: string;
  LEADER_ID?: string; SUB_LEADER_ID?: string;
  LEADER_NAME?: string; SUB_LEADER_NAME?: string;
}

interface ProductIoGridProps {
  plan: PlanData | null; timeZones: number[]; targets: number[];
  totalActual: number; timeLabels: string[]; shift: string;
  isLoading: boolean; error?: Error;
}

/** 현재 시각을 1초 간격으로 갱신하는 훅 */
function useClock(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('ko-KR', { hour12: false }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('ko-KR', { hour12: false })), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/** 요약 셀 */
function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex-1">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

/** 정보 셀 */
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <span className="text-zinc-500">{label}: </span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

/** 테이블 셀 공통 클래스 */
const TD = 'border border-zinc-700 px-2 py-2';
const TH = 'border border-zinc-700 px-2 py-1';
const LABEL_TD = `${TD} bg-zinc-800 text-zinc-300`;

export default function ProductIoGrid({
  plan,
  timeZones,
  targets,
  totalActual,
  timeLabels,
  shift,
  isLoading,
  error,
}: ProductIoGridProps) {
  const clock = useClock();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-red-400">
        데이터 조회 실패: {error.message}
      </div>
    );
  }

  if (isLoading && !plan) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-zinc-400">
        데이터 로딩 중...
      </div>
    );
  }

  const planQty = Number(plan?.PLAN_QTY) || 0;
  const shiftLabel = shift === 'A' ? 'Day' : 'Night';
  const completionRate = planQty > 0 ? ((totalActual / planQty) * 100).toFixed(1) : '0.0';

  /* 시간대별 누적 목표/실적 합산 */
  const totalTarget = targets.reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full flex-col gap-2 bg-zinc-950 p-3 text-white">
      {/* ── 헤더 바 ── */}
      <div className="flex items-center justify-between rounded bg-zinc-900 px-4 py-2">
        <span className="text-xl font-bold text-cyan-400">
          {plan?.LINE_NAME ?? '라인 미선택'}
        </span>
        <span className="text-lg font-semibold text-yellow-300">
          {shiftLabel} Shift
        </span>
        <span className="font-mono text-lg text-zinc-300">{clock}</span>
      </div>

      {/* ── 계획 요약 ── */}
      <div className="flex gap-4 rounded bg-zinc-900 px-4 py-2 text-center">
        <SummaryCell label="Plan Q'ty" value={fmtNum(planQty)} />
        <SummaryCell label="Finished Q'ty" value={fmtNum(totalActual)} />
        <SummaryCell
          label="Completion %"
          value={`${completionRate}%`}
          highlight={Number(completionRate) >= 100}
        />
      </div>

      {/* ── 메인 그리드 테이블 ── */}
      <div className="min-h-0 flex-1 overflow-auto rounded bg-zinc-900">
        <table className="w-full table-fixed border-collapse text-center text-sm">
          <thead>
            <tr className="bg-zinc-800 text-zinc-300">
              <th className={`w-24 ${TH}`}>구분</th>
              {timeLabels.map((lbl) => (<th key={lbl} className={TH}>{lbl}</th>))}
              <th className={`${TH} text-yellow-300`}>Total</th>
            </tr>
          </thead>
          <tbody className="text-base font-semibold">
            <tr>
              <td className={LABEL_TD}>Target</td>
              {targets.map((v, i) => (<td key={i} className={TD}>{fmtNum(v)}</td>))}
              <td className={`${TD} text-yellow-300`}>{fmtNum(totalTarget)}</td>
            </tr>
            <tr>
              <td className={LABEL_TD}>Actual</td>
              {timeZones.map((v, i) => (<td key={i} className={`${TD} text-cyan-400`}>{fmtNum(v)}</td>))}
              <td className={`${TD} text-cyan-400`}>{fmtNum(totalActual)}</td>
            </tr>
            <tr>
              <td className={LABEL_TD}>Shortage</td>
              {timeZones.map((v, i) => {
                const d = v - targets[i];
                return <td key={i} className={`${TD} ${d < 0 ? 'text-red-400' : 'text-green-400'}`}>{fmtNum(d)}</td>;
              })}
              <td className={`${TD} ${totalActual - totalTarget < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {fmtNum(totalActual - totalTarget)}
              </td>
            </tr>
            <tr>
              <td className={LABEL_TD}>% Rate</td>
              {timeZones.map((v, i) => {
                const r = targets[i] > 0 ? ((v / targets[i]) * 100).toFixed(1) : '-';
                return <td key={i} className={TD}>{r}%</td>;
              })}
              <td className={`${TD} text-yellow-300`}>{completionRate}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 모델 정보 바 ── */}
      <div className="flex gap-4 rounded bg-zinc-900 px-4 py-2 text-sm">
        <InfoCell label="MODEL TYPE" value={plan?.MODEL_NAME ?? '-'} />
        <InfoCell label="UPH" value={plan?.UPH != null ? String(plan.UPH) : '-'} />
        <InfoCell label="Code" value={plan?.ITEM_CODE ?? '-'} />
        <InfoCell label="PlanQty" value={fmtNum(planQty)} />
        <InfoCell label="CompletionQty" value={fmtNum(totalActual)} />
      </div>

      {/* ── 하단 바: 공지 + 리더 ── */}
      <div className="flex items-center justify-between rounded bg-zinc-900 px-4 py-2 text-sm">
        <span className="text-yellow-300">{plan?.COMMENTS ?? ''}</span>
        <div className="flex gap-6 text-zinc-300">
          <span>Leader: {plan?.LEADER_NAME ?? '-'} ({plan?.LEADER_ID ?? '-'})</span>
          <span>Sub: {plan?.SUB_LEADER_NAME ?? '-'} ({plan?.SUB_LEADER_ID ?? '-'})</span>
        </div>
      </div>
    </div>
  );
}

