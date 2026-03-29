/**
 * @file ProductIoGrid.tsx
 * @description 투입/포장 모니터링 그리드 컴포넌트.
 *
 * 초보자 가이드:
 * 1. 단일 라인의 생산계획 대비 시간대별 실적을 풀스크린 다크 UI로 표시한다.
 * 2. 상단: 라인명, 시프트(주간/야간), 현재 시각.
 * 3. 중간: Time A~F + Total 컬럼으로 목표/실적/부족/달성률을 대형 폰트로 표시.
 * 4. 하단: 모델 정보, 공지사항, 리더/부리더 표시.
 * 5. 공장 모니터 전용 — 멀리서도 읽을 수 있도록 큰 글자 사용.
 */
'use client';

import { useEffect, useState } from 'react';
import { fmtNum } from '@/lib/display-helpers';

interface PlanData {
  LINE_NAME?: string; SHIFT_CODE?: string; PLAN_QTY?: number; UPH?: number;
  MODEL_NAME?: string; ITEM_CODE?: string; COMMENTS?: string;
  LEADER_ID?: string; SUB_LEADER_ID?: string;
  LEADER_NAME?: string; SUB_LEADER_NAME?: string;
}

interface ProductIoGridProps {
  plan: PlanData | null; timeZones: number[]; targets: number[];
  totalActual: number; timeLabels: string[]; shift: string;
  /** 시간대 알파벳 코드 (A,B,C... or G,H,I,J) */
  zoneLabels?: string[];
  isLoading: boolean; error?: Error;
}

function useClock(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('ko-KR', { hour12: false }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('ko-KR', { hour12: false })), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const TD = 'border border-zinc-700 px-3 py-1';

export default function ProductIoGrid({
  plan, timeZones, targets, totalActual, timeLabels, shift, zoneLabels, isLoading, error,
}: ProductIoGridProps) {
  const clock = useClock();

  if (error) {
    return <div className="flex h-full items-center justify-center bg-zinc-950 text-3xl text-red-400">데이터 조회 실패</div>;
  }
  if (isLoading && !plan) {
    return <div className="flex h-full items-center justify-center bg-zinc-950 text-3xl text-zinc-400">로딩 중...</div>;
  }

  const planQty = Number(plan?.PLAN_QTY) || 0;
  const shiftLabel = shift === 'A' ? 'Day' : 'Night';
  const completionRate = planQty > 0 ? ((totalActual / planQty) * 100).toFixed(1) : '0.0';
  const totalTarget = targets.reduce((a, b) => a + b, 0);
  const totalShortage = totalActual - totalTarget;

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-1 text-white">
      {/* 헤더 + 요약 */}
      <div className="mb-2 flex items-center justify-between rounded bg-zinc-900 px-4 py-2">
        <span className="text-3xl font-bold text-cyan-400">{plan?.LINE_NAME ?? '라인 미선택'}</span>
        <span className="text-2xl font-bold text-yellow-300">{shiftLabel}</span>
        <span className="text-base text-zinc-500">Plan: <strong className="text-2xl text-white">{fmtNum(planQty)}</strong></span>
        <span className="text-base text-zinc-500">Finished: <strong className="text-2xl text-green-400">{fmtNum(totalActual)}</strong></span>
        <span className="text-base text-zinc-500">Rate: <strong className={`text-2xl ${Number(completionRate) >= 100 ? 'text-green-400' : 'text-yellow-300'}`}>{completionRate}%</strong></span>
        <span className="font-mono text-xl text-zinc-400">{clock}</span>
      </div>

      {/* 메인 그리드 — 상단/하단 사이 가변 */}
      <div className="min-h-0 flex-1 overflow-hidden px-1 py-1">
        <table className="h-full w-full table-fixed border-collapse text-center">
          <thead>
            <tr className="bg-zinc-800">
              <th className={`${TD} w-36 text-xl text-zinc-400`}></th>
              {['A', 'B', 'C', 'D', 'E'].slice(0, timeLabels.length).map((letter, i) => (
                <th key={i} className={`${TD} text-4xl font-bold text-zinc-200`}>
                  {letter}
                  <div className="text-sm font-normal text-zinc-500">{timeLabels[i] ?? ''}</div>
                </th>
              ))}
              <th className={`${TD} text-4xl font-bold text-yellow-300`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Target */}
            <tr className="bg-zinc-900/80">
              <td className={`${TD} text-3xl font-bold text-yellow-400`}>Target</td>
              {targets.map((v, i) => (
                <td key={i} className={`${TD} text-4xl font-bold`}>{fmtNum(v)}</td>
              ))}
              <td className={`${TD} text-4xl font-bold text-yellow-300`}>{fmtNum(totalTarget)}</td>
            </tr>
            {/* Actual */}
            <tr className="bg-zinc-950/60">
              <td className={`${TD} text-3xl font-bold text-green-400`}>Actual</td>
              {timeZones.map((v, i) => (
                <td key={i} className={`${TD} text-4xl font-bold text-cyan-400`}>{fmtNum(v)}</td>
              ))}
              <td className={`${TD} text-4xl font-bold text-cyan-400`}>{fmtNum(totalActual)}</td>
            </tr>
            {/* Shortage */}
            <tr className="bg-zinc-900/80">
              <td className={`${TD} text-3xl font-bold text-red-400`}>Shortage</td>
              {timeZones.map((v, i) => {
                const d = v - targets[i];
                return (
                  <td key={i} className={`${TD} text-4xl font-bold ${d < 0 ? 'text-red-500' : 'text-white'}`}>
                    {fmtNum(d)}
                  </td>
                );
              })}
              <td className={`${TD} text-4xl font-bold ${totalShortage < 0 ? 'text-red-500' : 'text-white'}`}>
                {fmtNum(totalShortage)}
              </td>
            </tr>
            {/* % Rate */}
            <tr className="bg-zinc-950/60">
              <td className={`${TD} text-3xl font-bold text-cyan-400`}>% Rate</td>
              {timeZones.map((v, i) => {
                const r = targets[i] > 0 ? ((v / targets[i]) * 100).toFixed(1) : '-';
                return <td key={i} className={`${TD} text-3xl font-bold text-cyan-300`}>{r}%</td>;
              })}
              <td className={`${TD} text-3xl font-bold text-yellow-300`}>{completionRate}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 하단: 모델 테이블 (최대 4행 고정) + 리더 */}
      <div className="flex shrink-0 items-stretch gap-2 px-1">
        {/* 모델 테이블 (최대 4행 표시) */}
        <div className="min-w-0 flex-1 overflow-auto rounded border border-zinc-700">
          <table className="w-full border-collapse text-center text-lg">
            <thead>
              <tr className="bg-zinc-800 text-2xl font-bold text-zinc-300">
                <th className="border border-zinc-700 px-2 py-1">MODEL TYPE</th>
                <th className="border border-zinc-700 px-2 py-1">UPH</th>
                <th className="border border-zinc-700 px-2 py-1">Code</th>
                <th className="border border-zinc-700 px-2 py-1">PlanQty</th>
                <th className="border border-zinc-700 px-2 py-1">완료수량</th>
              </tr>
            </thead>
            <tbody>
              {/* 실제 데이터 행 */}
              <tr className="bg-zinc-900">
                <td className="border border-zinc-700 px-2 py-1 font-bold">{plan?.MODEL_NAME ?? '-'}</td>
                <td className="border border-zinc-700 px-2 py-1">{plan?.UPH ?? '-'}</td>
                <td className="border border-zinc-700 px-2 py-1 text-cyan-400">{plan?.ITEM_CODE ?? '-'}</td>
                <td className="border border-zinc-700 px-2 py-1">{fmtNum(planQty)}</td>
                <td className="border border-zinc-700 px-2 py-1 text-green-400">{fmtNum(totalActual)}</td>
              </tr>
              {/* 빈 행으로 5행 공간 확보 */}
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={`empty-${i}`} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                  <td className="border border-zinc-700 px-2 py-1">&nbsp;</td>
                  <td className="border border-zinc-700 px-2 py-1">&nbsp;</td>
                  <td className="border border-zinc-700 px-2 py-1">&nbsp;</td>
                  <td className="border border-zinc-700 px-2 py-1">&nbsp;</td>
                  <td className="border border-zinc-700 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* NOTICE — 테이블 아래 빈 공간 활용 */}
          {plan?.COMMENTS && (
            <div className="mt-1 px-2">
              <span className="text-base font-bold text-red-500">NOTICE</span>
              <span className="ml-2 text-lg font-bold text-yellow-300">{plan.COMMENTS}</span>
            </div>
          )}
        </div>
        {/* 리더 영역 — 사진 + 이름 */}
        <div className="flex shrink-0 gap-3 rounded bg-zinc-900 px-3 py-2">
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-bold text-zinc-400">Leader</div>
            <div className="flex h-56 w-44 items-center justify-center rounded bg-zinc-800 text-7xl text-zinc-600">👤</div>
            <div className="text-sm font-bold text-zinc-200">{plan?.LEADER_NAME ?? '-'}</div>
            <div className="text-xs text-zinc-500">{plan?.LEADER_ID ?? ''}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-bold text-zinc-400">Sub Leader</div>
            <div className="flex h-56 w-44 items-center justify-center rounded bg-zinc-800 text-7xl text-zinc-600">👤</div>
            <div className="text-sm font-bold text-zinc-200">{plan?.SUB_LEADER_NAME ?? '-'}</div>
            <div className="text-xs text-zinc-500">{plan?.SUB_LEADER_ID ?? ''}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
