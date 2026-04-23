/**
 * @file src/app/api/ai-context/wiki/[kind]/[slug]/route.ts
 * @description wiki/ai-chat/{kind}/{slug}.md CRUD.
 *
 * 초보자 가이드:
 * - kind: 'tables' | 'functions' | 'procedures'
 * - slug: MD 파일명 (소문자·하이픈)
 * - PUT: 본문 저장 + md-loader 캐시 invalidate → 즉시 AI 챗 반영
 * - DELETE: 파일 삭제 + invalidate
 *
 * 보안: kind·slug 화이트리스트 검증. path traversal 방지 (슬래시·점 금지).
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { invalidateAiChatContext } from '@/lib/ai/context/md-loader';

const ROOT = process.cwd();
const WIKI_ROOT = path.join(ROOT, 'wiki', 'ai-chat');
const ALLOWED_KINDS = new Set(['tables', 'functions', 'procedures']);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

type RouteContext = { params: Promise<{ kind: string; slug: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { kind, slug } = await ctx.params;
  const validated = validate(kind, slug);
  if (!validated.ok) return validated.res;

  const filePath = path.join(WIKI_ROOT, kind, `${slug}.md`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return NextResponse.json({ kind, slug, content });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { kind, slug } = await ctx.params;
  const validated = validate(kind, slug);
  if (!validated.ok) return validated.res;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'content_required' },
      { status: 400 },
    );
  }

  const dir = path.join(WIKI_ROOT, kind);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${slug}.md`);
  await fs.writeFile(filePath, body.content, 'utf8');

  invalidateAiChatContext();
  return NextResponse.json({ ok: true, kind, slug, bytes: body.content.length });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { kind, slug } = await ctx.params;
  const validated = validate(kind, slug);
  if (!validated.ok) return validated.res;

  const filePath = path.join(WIKI_ROOT, kind, `${slug}.md`);
  try {
    await fs.unlink(filePath);
    invalidateAiChatContext();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

function validate(
  kind: string,
  slug: string,
):
  | { ok: true }
  | { ok: false; res: NextResponse } {
  if (!ALLOWED_KINDS.has(kind)) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'invalid_kind' }, { status: 400 }),
    };
  }
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'invalid_slug' }, { status: 400 }),
    };
  }
  return { ok: true };
}
