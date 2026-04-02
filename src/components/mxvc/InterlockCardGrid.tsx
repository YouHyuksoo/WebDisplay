/**
 * @file src/components/mxvc/InterlockCardGrid.tsx
 * @description 인터락 공정별 카드 그리드 — WorkstageCard[] 렌더링
 * 초보자 가이드:
 * 1. WorkstageCard 배열을 받아서 카드 그리드로 표시
 * 2. 반응형: 1~4열 자동 조절 (한 행에 4개 배치)
 * 3. 카드가 없으면 빈 상태 표시
 */
"use client";

import { useTranslations } from "next-intl";
import type { WorkstageCard } from "@/types/mxvc/interlock";
import InterlockCard from "./InterlockCard";

interface InterlockCardGridProps {
  cards: WorkstageCard[];
}

export default function InterlockCardGrid({ cards }: InterlockCardGridProps) {
  const t = useTranslations("common");
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {cards.map((card) => (
        <InterlockCard key={card.workstageCode} card={card} />
      ))}
    </div>
  );
}
