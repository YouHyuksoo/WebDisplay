/**
 * @file src/app/settings/cards/page.tsx
 * @description 메뉴 카드 관리 페이지 — 전체 카드를 카테고리별로 보고 이동
 *
 * 초보자 가이드:
 * 1. /api/settings/cards에서 전체 카드 + 카테고리 목록 로드
 * 2. 카테고리별로 그룹핑하여 표시
 * 3. 각 카드의 카테고리를 드롭다운으로 변경 가능
 * 4. 저장 버튼으로 cards.json에 반영
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Spinner from "@/components/ui/Spinner";

interface Card {
  id: string;
  title: string;
  url: string;
  color: string;
  icon: string;
  layer: number;
}

interface Category {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
}

export default function CardManagerPage() {
  const t = useTranslations("settingsCards");
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/cards");
      const data = await res.json();
      setCards(data.cards ?? []);
      setCategories(data.categories ?? []);
    } catch (e) {
      console.error("카드 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const changeLayer = (cardId: string, newLayer: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, layer: newLayer } : c)),
    );
    setDirty(true);
  };

  const removeCategory = (catId: number) => {
    setCards((prev) =>
      prev.map((c) => (c.layer === catId ? { ...c, layer: -1 } : c)),
    );
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setDirty(true);
  };

  const saveCards = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, cards }),
      });
      if (!res.ok) throw new Error(t("saveFailed"));
      setDirty(false);
      setToast(t("saveSuccess"));
      localStorage.removeItem("mes-display-cards-cache");
      localStorage.removeItem("mes-display-categories");
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      setToast(t("errorPrefix", { error: String(e) }));
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const grouped = categories.map((cat) => ({
    category: cat,
    cards: cards.filter((c) => c.layer === cat.id),
  }));

  const unassigned = cards.filter(
    (c) => c.layer === -1 || !categories.some((cat) => cat.id === c.layer),
  );

  const removeCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, layer: -1 } : c)),
    );
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{t("title")}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t("summary", { cards: cards.length, categories: categories.length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dirty && (
              <span className="text-xs text-amber-500 font-medium">{t("dirty")}</span>
            )}
            <button
              onClick={saveCards}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-colors"
            >
              {saving ? t("saving") : t("save")}
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t("back")}
            </a>
          </div>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* 카테고리별 카드 목록 */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {grouped.map(({ category, cards: catCards }) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-bold text-sm">{category.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t("categorySubtitle", { subtitle: category.subtitle, count: catCards.length })}
                  </span>
                </div>
                <button
                  onClick={() => removeCategory(category.id)}
                  className="px-2 py-1 rounded text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t("removeCategoryTitle")}
                >
                  {t("removeCategory")}
                </button>
              </div>
            </div>

            {catCards.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
                {t("emptyCategory")}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {catCards.map((card) => (
                  <CardRow
                    key={card.id}
                    card={card}
                    categories={categories}
                    onChangeLayer={changeLayer}
                    onRemove={removeCard}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-300 dark:border-amber-700 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
              📦 {t("unassignedTitle", { count: unassigned.length })}
            </span>
          </div>
          {unassigned.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
              {t("unassignedEmpty")}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {unassigned.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  categories={categories}
                  onChangeLayer={changeLayer}
                  onRemove={removeCard}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardRow({
  card,
  categories,
  onChangeLayer,
  onRemove,
}: {
  card: Card;
  categories: Category[];
  onChangeLayer: (id: string, layer: number) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("settingsCards");
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: card.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{card.title}</div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
          {card.url}
        </div>
      </div>
      <select
        value={card.layer}
        onChange={(e) => onChangeLayer(card.id, Number(e.target.value))}
        className="shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300"
      >
        <option value={-1}>{t("selectUnassigned")}</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.icon} {cat.name}
          </option>
        ))}
      </select>
      {card.layer !== -1 && (
        <button
          onClick={() => onRemove(card.id)}
          className="shrink-0 px-2 py-1 rounded text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title={t("removeCardTitle")}
        >
          {t("removeCard")}
        </button>
      )}
    </div>
  );
}
