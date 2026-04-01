/**
 * @file src/app/api/settings/cards/route.ts
 * @description 메뉴 카드/카테고리 설정 API — config/cards.json 읽기/쓰기
 *
 * 초보자 가이드:
 * 1. GET: cards.json에서 카테고리 + 카드 목록 반환
 * 2. PUT: 카테고리 + 카드 배열을 cards.json에 저장
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "config", "cards.json");

interface CategoryEntry {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
}

interface CardEntry {
  id: string;
  title: string;
  url: string;
  color: string;
  icon: string;
  layer: number;
}

interface CardsFile {
  categories: CategoryEntry[];
  cards: CardEntry[];
}

function loadFile(): CardsFile {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(raw) as CardsFile;
    }
  } catch (e) {
    console.error("cards.json 읽기 실패:", e);
  }
  return { categories: [], cards: [] };
}

function saveFile(data: CardsFile): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const data = loadFile();
  return NextResponse.json({
    categories: data.categories.filter((c) => c.id !== 0),
    cards: data.cards,
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const current = loadFile();

    const categories = body.categories as CategoryEntry[] | undefined;
    const cards = body.cards as CardEntry[] | undefined;

    const updated: CardsFile = {
      categories: categories ?? current.categories,
      cards: cards ?? current.cards,
    };

    saveFile(updated);
    return NextResponse.json({
      success: true,
      categoryCount: updated.categories.length,
      cardCount: updated.cards.length,
    });
  } catch (e) {
    console.error("cards.json 저장 실패:", e);
    return NextResponse.json(
      { error: `저장 실패: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
