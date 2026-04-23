/**
 * @file src/app/api/ai-context/wiki/[kind]/[slug]/draft/route.ts
 * @description 자동 초안 MD 생성기. lib/ai-tables/wiki-draft.ts 로 위임.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildWikiDraft, type WikiKind } from '@/lib/ai-tables/wiki-draft';

const ALLOWED_KINDS = new Set<WikiKind>(['tables', 'functions', 'procedures']);

type RouteContext = { params: Promise<{ kind: string; slug: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { kind, slug } = await ctx.params;
  if (!ALLOWED_KINDS.has(kind as WikiKind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }
  const content = await buildWikiDraft(kind as WikiKind, slug);
  if (!content) {
    return NextResponse.json({ error: 'not_in_cache' }, { status: 404 });
  }
  return NextResponse.json({ kind, slug, content });
}
