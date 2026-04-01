/**
 * @file src/app/api/settings/cards/route.ts
 * @description 메뉴 카드 설정 API — config/cards.json 읽기/쓰기
 *
 * 초보자 가이드:
 * 1. GET: cards.json에서 전체 카드 + 카테고리 목록 반환
 * 2. PUT: 카드 배열을 cards.json에 저장 (카테고리 이동 등)
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_CATEGORIES } from "@/lib/menu/config";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "config", "cards.json");

interface CardEntry {
  id: string;
  title: string;
  url: string;
  color: string;
  icon: string;
  layer: number;
}

interface CardsFile {
  cards: CardEntry[];
}

function loadCards(): CardsFile {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(raw) as CardsFile;
    }
  } catch (e) {
    console.error("cards.json 읽기 실패:", e);
  }
  return { cards: [] };
}

export async function GET() {
  const data = loadCards();
  const categories = DEFAULT_CATEGORIES.filter((c) => c.id !== 0);
  return NextResponse.json({ cards: data.cards, categories });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const cards = body.cards as CardEntry[];
    if (!Array.isArray(cards)) {
      return NextResponse.json({ error: "cards 배열이 필요합니다" }, { status: 400 });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ cards }, null, 2), "utf-8");
    return NextResponse.json({ success: true, count: cards.length });
  } catch (e) {
    console.error("cards.json 저장 실패:", e);
    return NextResponse.json(
      { error: `저장 실패: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
