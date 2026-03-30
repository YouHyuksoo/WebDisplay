/**
 * @file SpcControlChart.tsx
 * @description SPC 관리도 보기 화면 — X-bar-R Chart + Cp/Cpk 공정능력지수
 *
 * 초보자 가이드:
 * 1. 상단 조회영역: 공정 선택 → 측정항목 선택 → 조회
 * 2. 중단: X-bar Chart(평균 관리도) + R Chart(범위 관리도) 그래프
 * 3. 하단: Cp/Cpk 게이지 + 통계 요약 테이블
 * 4. Mock 데이터 기반, 추후 Oracle 연결 예정
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
  ComposedChart, Bar, Cell,
} from 'recharts';
import { useMemo } from 'react';
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

/* -- 히스토그램 + 정규분포 곡선 데이터 생성 -- */

function buildHistogram(subgroups: Subgroup[], stats: SpcStats, binCount = 15) {
  const allSamples = subgroups.flatMap((s) => s.samples);
  const min = Math.min(...allSamples, stats.lsl);
  const max = Math.max(...allSamples, stats.usl);
  const margin = (max - min) * 0.1;
  const rangeMin = min - margin;
  const rangeMax = max + margin;
  const binWidth = (rangeMax - rangeMin) / binCount;

  // 전체 샘플 평균/표준편차 (정규분포 곡선용)
  const mean = allSamples.reduce((s, v) => s + v, 0) / allSamples.length;
  const variance = allSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / allSamples.length;
  const std = Math.sqrt(variance);
  const n = allSamples.length;

  // 정규분포 PDF
  const normalPdf = (x: number) =>
    (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);

  const bins = Array.from({ length: binCount }, (_, i) => {
    const lo = rangeMin + i * binWidth;
    const hi = lo + binWidth;
    const mid = (lo + hi) / 2;
    const count = allSamples.filter((v) => v >= lo && v < hi).length;
    const inSpec = mid >= stats.lsl && mid <= stats.usl;
    // 정규분포 곡선 값 (빈도 스케일에 맞춤)
    const normal = Number((normalPdf(mid) * n * binWidth).toFixed(2));
    return { lo, hi, mid: Number(mid.toFixed(2)), count, inSpec, normal };
  });

  return bins;
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
                  <StatRow label="X-bar (평균)" value={s.xbarBar} />
                  <StatRow label="R̄ (평균 범위)" value={s.rBar} />
                  <StatRow label="σ̂ (추정 표준편차)" value={s.sigmaEst} />
                  <StatRow label="이탈 점 수" value={s.oocPoints.length} unit="개" color={s.oocPoints.length > 0 ? '#ef4444' : '#22c55e'} />
                  <StatRow label="X-bar UCL" value={s.xbarUCL} color="#ef4444" />
                  <StatRow label="X-bar LCL" value={s.xbarLCL} color="#3b82f6" />
                  <StatRow label="R UCL" value={s.rUCL} color="#ef4444" />
                  <StatRow label="R LCL" value={s.rLCL} color="#3b82f6" />
                </div>
              </div>
            </section>

            {/* ═══════ X-bar Chart + Histogram ═══════ */}
            <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex-1 min-h-[220px]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-300">X-bar Chart</span>
                <span className="text-xs text-zinc-500">— 평균 관리도</span>
                <span className="text-xs text-zinc-600 ml-auto">Histogram →</span>
              </div>
              <div className="flex h-[85%] gap-1">
                {/* X-bar 관리도 */}
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.subgroups} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#999' }} />
                      <YAxis
                        domain={[
                          (min: number) => Math.min(min, s.lsl) - (s.usl - s.lsl) * 0.05,
                          (max: number) => Math.max(max, s.usl) + (s.usl - s.lsl) * 0.05,
                        ]}
                        tick={{ fontSize: 11, fill: '#999' }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                        labelStyle={{ color: '#999' }}
                        formatter={(value) => [Number(value).toFixed(4), 'X-bar']}
                      />
                      <ReferenceLine y={s.usl} stroke="#ff6b6b" strokeWidth={2} label={{ value: 'USL', fill: '#ff6b6b', fontSize: 10, position: 'right' }} />
                      <ReferenceLine y={s.lsl} stroke="#4dabf7" strokeWidth={2} label={{ value: 'LSL', fill: '#4dabf7', fontSize: 10, position: 'right' }} />
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
                </div>
                {/* 히스토그램 (세로 배치) */}
                <div className="w-[350px] shrink-0">
                  <Histogram subgroups={data.subgroups} stats={s} />
                </div>
              </div>
            </section>

            {/* ═══════ R Chart + 공정능력 분석도 ═══════ */}
            <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex-1 min-h-[220px]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-300">R Chart</span>
                <span className="text-xs text-zinc-500">— 범위 관리도</span>
                <span className="text-xs text-zinc-600 ml-auto">Process Capability →</span>
              </div>
              <div className="flex h-[85%] gap-1">
                {/* R 관리도 */}
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.subgroups} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#999' }} />
                      <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#999' }} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                        labelStyle={{ color: '#999' }}
                        formatter={(value) => [Number(value).toFixed(4), 'R']}
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
                </div>
                {/* 공정능력 분석도 */}
                <div className="w-[350px] shrink-0">
                  <CapabilityChart subgroups={data.subgroups} stats={s} />
                </div>
              </div>
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

/* -- 히스토그램 + 정규분포 곡선 컴포넌트 -- */

function Histogram({ subgroups, stats }: { subgroups: Subgroup[]; stats: SpcStats }) {
  const bins = useMemo(() => buildHistogram(subgroups, stats), [subgroups, stats]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={bins}
        margin={{ top: 10, right: 10, bottom: 25, left: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
        <XAxis
          dataKey="mid"
          tick={{ fontSize: 9, fill: '#999' }}
          interval={1}
          angle={-45}
          textAnchor="end"
          height={40}
        />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} width={30} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
          formatter={(value, name) => [
            value, name === 'count' ? '빈도' : '정규분포',
          ]}
          labelFormatter={(label) => `구간: ${label}`}
        />
        {/* USL / LSL 수직선 */}
        <ReferenceLine x={stats.usl} stroke="#ff6b6b" strokeWidth={2} label={{ value: 'USL', fill: '#ff6b6b', fontSize: 10, position: 'top' }} />
        <ReferenceLine x={stats.lsl} stroke="#4dabf7" strokeWidth={2} label={{ value: 'LSL', fill: '#4dabf7', fontSize: 10, position: 'top' }} />
        {/* 히스토그램 막대 */}
        <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={20}>
          {bins.map((bin, i) => (
            <Cell key={i} fill={bin.inSpec ? '#fbbf24' : '#ef4444'} fillOpacity={0.85} stroke={bin.inSpec ? '#f59e0b' : '#dc2626'} strokeWidth={1} />
          ))}
        </Bar>
        {/* 정규분포 곡선 */}
        <Line
          type="monotone"
          dataKey="normal"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* -- 공정능력 분석도 (Process Capability Chart) -- */

function CapabilityChart({ subgroups, stats }: { subgroups: Subgroup[]; stats: SpcStats }) {
  const chartData = useMemo(() => {
    const allSamples = subgroups.flatMap((s) => s.samples);
    const mean = allSamples.reduce((s, v) => s + v, 0) / allSamples.length;
    const variance = allSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / allSamples.length;
    const std = Math.sqrt(variance);

    // 6σ 범위로 X축 생성
    const xMin = Math.min(stats.lsl, mean - 4 * std);
    const xMax = Math.max(stats.usl, mean + 4 * std);
    const step = (xMax - xMin) / 60;

    const normalPdf = (x: number) =>
      (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);

    const maxPdf = normalPdf(mean);

    // 정규분포 곡선 데이터 + 규격 내/외 영역
    const points = [];
    for (let x = xMin; x <= xMax; x += step) {
      const pdf = normalPdf(x);
      const inSpec = x >= stats.lsl && x <= stats.usl;
      points.push({
        x: Number(x.toFixed(3)),
        pdf: Number(pdf.toFixed(6)),
        fill: inSpec ? Number(pdf.toFixed(6)) : 0,
        outOfSpec: !inSpec ? Number(pdf.toFixed(6)) : 0,
      });
    }

    return { points, mean, std, maxPdf };
  }, [subgroups, stats]);

  const { points } = chartData;
  const grade = getCpkGrade(stats.cpk);

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart data={points} margin={{ top: 10, right: 10, bottom: 25, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 9, fill: '#999' }}
            tickCount={8}
          />
          <YAxis tick={false} width={5} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
            formatter={(value) => [Number(value).toFixed(4), '']}
            labelFormatter={(label) => `값: ${label}`}
          />
          {/* 규격 내 영역 (초록 음영) */}
          <Bar dataKey="fill" fill="#22c55e" fillOpacity={0.25} barSize={8} isAnimationActive={false} />
          {/* 규격 외 영역 (빨간 음영) */}
          <Bar dataKey="outOfSpec" fill="#ef4444" fillOpacity={0.35} barSize={8} isAnimationActive={false} />
          {/* USL / LSL / Target 수직선 */}
          <ReferenceLine x={stats.usl} stroke="#ff6b6b" strokeWidth={2} label={{ value: 'USL', fill: '#ff6b6b', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={stats.lsl} stroke="#4dabf7" strokeWidth={2} label={{ value: 'LSL', fill: '#4dabf7', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={stats.target} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: 'T', fill: '#22c55e', fontSize: 10, position: 'top' }} />
          {/* 정규분포 곡선 */}
          <Line type="monotone" dataKey="pdf" stroke="#a78bfa" strokeWidth={2.5} dot={false} activeDot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Cp/Cpk 요약 바 */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500">Cp</span>
          <span className="font-mono font-bold" style={{ color: getCpkGrade(stats.cp).color }}>{stats.cp.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500">Cpk</span>
          <span className="font-mono font-bold" style={{ color: grade.color }}>{stats.cpk.toFixed(3)}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${grade.bg}`} style={{ color: grade.color }}>
          {grade.label}
        </span>
      </div>
    </div>
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
