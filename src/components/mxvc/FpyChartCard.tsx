/**
 * @file src/components/mxvc/FpyChartCard.tsx
 * @description 개별 테이블 직행율 카드 — 3단계 드릴다운 (요약 → 일별 → 시간별)
 *
 * 초보자 가이드:
 * 1. Level 0 (기본): 큰 퍼센트 숫자 표시
 * 2. Level 1: 카드 클릭 → 일별 차트
 * 3. Level 2: 일별 차트의 날짜 클릭 → 해당 일의 시간대별 차트
 * 4. "← 뒤로" 버튼으로 상위 레벨 복귀
 */
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { TableFpyData, MxvcFpyTableKey, HourlyFpy } from "@/types/mxvc/fpy";
import { TABLE_LABELS } from "@/types/mxvc/fpy";

interface Props {
  tableKey: MxvcFpyTableKey;
  data: TableFpyData;
  height: number;
  palette: string[];
  chartType: "bar" | "area" | "line";
  maximized?: boolean;
  onToggleMaximize?: () => void;
}

type Level = 'summary' | 'daily' | 'hourly';

function getYieldColor(y: number): string {
  if (y < 90) return "#f87171";
  if (y < 95) return "#facc15";
  return "#4ade80";
}

/** breakdown 판정값별 색상 (AOI/SPI) */
function getBreakdownColor(v: string): string {
  const upper = v.toUpperCase();
  if (upper === 'GOOD' || upper === 'PASS' || upper === 'OK') return 'text-green-400';
  if (upper === 'OVERKILL') return 'text-yellow-400';
  if (upper === 'NG' || upper === 'FAIL') return 'text-red-400';
  return 'text-gray-400';
}

function getSummaryColor(y: number): string {
  if (y < 90) return "text-red-400";
  if (y < 95) return "text-yellow-400";
  return "text-green-400";
}

const TOOLTIP_STYLE = {
  background: "#1e293b",
  border: "1px solid #334155",
  fontSize: 12,
};

const GRID_STROKE = "#1f2937";

export default function FpyChartCard({ tableKey, data, height, chartType, maximized, onToggleMaximize }: Props) {
  const t = useTranslations("common");
  const label = TABLE_LABELS[tableKey];
  const { summary, hourly } = data;

  /* 드릴다운 레벨 관리 */
  const [level, setLevel] = useState<Level>('summary');
  const [drillDate, setDrillDate] = useState<string>('');
  const [hourlyData, setHourlyData] = useState<HourlyFpy[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  /* 날짜 클릭 → 시간별 조회 */
  const handleDayClick = useCallback(async (dateStr: string) => {
    setDrillLoading(true);
    setDrillDate(dateStr);
    try {
      const res = await fetch(`/api/mxvc/fpy?drillDate=${dateStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const h = json.tables?.[tableKey]?.hourly ?? [];
      setHourlyData(h);
      setLevel('hourly');
    } finally {
      setDrillLoading(false);
    }
  }, [tableKey]);

  /* X축 props — 일별 레벨에서는 날짜 라벨을 클릭 가능한 버튼으로 표시 */
  const xAxisLabelFormatter = level === 'hourly'
    ? (v: string) => `${v}시`
    : (v: string) => v.slice(5); // MM-DD

  const dailyClickableTick = (props: Record<string, unknown>) => {
    const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
    return (
      <text
        x={x} y={y + 12}
        textAnchor="middle"
        fill="#60a5fa"
        fontSize={10}
        style={{ cursor: 'pointer', textDecoration: 'underline' }}
        onClick={() => handleDayClick(payload.value)}
      >
        {payload.value.slice(5)}
      </text>
    );
  };

  const xAxisProps = {
    dataKey: "hour" as const,
    tick: level === 'daily'
      ? dailyClickableTick
      : { fill: "#94a3b8", fontSize: 10 },
    tickFormatter: level === 'daily' ? undefined : xAxisLabelFormatter,
    interval: 'preserveStartEnd' as const,
  };
  const yAxisProps = {
    domain: [0, 100] as [number, number],
    tick: { fill: "#64748b", fontSize: 10 },
    tickFormatter: (v: number) => `${v}%`,
  };

  /* 현재 차트 데이터 */
  const chartData = level === 'hourly' ? hourlyData : hourly;

  /* 차트 클릭 핸들러 (daily 레벨에서만 동작) */
  const handleChartClick = (state: unknown) => {
    if (level !== 'daily') return;
    const ev = state as { activePayload?: { payload: HourlyFpy }[] } | null;
    if (!ev?.activePayload?.[0]) return;
    const pt = ev.activePayload[0].payload;
    if (pt?.hour) handleDayClick(pt.hour);
  };

  /* Level 0: 요약 카드 */
  if (level === 'summary') {
    const isEmpty = summary.total === 0;
    const color = isEmpty ? 'text-gray-400 dark:text-gray-500' : getSummaryColor(summary.yield);
    return (
      <div
        className={`relative bg-white dark:bg-gray-900 border rounded-xl p-6
                   flex flex-col items-center justify-center transition-colors ${
          isEmpty
            ? 'border-gray-200 dark:border-gray-800 opacity-60 cursor-default'
            : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500'
        }`}
        style={{ minHeight: height }}
        onClick={() => { if (!isEmpty) setLevel('daily'); }}
        title={isEmpty ? '데이터 없음' : '클릭하여 일별 상세'}
      >
        {onToggleMaximize && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMaximize(); }}
            className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title={maximized ? '원래 크기' : '최대화'}
          >
            {maximized ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-2">{label}</div>
        {isEmpty ? (
          <>
            <div className={`font-extrabold font-mono ${color} ${maximized ? 'text-6xl' : 'text-3xl'}`}>
              —
            </div>
            <div className="text-gray-400 dark:text-gray-500 mt-2 text-xs">데이터 없음</div>
          </>
        ) : (
          <>
            <div className={`font-extrabold font-mono ${color} ${maximized ? 'text-8xl' : 'text-5xl'}`}>
              {summary.yield.toFixed(1)}%
            </div>
            <div className={`text-gray-400 dark:text-gray-500 mt-2 font-mono ${maximized ? 'text-lg' : 'text-xs'}`}>
              {summary.pass.toLocaleString()} / {summary.total.toLocaleString()}
            </div>

            {/* breakdown (AOI/SPI 등): 판정값별 비율 */}
            {summary.breakdown && summary.breakdown.length > 0 && (
              <div className={`mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 ${maximized ? 'text-base' : 'text-[10px]'}`}>
                {summary.breakdown.map((b) => (
                  <div key={b.value} className="flex items-center gap-1">
                    <span className={`font-semibold ${getBreakdownColor(b.value)}`}>{b.value}</span>
                    <span className={`font-mono ${getBreakdownColor(b.value)}`}>{b.ratio.toFixed(1)}%</span>
                    <span className="text-gray-500 dark:text-gray-600 font-mono">({b.count})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">클릭하여 일별 상세 →</div>
          </>
        )}
      </div>
    );
  }

  /* Level 1/2: 차트 뷰 */
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => level === 'hourly' ? setLevel('daily') : setLevel('summary')}
            className="px-2 py-0.5 text-[10px] rounded border border-gray-300 dark:border-gray-600
                       text-blue-500 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
          >
            ← {level === 'hourly' ? '일별' : '요약'}
          </button>
          <h3 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">
            {label}
            {level === 'hourly' && drillDate && (
              <span className="text-blue-500 ml-1.5">({drillDate})</span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {summary.total === 0 ? (
            <span className="font-bold font-mono text-gray-400">— 데이터 없음</span>
          ) : (
            <>
              <span className={`font-bold font-mono ${getSummaryColor(summary.yield)}`}>
                {summary.yield.toFixed(1)}%
              </span>
              <span className="text-gray-400 dark:text-gray-500">
                ({summary.pass}/{summary.total})
              </span>
            </>
          )}
          {level === 'daily' && hourly.length > 0 && (
            <span className="text-[10px] text-blue-500">X축 날짜 클릭 → 시간별</span>
          )}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title={maximized ? '원래 크기' : '최대화'}
            >
              {maximized ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {drillLoading ? (
        <div className="flex items-center justify-center text-gray-400 text-xs" style={{ height }}>
          로딩중...
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs" style={{ height }}>
          {t("noData")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chartType === "area" ? (
            <AreaChart data={chartData} onClick={handleChartClick}
              style={level === 'daily' ? { cursor: 'pointer' } : undefined}>
              <defs>
                <linearGradient id={`grad-${tableKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Area
                type="monotone"
                dataKey="yield"
                name="직행율"
                stroke="#4ade80"
                strokeWidth={2}
                fill={`url(#grad-${tableKey})`}
                dot={({ cx, cy, payload }: Record<string, unknown>) => {
                  if (cx == null || cy == null) return <></>;
                  const y = (payload as { yield: number }).yield;
                  return <circle key={String(cx)} cx={Number(cx)} cy={Number(cy)} r={4} fill={getYieldColor(y)} stroke="#fff" strokeWidth={1.5} />;
                }}
              />
            </AreaChart>
          ) : chartType === "line" ? (
            <LineChart data={chartData} onClick={handleChartClick}
              style={level === 'daily' ? { cursor: 'pointer' } : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line
                type="monotone"
                dataKey="yield"
                name="직행율"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={({ cx, cy, payload }: Record<string, unknown>) => {
                  if (cx == null || cy == null) return <></>;
                  const y = (payload as { yield: number }).yield;
                  return <circle key={String(cx)} cx={Number(cx)} cy={Number(cy)} r={4} fill={getYieldColor(y)} stroke="#fff" strokeWidth={1.5} />;
                }}
                activeDot={{ r: 6, fill: "#a78bfa" }}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData} onClick={handleChartClick}
              style={level === 'daily' ? { cursor: 'pointer' } : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Bar dataKey="yield" name="직행율">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getYieldColor(entry.yield)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
