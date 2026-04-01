/**
 * @file src/app/api/db-time/route.ts
 * @description Oracle DB 서버의 현재 시각을 반환하는 API.
 * 초보자 가이드:
 * - SYSDATE를 조회하여 DB 서버 시각을 반환한다
 * - DisplayHeader 시계에서 주기적으로 호출하여 브라우저 타임존 대신 DB 시간을 표시한다
 * - 응답: { time: "2026-04-01 14:30:05" } 형식
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface DbTimeRow {
  DB_TIME: string;
}

export async function GET() {
  try {
    const rows = await executeQuery<DbTimeRow>(
      `SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS DB_TIME FROM DUAL`,
    );
    return NextResponse.json({ time: rows[0]?.DB_TIME ?? '' });
  } catch {
    return NextResponse.json({ time: '' }, { status: 500 });
  }
}
