/**
 * @file route.ts
 * @description SQL Viewer API — 화면 ID로 등록된 SQL 쿼리를 반환한다.
 * 초보자 가이드: GET /api/debug/sql?screenId=50 → 해당 화면의 SQL 목록과 제목 반환.
 * sql-registry.ts의 SCREEN_SQL_BUILDERS에서 조회한다.
 */
import { NextResponse } from 'next/server';
import { getScreenSql } from '@/lib/queries/sql-registry';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const screenId = searchParams.get('screenId') ?? '';

  if (!screenId) {
    return NextResponse.json({ error: 'screenId 필수' }, { status: 400 });
  }

  const info = getScreenSql(screenId);
  if (!info) {
    return NextResponse.json(
      { error: `화면 ${screenId}의 SQL이 등록되지 않았습니다`, title: '', queries: [] },
      { status: 404 },
    );
  }

  return NextResponse.json({
    title: info.title,
    queries: info.queries,
  });
}
