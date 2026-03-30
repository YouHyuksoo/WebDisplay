/**
 * @file SpcControlChart.tsx
 * @description SPC 관리도 보기 화면 — X̄-R Chart + Cp/Cpk 공정능력지수
 *
 * 초보자 가이드:
 * 1. 상단 조회영역: 공정 선택 → 측정항목 선택 → 조회
 * 2. 중단: X̄ Chart(평균 관리도) + R Chart(범위 관리도) 그래프
 * 3. 하단: Cp/Cpk 게이지 + 통계 요약 테이블
 * 4. Mock 데이터 기반, 추후 Oracle 연결 예정
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts';
import DisplayLayout from '@/components/display/DisplayLayout';
import { fetcher } from '@/lib/fetcher';

/* -- 타입 정의 -- */

interface MeasItem { id: string; name: string; unit: string }
interface ProcessInfo { id: string; name: string; items: MeasItem[] }

interface Subgroup {
  id: number;
  samples: number[];
  xbar: number;
  range: number;
}

interface SpcStats {
  xbarBar: number; rBar: number;
  xbarUCL: number; xbarLCL: number; xbarCL: number;
  rUCL: number; rLCL: number; rCL: number;
  cp: number; cpk: number; sigmaEst: number;
  usl: number; lsl: number; target: number;
  sampleSize: number; subgroupCount: number;
  oocPoints: number[];
}

interface SpcData {
  processId: string;
  processName: string;
  item: MeasItem & { usl: number; lsl: number; target: number };
  subgroups: Subgroup[];
  stats: SpcStats;
}

/* -- 스타일 상수 -- */

const inputCls = 'rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100';
const labelCls = 'text-xs font-medium text-zinc-400 mb-0.5';
const btnBase = 'rounded px-4 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap';

/* -- Cpk 등급 판정 -- */

function getCpkGrade(cpk: number): { label: string; color: string; bg: string } {
  if (cpk >= 1.67) return { label: 'A (우수)', color: '#22c55e', bg: 'bg-green-900/30 border-green-700/50' };
  if (cpk >= 1.33) return { label: 'B (양호)', color: '#3b82f6', bg: 'bg-blue-900/30 border-blue-700/50' };
  if (cpk >= 1.0)  return { label: 'C (보통)', color: '#f59e0b', bg: 'bg-yellow-900/30 border-yellow-700/50' };
  return { label: 'D (불량)', color: '#ef4444', bg: 'bg-red-900/30 border-red-700/50' };
}

/* -- OOC 점 강조 Dot -- */

function OocDot(props: { cx?: number; cy?: number; payload?: { id: number }; oocPoints: number[] }) {
  const { cx, cy, payload, oocPoints } = props;
  if (!cx || !cy || !payload) return null;
  if (oocPoints.includes(payload.id)) {
    return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="#8b5cf6" />;
}

/* -- 메인 컴포넌트 -- */

interface Props { screenId: string }

export default function SpcControlChart({ screenId }: Props) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [data, setData] = useState<SpcData | null>(null);
  const [loading, setLoading] = useState(false);

  /* 공정 목록 로드 */
  useEffect(() => {
    fetcher('/api/display/60').then((res: { processes: ProcessInfo[] }) => {
      setProcesses(res.processes);
      if (res.processes.length > 0) {
        setSelectedProcess(res.processes[0].id);
        setSelectedItem(res.processes[0].items[0]?.id ?? '');
      }
    });
  }, []);

  /* 공정 변경 시 첫 번째 항목 자동 선택 */
  useEffect(() => {
    const proc = processes.find((p) => p.id === selectedProcess);
    if (proc && proc.items.length > 0) {
      setSelectedItem(proc.items[0].id);
    }
  }, [selectedProcess, processes]);

  /* SPC 데이터 조회 */
  const handleSearch = useCallback(async () => {
    if (!selectedProcess || !selectedItem) return;
    setLoading(true);
    try {
      const res = await fetcher(
        `/api/display/60?processId=${selectedProcess}&itemId=${selectedItem}`
      ) as SpcData;
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [selectedProcess, selectedItem]);

  /* 초기 자동 조회 */
  useEffect(() => {
    if (selectedProcess && selectedItem) handleSearch();
  }, []);

  const currentProcess = processes.find((p) => p.id === selectedProcess);
  const s = data?.stats;

  return (
    <DisplayLayout screenId={screenId}>
      <div className="flex h-full flex-col gap-2 overflow-auto p-3">

        {/* ═══════ 조회 영역 ═══════ */}
        <section className="rounded-lg border border-indigo-800/50 bg-indigo-950/30 p-3">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className={labelCls}>공정</div>
              <select
                value={selectedProcess}
                onChange={(e) => setSelectedProcess(e.target.value)}
                className={`${inputCls} w-48`}
              >
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className={labelCls}>측정항목</div>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className={`${inputCls} w-52`}
              >
                {currentProcess?.items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50`}
            >
              {loading ? '조회 중...' : '조회'}
            </button>

            {/* 규격 요약 */}
            {data && (
              <div className="ml-auto flex items-center gap-4 text-xs text-zinc-400">
                <span>USL: <b className="text-red-400">{data.item.usl}</b></span>
                <span>Target: <b className="text-green-400">{data.item.target}</b></span>
                <span>LSL: <b className="text-blue-400">{data.item.lsl}</b></span>
                <span className="text-zinc-500">|</span>
                <span>n={s?.sampleSize}, k={s?.subgroupCount}</span>
              </div>
            )}
          </div>
        </section>

        {data && s && (
          <>
            {/* ═══════ Cp/Cpk 게이지 + 통계 요약 ═══════ */}
            <section className="grid grid-cols-[1fr_1fr_2fr] gap-2">
              {/* Cp 카드 */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Cp (공정능력)</div>
                <div className="text-3xl font-black" style={{ color: getCpkGrade(s.cp).color }}>
                  {s.cp.toFixed(3)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{getCpkGrade(s.cp).label}</div>
              </div>

              {/* Cpk 카드 */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Cpk (공정능력지수)</div>
                <div className="text-3xl font-black" style={{ color: getCpkGrade(s.cpk).color }}>
                  {s.cpk.toFixed(3)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{getCpkGrade(s.cpk).label}</div>
              </div>

              {/* 통계 요약 테이블 */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-xs">
                  <StatRow label="X̄ (평균)" value={s.xbarBar} />
                  <StatRow label="R̄ (평균 범위)" value={s.rBar} />
                  <StatRow label="σ̂ (추정 표준편차)" value={s.sigmaEst} />
                  <StatRow label="이탈 점 수" value={s.oocPoints.length} unit="개" color={s.oocPoints.length > 0 ? '#ef4444' : '#22c55e'} />
                  <StatRow label="X̄ UCL" value={s.xbarUCL} color="#ef4444" />
                  <StatRow label="X̄ LCL" value={s.xbarLCL} color="#3b82f6" />
                  <StatRow label="R UCL" value={s.rUCL} color="#ef4444" />
                  <StatRow label="R LCL" value={s.rLCL} color="#3b82f6" />
                </div>
              </div>
            </section>

            {/* ═══════ X̄ Chart ═══════ */}
            <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex-1 min-h-[200px]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-300">X̄ Chart</span>
                <span className="text-xs text-zinc-500">— 평균 관리도</span>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data.subgroups} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                    labelStyle={{ color: '#999' }}
                    formatter={(value: number) => [value.toFixed(4), 'X̄']}
                  />
                  <ReferenceLine y={s.xbarUCL} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'UCL', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={s.xbarCL} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'CL', fill: '#22c55e', fontSize: 10 }} />
                  <ReferenceLine y={s.xbarLCL} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'LCL', fill: '#3b82f6', fontSize: 10 }} />
                  <Line
                    type="monotone" dataKey="xbar" stroke="#8b5cf6" strokeWidth={2}
                    dot={(props) => <OocDot {...props} oocPoints={s.oocPoints} />}
                    activeDot={{ r: 5, fill: '#a78bfa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* ═══════ R Chart ═══════ */}
            <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex-1 min-h-[180px]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-300">R Chart</span>
                <span className="text-xs text-zinc-500">— 범위 관리도</span>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data.subgroups} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                    labelStyle={{ color: '#999' }}
                    formatter={(value: number) => [value.toFixed(4), 'R']}
                  />
                  <ReferenceLine y={s.rUCL} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'UCL', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={s.rCL} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'CL', fill: '#22c55e', fontSize: 10 }} />
                  <ReferenceLine y={s.rLCL} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'LCL', fill: '#3b82f6', fontSize: 10 }} />
                  <Line
                    type="monotone" dataKey="range" stroke="#f59e0b" strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                    activeDot={{ r: 5, fill: '#fbbf24' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </>
        )}

        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            공정과 측정항목을 선택한 후 조회하세요
          </div>
        )}
      </div>
    </DisplayLayout>
  );
}

/* -- 통계 행 컴포넌트 -- */

function StatRow({ label, value, unit, color }: { label: string; value: number; unit?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-semibold" style={{ color: color ?? '#e2e8f0' }}>
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(4)) : value}
        {unit && <span className="text-zinc-600 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}
