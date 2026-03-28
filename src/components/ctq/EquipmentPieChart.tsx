/**
 * @file src/components/ctq/EquipmentPieChart.tsx
 * @description 설비 공정별 1주일 정지시간 파이 차트 - 공정별 비율 비교
 *
 * 초보자 가이드:
 * 1. 7일간 공정별 총 정지시간을 파이 차트로 표시
 * 2. EquipmentWeeklyChart와 같은 API 데이터 사용
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  type PieLabelRenderProps,
} from "recharts";
import { useTranslations } from "next-intl";
import type { EquipmentWeeklyPoint, EquipmentWeeklyResponse } from "@/types/ctq/equipment";

const PROCESS_COLORS: Record<string, string> = {
  ICT: "#60a5fa",
  HIPOT: "#f472b6",
  FT: "#4ade80",
  BURNIN: "#facc15",
  ATE: "#a78bfa",
};

const PROCESS_LABELS: Record<string, string> = {
  ICT: "ICT",
  HIPOT: "Hi-Pot",
  FT: "FT",
  BURNIN: "Burn-In",
  ATE: "ATE",
};

const PROCESS_KEYS = ["ICT", "HIPOT", "FT", "BURNIN", "ATE"] as const;

interface Props {
  selectedLines: string;
}

export default function EquipmentPieChart({ selectedLines }: Props) {
  const t = useTranslations("ctq");
  const [data, setData] = useState<EquipmentWeeklyPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const linesParam = selectedLines && selectedLines !== "%" ? `?lines=${selectedLines}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ctq/equipment-weekly${linesParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EquipmentWeeklyResponse = await res.json();
      setData(json.data);
    } catch {
      /* 조용히 처리 */
    } finally {
      setLoading(false);
    }
  }, [linesParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* 공정별 7일 합산 */
  const pieData = PROCESS_KEYS.map((key) => {
    const total = data.reduce((sum, d) => sum + (d[key] ?? 0), 0);
    return { name: PROCESS_LABELS[key], key, value: total };
  }).filter((d) => d.value > 0);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <span className="w-5 h-5 border-2 border-gray-700 border-t-blue-400 rounded-full animate-spin mr-2" />
        {t("common.dataLoading")}
      </div>
    );
  }

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        {t("pages.equipment.noData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="75%"
          innerRadius="40%"
          strokeWidth={0}
          label={(props: PieLabelRenderProps) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={{ stroke: "#6b7280" }}
          fontSize={12}
        >
          {pieData.map((entry) => (
            <Cell key={entry.key} fill={PROCESS_COLORS[entry.key]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={(value: unknown) => [
            `${value}${t("pages.equipment.minuteUnit")}`,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
