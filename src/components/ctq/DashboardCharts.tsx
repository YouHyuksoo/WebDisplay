/**
 * @file src/components/ctq/DashboardCharts.tsx
 * @description Dashboard chart grid for CTQ quality analysis.
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type {
  ChartItem,
  DashboardSettings,
  LeadTimeItem,
  QualityDashboardResponse,
  RawInsightsResponse,
} from "@/types/ctq/quality-dashboard";
import { PALETTES } from "@/types/ctq/quality-dashboard";
import ChartExpandOverlay from "./ChartExpandOverlay";
import DashboardRawCharts from "./DashboardRawCharts";

interface Props {
  data: QualityDashboardResponse;
  settings: DashboardSettings;
  rawData?: RawInsightsResponse | null;
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
  fullWidth,
  onExpand,
  cardRef,
}: {
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  onExpand?: () => void;
  cardRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={cardRef} className={`bg-gray-900 border border-gray-700 rounded-xl p-4 ${fullWidth ? "col-span-full" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs text-gray-400">{title}</h3>
        {onExpand ? <ExpandButton title={`${title} 크게보기`} onClick={onExpand} /> : null}
      </div>
      {children}
    </div>
  );
}

function VerticalBar({ data, h, colors, barName }: { data: ChartItem[]; h: number; colors: string[]; barName: string }) {
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
        <Bar dataKey="count" name={barName}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HorizontalBar({ data, h, colors, barName }: { data: ChartItem[]; h: number; colors: string[]; barName: string }) {
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#94a3b8", fontSize: 9 }} />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
        <Bar dataKey="count" name={barName}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LeadTimeBar({ data, h }: { data: LeadTimeItem[]; h: number }) {
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} unit="h" />
        <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#94a3b8", fontSize: 9 }} />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
        <Bar dataKey="avgHours" name="Avg (h)" fill="#3b82f6" />
        <Bar dataKey="maxHours" name="Max (h)" fill="#f87171" opacity={0.6} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardCharts({ data, settings, rawData }: Props) {
  const t = useTranslations("ctq");
  const colors = PALETTES[settings.palette] || PALETTES.blue;
  const h = settings.chartHeight;
  const modalHeight = Math.max(h + 120, 320);
  const gridCols = settings.layout === "3x2" ? "grid-cols-3" : "grid-cols-2";
  const countLabel = t("pages.qualityDashboard.count");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const charts: { key: string; show: boolean; title: string; render: (chartHeight: number) => React.ReactNode }[] = [
    {
      key: "process",
      show: settings.showProcess,
      title: t("pages.qualityDashboard.processByDefect"),
      render: (chartHeight) => <VerticalBar data={data.process} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "badCode",
      show: settings.showBadCode,
      title: t("pages.qualityDashboard.badCodeTop10"),
      render: (chartHeight) => <HorizontalBar data={data.badCode} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "line",
      show: settings.showLine,
      title: t("pages.qualityDashboard.lineByDefect"),
      render: (chartHeight) => <VerticalBar data={data.line} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "repair",
      show: settings.showRepair,
      title: t("pages.qualityDashboard.repairCompletion"),
      render: (chartHeight) => {
        const pieData = [
          { name: t("pages.qualityDashboard.repairDone"), value: data.repair.repaired },
          { name: t("pages.qualityDashboard.repairPending"), value: data.repair.pending },
        ];
        const rate = data.repair.total > 0 ? Math.round((data.repair.repaired / data.repair.total) * 100) : 0;

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chartHeight * 0.22}
                outerRadius={chartHeight * 0.38}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                <Cell fill="#4ade80" />
                <Cell fill="#f87171" />
              </Pie>
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#e2e8f0" fontSize={20} fontWeight="bold">
                {rate}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        );
      },
    },
    {
      key: "model",
      show: settings.showModel,
      title: t("pages.qualityDashboard.modelByDefect"),
      render: (chartHeight) => <VerticalBar data={data.model} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "hourly",
      show: settings.showHourly,
      title: t("pages.qualityDashboard.hourlyDist"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data.hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
            <Area type="monotone" dataKey="count" name={countLabel} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "defectItem",
      show: settings.showDefectItem,
      title: t("pages.qualityDashboard.defectItemTop10"),
      render: (chartHeight) => <HorizontalBar data={data.defectItem} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "location",
      show: settings.showLocation,
      title: t("pages.qualityDashboard.locationTop10"),
      render: (chartHeight) => <HorizontalBar data={data.location} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "repairWs",
      show: settings.showRepairWorkstage,
      title: t("pages.qualityDashboard.repairByProcess"),
      render: (chartHeight) => <VerticalBar data={data.repairWorkstage} h={chartHeight} colors={colors} barName={countLabel} />,
    },
    {
      key: "fpy",
      show: settings.showFpy,
      title: t("pages.qualityDashboard.fpyByProcess"),
      render: (chartHeight) => (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data.fpy}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Bar dataKey="yesterday" name={t("pages.qualityDashboard.yesterday")} fill="#64748b" />
            <Bar dataKey="today" name={t("pages.qualityDashboard.today")}>
              {data.fpy.map((d, i) => (
                <Cell key={i} fill={d.today < 90 ? "#f87171" : d.today < 95 ? "#facc15" : "#4ade80"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: "receipt",
      show: settings.showReceipt,
      title: t("pages.qualityDashboard.receiptByType"),
      render: (chartHeight) => {
        const pieData = data.receipt.map((r) => ({ name: r.name, value: r.count }));
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chartHeight * 0.18}
                outerRadius={chartHeight * 0.38}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        );
      },
    },
    {
      key: "repairLeadTimeLine",
      show: settings.showRepairLeadTimeLine,
      title: t("pages.qualityDashboard.repairLeadTimeLine"),
      render: (chartHeight) => <LeadTimeBar data={data.repairLeadTimeLine ?? []} h={chartHeight} />,
    },
    {
      key: "repairLeadTimeModel",
      show: settings.showRepairLeadTimeModel,
      title: t("pages.qualityDashboard.repairLeadTimeModel"),
      render: (chartHeight) => <LeadTimeBar data={data.repairLeadTimeModel ?? []} h={chartHeight} />,
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

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {settings.showSummary && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="rounded-lg bg-gray-800/60 p-3 text-center">
            <div className="font-mono text-2xl font-extrabold text-red-400">{data.summary.totalDefects}</div>
            <div className="mt-1 text-[10px] text-gray-500">{t("pages.qualityDashboard.totalDefects")}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 p-3 text-center">
            <div className="font-mono text-2xl font-extrabold text-green-400">{data.summary.repairRate}%</div>
            <div className="mt-1 text-[10px] text-gray-500">{t("pages.qualityDashboard.repairRate")}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 p-3 text-center">
            <div className="font-mono text-lg font-extrabold text-blue-400">{data.summary.topProcess}</div>
            <div className="mt-1 text-[10px] text-gray-500">{t("pages.qualityDashboard.topProcess")}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 p-3 text-center">
            <div className="font-mono text-lg font-extrabold text-yellow-400">{data.summary.topBadCode}</div>
            <div className="mt-1 text-[10px] text-gray-500">{t("pages.qualityDashboard.topBadCode")}</div>
          </div>
        </div>
      )}
      <div className={`grid ${gridCols} gap-3`}>
        {visible.map((c, i) => {
          const isLast = settings.layout === "2x2+1" && i === visible.length - 1 && visible.length % 2 === 1;
          return (
            <ChartCard
              key={c.key}
              title={c.title}
              fullWidth={isLast}
              onExpand={() => setExpandedKey(c.key)}
              cardRef={(node) => {
                cardRefs.current[c.key] = node;
              }}
            >
              {c.render(h)}
            </ChartCard>
          );
        })}
        {rawData && <DashboardRawCharts data={rawData} settings={settings} />}
      </div>
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
    </div>
  );
}

