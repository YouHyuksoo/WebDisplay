/**
 * @file src/app/api/ai-context/wiki/[kind]/[slug]/toggle/route.ts
 * @description "사용함/사용안함" 토글 — frontmatter `enabled` 만 변경.
 *   MD 없으면 자동 초안 생성 후 enabled 설정해서 저장.
 *
 * 초보자 가이드:
 * - UI 좌측 목록 체크박스가 이 API 호출.
 * - enabled=true 만 Stage 0 prefilter 후보 + Stage 1 프롬프트 주입 대상.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildWikiDraft,
  setEnabledInFrontmatter,
  type WikiKind,
} from '@/lib/ai-tables/wiki-draft';
import { invalidateAiChatContext } from '@/lib/ai/context/md-loader';

const ROOT = process.cwd();
const WIKI_ROOT = path.join(ROOT, 'wiki', 'ai-chat');
const ALLOWED_KINDS = new Set<WikiKind>(['tables', 'functions', 'procedures']);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

type RouteContext = { params: Promise<{ kind: string; slug: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { kind, slug } = await ctx.params;
  if (!ALLOWED_KINDS.has(kind as WikiKind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled_required' }, { status: 400 });
  }
  const enabled: boolean = body.enabled;

  const filePath = path.join(WIKI_ROOT, kind, `${slug}.md`);
  let content: string | null = null;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    // 없으면 자동 초안 생성
    const draft = await buildWikiDraft(kind as WikiKind, slug);
    if (!draft) {
      return NextResponse.json(
        { error: 'not_in_db_cache' },
        { status: 404 },
      );
    }
    content = draft;
  }

  const updated = setEnabledInFrontmatter(content, enabled);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, updated, 'utf8');
  invalidateAiChatContext();

  return NextResponse.json({ ok: true, kind, slug, enabled });
}
