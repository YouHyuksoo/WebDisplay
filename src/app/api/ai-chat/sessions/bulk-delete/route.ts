/**
 * @file src/app/api/ai-chat/sessions/bulk-delete/route.ts
 * @description POST — 여러 세션 일괄 삭제 (인덱스 원자적 갱신).
 *
 * 초보자 가이드:
 * - 단일 DELETE를 N번 호출하면 index.json read-modify-write 레이스로 lost update 발생
 * - 이 엔드포인트는 서버에서 한 번의 쓰기로 처리해 원자성 확보
 */
import { NextResponse } from 'next/server';
import { deleteSessions } from '@/lib/ai/chat-store';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.sessionIds) ? body.sessionIds.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }
    await deleteSessions(ids);
    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (e) {
    console.error('[ai-chat/sessions/bulk-delete POST]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
