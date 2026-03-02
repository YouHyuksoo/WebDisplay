/**
 * @file route.ts
 * @description SQL 디버그 API — 화면 ID별 적용된 SQL 쿼리를 반환합니다.
 *
 * GET /api/debug/sql?screenId=24
 *   → { screenId, title, queries: [{ label, sql }] }
 *
 * GET /api/debug/sql
 *   → { screens: [{ screenId, title, queryCount }] }  (전체 목록)
 */
import { NextResponse } from 'next/server';
import { getScreenSql, getRegisteredScreenIds } from '@/lib/queries/sql-registry';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const screenId = searchParams.get('screenId');

  // 전체 목록 반환 — 각 화면의 SQL을 lazy 호출하여 queryCount만 추출
  if (!screenId) {
    const screens = getRegisteredScreenIds().map((id) => {
      const s = getScreenSql(id)!;
      return { screenId: s.screenId, title: s.title, queryCount: s.queries.length };
    });
    return NextResponse.json({ screens });
  }

  // 특정 화면 SQL 반환
  const info = getScreenSql(screenId);
  if (!info) {
    return NextResponse.json(
      { error: `Screen ${screenId} has no registered SQL` },
      { status: 404 },
    );
  }

  return NextResponse.json(info);
}
