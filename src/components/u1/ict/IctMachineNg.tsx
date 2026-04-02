/**
 * @file src/components/u1/ict/IctMachineNg.tsx
 * @description ICT 머신별 NG 분포 — 수평 바 + 값 레이블 + NG율 + 요약
 *
 * 초보자 가이드:
 * 1. Y축: MACHINE_CODE, X축: NG 건수
 * 2. 바 끝에 NG건수 + NG율(%) 표시
 * 3. 그라데이션 바 + 배경 트랙으로 비율감 표현
 * 4. 상단 요약: 총 NG 건수 + 최다 NG 머신
 */

"use client";

import { useTranslations } from "next-intl";
import type { IctMachineNgItem } from "@/types/u1/ict-analysis";

interface Props {
  machineNg: IctMachineNgItem[];
}

export default function IctMachineNg({ machineNg }: Props) {
  const t = useTranslations("common");
  if (machineNg.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        {t("noData")}
      </div>
    );
  }

  const totalNg = machineNg.reduce((s, m) => s + m.ngCount, 0);
  const maxNg = Math.max(...machineNg.map((m) => m.ngCount));
  const topMachine = machineNg[0];

  return (
    <div className="flex flex-col h-full gap-1">
      {/* 요약 바 */}
      <div className="flex items-center gap-4 px-3 py-1.5 rounded bg-gray-800/60 text-sm">
        <span className="text-gray-500">총 NG</span>
        <span className="text-red-400 font-bold text-base">{totalNg.toLocaleString()}건</span>
        <span className="text-gray-500 ml-auto">TOP</span>
        <span className="text-orange-400 font-semibold">{topMachine.machineCode} ({topMachine.ngCount}건)</span>
      </div>

      {/* 커스텀 수평 바 */}
      <div className="flex-1 flex flex-col justify-center gap-2 px-1 overflow-y-auto">
        {machineNg.map((m) => {
          const pct = maxNg > 0 ? (m.ngCount / maxNg) * 100 : 0;
          const ngRate = m.total > 0 ? ((m.ngCount / m.total) * 100).toFixed(1) : "0.0";
          const barColor = pct > 70 ? "from-red-600 to-red-400" : pct > 40 ? "from-orange-600 to-orange-400" : "from-yellow-600 to-yellow-400";

          return (
            <div key={m.machineCode} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-gray-400 text-right truncate">{m.machineCode}</span>
              <div className="flex-1 relative h-7">
                <div className="absolute inset-0 bg-gray-800/60 rounded" />
                <div
                  className={`absolute inset-y-0 left-0 rounded bg-gradient-to-r ${barColor} transition-all duration-500`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-sm font-bold text-white drop-shadow-sm ml-auto">
                    {m.ngCount}건
                  </span>
                </div>
              </div>
              <span className="w-14 shrink-0 text-sm text-right text-red-400/80 font-medium">{ngRate}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
