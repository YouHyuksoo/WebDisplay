/**
 * @file src/components/ctq/DashboardRawCharts.tsx
 * @description RAW 검사 테이블 인사이트 차트 — 6종
 *
 * 초보자 가이드:
 * 1. 공정별 검사량, 시간당 검사량, 라인별 생산량
 * 2. 라인x공정 NG 매트릭스 (그룹 막대)
 * 3. 재검사율 (막대), 주간 직행율 추이 (꺾은선)
 */

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, Cell,
} from "recharts";
import { useTranslations } from "next-intl";
import type { RawInsightsResponse, DashboardSettings } from "@/types/ctq/quality-dashboard";
import { PALETTES } from "@/types/ctq/quality-dashboard";

const PROC_COLORS: Record<string, string> = {
  ICT: "#3b82f6", HIPOT: "#a78bfa", FT: "#4ade80", BURNIN: "#fb923c", ATE: "#38bdf8",
};
const PROC_KEYS = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"];

interface Props {
  data: RawInsightsResponse;
  settings: DashboardSettings;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-xs text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardRawCharts({ data, settings }: Props) {
  const t = useTranslations("ctq");
  const colors = PALETTES[settings.palette] || PALETTES.blue;
  const h = settings.chartHeight;
  const tipStyle = { background: "#1e293b", border: "1px solid #334155", fontSize: 12 };

  const charts: { key: string; show: boolean; el: React.ReactNode }[] = [
    { key: "inspVolume", show: settings.showInspVolume, el: (
      <ChartCard title={t("pages.qualityDashboard.inspVolumeTitle")}>
        <ResponsiveContainer width="100%" height={h}>
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
      </ChartCard>
    )},
    { key: "hourlyInsp", show: settings.showHourlyInsp, el: (
      <ChartCard title={t("pages.qualityDashboard.hourlyInspTitle")}>
        <ResponsiveContainer width="100%" height={h}>
          <AreaChart data={data.hourlyInspection}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Area type="monotone" dataKey="count" name={t("pages.qualityDashboard.inspCount")} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    )},
    { key: "lineProd", show: settings.showLineProd, el: (
      <ChartCard title={t("pages.qualityDashboard.lineProdTitle")}>
        <ResponsiveContainer width="100%" height={h}>
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
      </ChartCard>
    )},
    { key: "ngMatrix", show: settings.showNgMatrix, el: (
      <ChartCard title={t("pages.qualityDashboard.ngMatrixTitle")}>
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data.ngMatrix}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
            {PROC_KEYS.map(k => <Bar key={k} dataKey={k} name={k} fill={PROC_COLORS[k]} />)}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    )},
    { key: "retestRate", show: settings.showRetestRate, el: (
      <ChartCard title={t("pages.qualityDashboard.retestRateTitle")}>
        <ResponsiveContainer width="100%" height={h}>
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
      </ChartCard>
    )},
    { key: "weeklyTrend", show: settings.showWeeklyTrend, el: (
      <ChartCard title={t("pages.qualityDashboard.weeklyTrendTitle")}>
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={data.weeklyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[90, 100]} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
            {PROC_KEYS.map(k => (
              <Line key={k} type="monotone" dataKey={k} name={k} stroke={PROC_COLORS[k]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    )},
  ];

  const visible = charts.filter(c => c.show);
  if (visible.length === 0) return null;

  return <>{visible.map(c => <div key={c.key}>{c.el}</div>)}</>;
}
