/**
 * @file src/app/api/mxvc/traceability/runcards/route.ts
 * @description IP_PRODUCT_RUN_CARD에서 날짜 구간으로 RUN_NO 목록 조회.
 * 초보자 가이드:
 * - GET ?from=YYYY-MM-DD&to=YYYY-MM-DD → 해당 기간의 작업지시 목록 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RunCardRow {
  RUN_NO: string;
  RUN_DATE: string;
  MODEL_NAME: string | null;
  LINE_CODE: string | null;
  LOT_SIZE: number | null;
  RUN_STATUS: string | null;
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') ?? '';
  const to = req.nextUrl.searchParams.get('to') ?? '';

  if (!from || !to) {
    return NextResponse.json({ error: 'from, to 파라미터가 필요합니다' }, { status: 400 });
  }

  try {
    const rows = await executeQuery<RunCardRow>(
      `SELECT RUN_NO, TO_CHAR(RUN_DATE, 'YYYY-MM-DD') AS RUN_DATE,
              MODEL_NAME, LINE_CODE, LOT_SIZE, RUN_STATUS
         FROM IP_PRODUCT_RUN_CARD
        WHERE RUN_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                             AND TO_DATE(:toDate, 'YYYY-MM-DD') + 0.99999
        ORDER BY RUN_DATE DESC, RUN_NO`,
      { fromDate: from, toDate: to },
    );
    return NextResponse.json({ runcards: rows, total: rows.length });
  } catch (err) {
    console.error('RUN_CARD 목록 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
