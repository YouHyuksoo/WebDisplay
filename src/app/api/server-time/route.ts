/**
 * @file src/app/api/server-time/route.ts
 * @description DB 서버 시간 조회 API — SYSDATE 기반
 * 초보자 가이드: 클라이언트의 브라우저 시간이 아닌 DB 서버 시간을 반환한다.
 */
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TimeRow { TODAY: string; NOW: string; }

export async function GET() {
  try {
    const rows = await executeQuery<TimeRow>(
      `SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD') AS TODAY,
              TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS NOW
       FROM DUAL`,
      {},
    );
    return NextResponse.json({
      today: rows[0]?.TODAY ?? new Date().toISOString().slice(0, 10),
      now: rows[0]?.NOW ?? new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      today: new Date().toISOString().slice(0, 10),
      now: new Date().toISOString(),
    });
  }
}
