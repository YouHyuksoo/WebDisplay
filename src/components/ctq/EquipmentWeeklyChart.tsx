/**
 * @file src/components/ctq/EquipmentWeeklyChart.tsx
 * @description 설비 공정별 1주일 정지시간 선 그래프
 *
 * 초보자 가이드:
 * 1. recharts LineChart로 공정별 정지시간 추이 표시
 * 2. X축: 날짜(MM/DD), Y축: 정지시간(분)
 * 3. 5개 공정 각각 다른 색상 라인
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";
import Spinner from "@/components/ui/Spinner";
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

interface Props {
  selectedLines: string;
}

export default function EquipmentWeeklyChart({ selectedLines }: Props) {
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
      /* 차트 로딩 실패는 조용히 처리 */
    } finally {
      setLoading(false);
    }
  }, [linesParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" label={t("common.dataLoading")} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        {t("pages.equipment.noData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 14 }} />
        <YAxis
          stroke="#9ca3af"
          tick={{ fontSize: 14 }}
          label={{ value: "min", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: "14px",
          }}
          labelStyle={{ color: "#e5e7eb", fontWeight: "bold" }}
          formatter={(value: unknown, name: unknown) => [
            `${value}${t("pages.equipment.minuteUnit")}`,
            PROCESS_LABELS[String(name)] ?? String(name),
          ]}
        />
        <Legend
          formatter={(value: string) => PROCESS_LABELS[value] ?? value}
          wrapperStyle={{ fontSize: "14px" }}
        />
        {Object.entries(PROCESS_COLORS).map(([key, color]) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
