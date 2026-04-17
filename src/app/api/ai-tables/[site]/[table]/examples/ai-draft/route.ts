/**
 * @file src/app/api/ai-tables/[site]/[table]/examples/ai-draft/route.ts
 * @description AI 초안 생성 SSE 엔드포인트 (POST).
 *
 * 초보자 가이드:
 * - body: `{ count?: number (default 3), kinds?: ExampleKind[] (default ['exact','template']) }`
 * - 응답: `text/event-stream` — 이벤트 종류는 `draft` | `done` | `error`.
 * - 각 이벤트는 `event: <type>\ndata: <json>\n\n` 포맷.
 * - LLM 호출은 10~30초 걸릴 수 있으므로 타임아웃 없음. 클라이언트에서 취소 가능.
 */

import { NextRequest } from 'next/server';
import { streamExampleDrafts } from '@/lib/ai-tables/ai-draft';
import type { ExampleKind, SiteKey } from '@/lib/ai-tables/types';

type Params = { site: string; table: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { site, table } = await params;
  const body = await req.json().catch(() => ({})) as {
    count?: number;
    kinds?: ExampleKind[];
  };
  const count = Math.max(1, Math.min(10, body.count ?? 3));
  const kinds: ExampleKind[] =
    Array.isArray(body.kinds) && body.kinds.length > 0
      ? body.kinds
      : ['exact', 'template'];

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(ctl) {
      let closed = false;
      const safeEnqueue = (data: Uint8Array) => {
        if (closed) return;
        try {
          ctl.enqueue(data);
        } catch {
          closed = true;
        }
      };
      try {
        for await (const ev of streamExampleDrafts(
          site as SiteKey,
          table,
          count,
          kinds,
        )) {
          safeEnqueue(
            enc.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`),
          );
        }
      } catch (e) {
        safeEnqueue(
          enc.encode(
            `event: error\ndata: ${JSON.stringify({
              type: 'error',
              message: e instanceof Error ? e.message : String(e),
            })}\n\n`,
          ),
        );
      } finally {
        if (!closed) {
          try { ctl.close(); } catch { /* already closed */ }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
