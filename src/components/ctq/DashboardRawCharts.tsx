/**
 * @file src/components/ctq/DashboardRawCharts.tsx
 * @description RAW insight charts used in the CTQ dashboard.
 */

"use client";

import { useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type { RawInsightsResponse, DashboardSettings } from "@/types/ctq/quality-dashboard";
import { PALETTES } from "@/types/ctq/quality-dashboard";
import ChartExpandOverlay from "./ChartExpandOverlay";

const PROC_COLORS: Record<string, string> = {
  ICT: "#3b82f6",
  HIPOT: "#a78bfa",
  FT: "#4ade80",
  BURNIN: "#fb923c",
  ATE: "#38bdf8",
};
const PROC_KEYS = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

interface Props {
  data: RawInsightsResponse;
  settings: DashboardSettings;
}

function ExpandButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-700 bg-gray-800/80 text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-300"
      title={title}
      aria-label={title}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 4h5v5" />
        <path d="M14 10l6-6" />
        <path d="M9 20H4v-5" />
        <path d="M10 14l-6 6" />
      </svg>
    </button>
  );
}

function ChartCard({
  title,
  children,
  onExpand,
  cardRef,
}: {
  title: string;
  children: React.ReactNode;
  onExpand?: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={cardRef} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs text-gray-400">{title}</h3>
        {onExpand ? <ExpandButton title={`${title} 크게보기`} onClick={onExpand} /> : null}
      </div>
      {children}
    </div>
  );
}

export default function DashboardRawCharts({ data, settings }: Props) {
  const t = useTranslations("ctq");
  const colors = PALETTES[settings.palette] || PALETTES.blue;
  const h = settings.chartHeight;
  const modalHeight = Math.max(h + 120, 320);
  const tipStyle = { background: "#1e293b", border: "1px solid #334155", fontSize: 12 };
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const charts: { key: string; show: boolean; title: string; render: (chartHeight: number) => React.ReactNode }[] = [
    {
      key: "inspVolume",
      show: settings.showInspVolume,
      title: t("pages.qualityDashboard.inspVolumeTitle"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data.inspectionVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="count" name={t("pages.qualityDashboard.inspCount")}>
              {data.inspectionVolume.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "hourlyInsp",
      show: settings.showHourlyInsp,
      title: t("pages.qualityDashboard.hourlyInspTitle"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data.hourlyInspection}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Area type="monotone" dataKey="count" name={t("pages.qualityDashboard.inspCount")} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "lineProd",
      show: settings.showLineProd,
      title: t("pages.qualityDashboard.lineProdTitle"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data.lineProduction}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="count" name={t("pages.qualityDashboard.pidCount")}>
              {data.lineProduction.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "ngMatrix",
      show: settings.showNgMatrix,
      title: t("pages.qualityDashboard.ngMatrixTitle"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data.ngMatrix}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
            {PROC_KEYS.map((k) => <Bar key={k} dataKey={k} name={k} fill={PROC_COLORS[k]} />)}
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "retestRate",
      show: settings.showRetestRate,
      title: t("pages.qualityDashboard.retestRateTitle"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data.retestRate}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="rate" name={t("pages.qualityDashboard.retestRatePercent")}>
              {data.retestRate.map((d, i) => (
                <Cell key={i} fill={d.rate > 5 ? "#f87171" : d.rate > 1 ? "#facc15" : "#4ade80"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "weeklyTrend",
      show: settings.showWeeklyTrend,
      title: t("pages.qualityDashboard.weeklyTrendTitle"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={data.weeklyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[90, 100]} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
            {PROC_KEYS.map((k) => (
              <Line key={k} type="monotone" dataKey={k} name={k} stroke={PROC_COLORS[k]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ];

  const visible = charts.filter((c) => c.show);
  const expandedChart = visible.find((chart) => chart.key === expandedKey) ?? null;
  const getAnchorRect = (key: string) => {
    const node = cardRefs.current[key];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  };

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((c) => (
        <ChartCard
          key={c.key}
          title={c.title}
          onExpand={() => setExpandedKey(c.key)}
          cardRef={(node) => {
            cardRefs.current[c.key] = node;
          }}
        >
          {c.render(h)}
        </ChartCard>
      ))}
      {expandedChart ? (
        <ChartExpandOverlay
          chartKey={expandedChart.key}
          title={expandedChart.title}
          getAnchorRect={getAnchorRect}
          onClosed={() => setExpandedKey(null)}
        >
          {expandedChart.render(modalHeight)}
        </ChartExpandOverlay>
      ) : null}
    </>
  );
}

