/**
 * @file AmbientCharts.tsx
 * @description 이상점 모니터링 카테고리 진입 시 좌우 순환 차트 애니메이션.
 * 초보자 가이드:
 * 1. left: 분석 차트 (막대/꺾은선/도넛/영역) 순환 스크롤
 * 2. right: 모니터링 화면 (라인상태/테이블/게이지/알림) 순환 스크롤
 * 3. 메뉴 섹션이 이상점 모니터링(ANOMALY, id=5)일 때만 표시
 * 원본: SOLUMCTQ/src/app/components/AmbientCharts.tsx
 */
'use client';

import { useState, useEffect } from 'react';

const ANOMALY_SECTION_INDEX = 5;
const C = ['#3b82f6', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#facc15', '#38bdf8'];

/* ── 좌측 차트 ── */

function BarChart({ seed }: { seed: number }) {
  const bars = Array.from({ length: 7 }, (_, i) => 20 + ((seed * 17 + i * 31) % 60));
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      {bars.map((h, i) => (
        <rect key={i} x={6 + i * 22} y={100 - h} width={16} height={h} rx={2} fill={C[i]} opacity={0.7}>
          <animate attributeName="height" values={`${h};${h * 0.6};${h};${h * 1.2};${h}`} dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="y" values={`${100 - h};${100 - h * 0.6};${100 - h};${100 - h * 1.2};${100 - h}`} dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </svg>
  );
}

function LineChart({ seed }: { seed: number }) {
  const pts = Array.from({ length: 8 }, (_, i) => ({ x: i * 22 + 5, y: 20 + ((seed * 13 + i * 23) % 55) }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x},95 L${pts[0].x},95 Z`;
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <path d={area} fill={C[seed % C.length]} opacity={0.15} />
      <path d={path} fill="none" stroke={C[seed % C.length]} strokeWidth={2} opacity={0.8} />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={C[seed % C.length]} opacity={0.9} />)}
    </svg>
  );
}

function DonutChart({ seed }: { seed: number }) {
  const vals = [35 + (seed * 7 % 20), 25 + (seed * 3 % 15), 15 + (seed * 11 % 10)];
  const total = vals.reduce((a, b) => a + b, 0);
  let acc = 0;
  const cx = 80, cy = 50, r = 35, inner = 20;
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      {vals.map((v, i) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += v;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const lg = (v / total) > 0.5 ? 1 : 0;
        return <path key={i} d={`M${cx + r * Math.cos(start)},${cy + r * Math.sin(start)} A${r},${r} 0 ${lg} 1 ${cx + r * Math.cos(end)},${cy + r * Math.sin(end)} L${cx + inner * Math.cos(end)},${cy + inner * Math.sin(end)} A${inner},${inner} 0 ${lg} 0 ${cx + inner * Math.cos(start)},${cy + inner * Math.sin(start)} Z`} fill={C[(seed + i) % C.length]} opacity={0.7} />;
      })}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#e2e8f0" fontSize={11} fontFamily="monospace" opacity={0.6}>{Math.round(vals[0] / total * 100)}%</text>
    </svg>
  );
}

function AreaStacked({ seed }: { seed: number }) {
  const n = 8, xS = 160 / (n - 1);
  const s1 = Array.from({ length: n }, (_, i) => 30 + ((seed * 19 + i * 13) % 30));
  const s2 = Array.from({ length: n }, (_, i) => s1[i] + 10 + ((seed * 7 + i * 11) % 20));
  const mk = (a: number[]) => a.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * xS},${100 - y}`).join(' ');
  const mkA = (a: number[]) => `${mk(a)} L${(n - 1) * xS},100 L0,100 Z`;
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <path d={mkA(s2)} fill={C[(seed + 2) % C.length]} opacity={0.2} />
      <path d={mkA(s1)} fill={C[(seed + 4) % C.length]} opacity={0.25} />
      <path d={mk(s1)} fill="none" stroke={C[(seed + 4) % C.length]} strokeWidth={1.5} opacity={0.6} />
    </svg>
  );
}

/* ── 우측 모니터링 패널 ── */

function LineStatusPanel({ seed }: { seed: number }) {
  const lines = ['L41', 'L43', 'L45', 'L47', 'L51', 'L53'];
  const statuses = lines.map((_, i) => (seed + i) % 5 === 0 ? 'A' : (seed + i) % 7 === 0 ? 'B' : 'OK');
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <text x="4" y="10" fill="#64748b" fontSize="6" fontFamily="monospace">LINE STATUS</text>
      {lines.map((l, i) => {
        const y = 18 + i * 13;
        const st = statuses[i];
        const col = st === 'A' ? '#ef4444' : st === 'B' ? '#f97316' : '#4ade80';
        return (
          <g key={i}>
            <text x="6" y={y + 7} fill="#94a3b8" fontSize="7" fontFamily="monospace">{l}</text>
            <rect x="30" y={y} width={80 + ((seed + i) * 7 % 40)} height={9} rx={1} fill={col} opacity={0.25} />
            <rect x="30" y={y} width={60 + ((seed + i) * 11 % 50)} height={9} rx={1} fill={col} opacity={0.5}>
              <animate attributeName="width" values={`${60 + ((seed + i) * 11 % 50)};${50 + ((seed + i) * 13 % 40)};${60 + ((seed + i) * 11 % 50)}`} dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
            </rect>
            <circle cx="145" cy={y + 4.5} r="3" fill={col} opacity={0.8}>
              {st === 'A' && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />}
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function DataTable({ seed }: { seed: number }) {
  const procs = ['ICT', 'HIPOT', 'FT', 'BURN', 'ATE'];
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <text x="4" y="10" fill="#64748b" fontSize="6" fontFamily="monospace">PROCESS NG COUNT</text>
      <rect x="2" y="15" width="156" height="12" rx="1" fill="#1e3a5f" opacity="0.3" />
      <text x="6" y="24" fill="#60a5fa" fontSize="6.5" fontFamily="monospace">PROC</text>
      <text x="50" y="24" fill="#60a5fa" fontSize="6.5" fontFamily="monospace">TOTAL</text>
      <text x="90" y="24" fill="#60a5fa" fontSize="6.5" fontFamily="monospace">NG</text>
      <text x="120" y="24" fill="#60a5fa" fontSize="6.5" fontFamily="monospace">FPY%</text>
      {procs.map((p, i) => {
        const y = 32 + i * 13;
        const total = 2000 + ((seed + i) * 137 % 3000);
        const ng = ((seed + i) * 7 % 30);
        const fpy = (100 - ng / total * 100).toFixed(1);
        return (
          <g key={i}>
            {i % 2 === 0 && <rect x="2" y={y - 3} width="156" height="12" fill="#0f172a" opacity="0.3" />}
            <text x="6" y={y + 6} fill="#cbd5e1" fontSize="6.5" fontFamily="monospace">{p}</text>
            <text x="50" y={y + 6} fill="#94a3b8" fontSize="6.5" fontFamily="monospace">{total}</text>
            <text x="90" y={y + 6} fill={ng > 15 ? '#f87171' : '#4ade80'} fontSize="6.5" fontFamily="monospace">{ng}</text>
            <text x="120" y={y + 6} fill="#94a3b8" fontSize="6.5" fontFamily="monospace">{fpy}</text>
          </g>
        );
      })}
    </svg>
  );
}

function GaugePanel({ seed }: { seed: number }) {
  const fpy = 90 + (seed * 3 % 10);
  const angle = (fpy / 100) * 180;
  const rad = (a: number) => (a - 180) * Math.PI / 180;
  const cx = 80, cy = 60, r = 40;
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <text x="80" y="12" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">DAILY FPY</text>
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke="#1e3a5f" strokeWidth="8" />
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r * Math.cos(rad(angle))},${cy + r * Math.sin(rad(angle))}`} fill="none" stroke={fpy >= 95 ? '#4ade80' : fpy >= 90 ? '#facc15' : '#f87171'} strokeWidth="8" strokeLinecap="round" />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="#e2e8f0" fontSize="16" fontFamily="monospace" fontWeight="bold">{fpy}%</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">TARGET: 95%</text>
    </svg>
  );
}

function AlertPanel({ seed }: { seed: number }) {
  const alerts = [
    { line: 'L47', proc: 'HIPOT', grade: 'A', time: '14:32' },
    { line: 'L53', proc: 'FT', grade: 'B', time: '13:15' },
    { line: 'L61', proc: 'ATE', grade: 'C', time: '11:48' },
    { line: 'L45', proc: 'ICT', grade: 'B', time: '10:22' },
  ];
  const shifted = alerts.map((_, i) => alerts[(i + seed) % alerts.length]);
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <text x="4" y="10" fill="#64748b" fontSize="6" fontFamily="monospace">RECENT ALERTS</text>
      {shifted.map((a, i) => {
        const y = 18 + i * 20;
        const col = a.grade === 'A' ? '#ef4444' : a.grade === 'B' ? '#f97316' : '#a855f7';
        return (
          <g key={i}>
            <rect x="2" y={y} width="156" height="16" rx="2" fill={col} opacity={0.08} stroke={col} strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="10" cy={y + 8} r="2.5" fill={col} opacity={0.8}>
              {a.grade === 'A' && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />}
            </circle>
            <text x="18" y={y + 10} fill={col} fontSize="7" fontFamily="monospace" fontWeight="bold">{a.grade}</text>
            <text x="30" y={y + 10} fill="#cbd5e1" fontSize="6.5" fontFamily="monospace">{a.line} {a.proc}</text>
            <text x="140" y={y + 10} fill="#475569" fontSize="6" fontFamily="monospace" textAnchor="end">{a.time}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── 메인 ── */

const LEFT_TYPES = [BarChart, LineChart, DonutChart, AreaStacked];
const RIGHT_TYPES = [LineStatusPanel, DataTable, GaugePanel, AlertPanel];

function ScrollColumn({ side }: { side: 'left' | 'right' }) {
  const types = side === 'left' ? LEFT_TYPES : RIGHT_TYPES;
  const dur = side === 'left' ? 32 : 36;
  const seedBase = side === 'right' ? 50 : 0;
  const items = Array.from({ length: 8 }, (_, i) => {
    const Chart = types[i % types.length];
    return { Chart, seed: i * 3 + seedBase, id: i };
  });

  return (
    <div
      className={`pointer-events-none absolute bottom-[10%] top-[10%] w-[220px] overflow-hidden ${side === 'left' ? 'left-[10%]' : 'right-[10%]'}`}
      style={{
        zIndex: 1, opacity: 0.6,
        mask: `linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), ${
          side === 'left' ? 'linear-gradient(to right, black 30%, transparent 100%)' : 'linear-gradient(to left, black 30%, transparent 100%)'
        }`,
        WebkitMaskComposite: 'destination-in',
        maskComposite: 'intersect',
      }}
    >
      <div className="flex flex-col gap-4 p-4" style={{ animation: `scrollUp ${dur}s linear infinite` }}>
        {[...items, ...items].map(({ Chart, seed, id }, idx) => (
          <div key={`${id}-${idx}`} className="shrink-0 rounded-lg border border-gray-700/30 bg-gray-900/30 p-3">
            <div className="h-[55px]">
              <Chart seed={seed + Math.floor(idx / 8) * 20} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AmbientCharts() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index;
      setVisible(idx === ANOMALY_SECTION_INDEX);
    };
    window.addEventListener('menu-section-changed', handler);
    return () => window.removeEventListener('menu-section-changed', handler);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`@keyframes scrollUp { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }`}</style>
      <ScrollColumn side="left" />
      <ScrollColumn side="right" />
    </>
  );
}
