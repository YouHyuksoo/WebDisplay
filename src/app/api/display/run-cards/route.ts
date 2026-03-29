/**
 * @file route.ts
 * @description 런카드(생산계획) 조회 API.
 * 초보자 가이드: IP_PRODUCT_RUN_CARD에서 당일 작업일 기준 라인별 런카드를 조회.
 * 생산계획등록(메뉴 20)에서 모델 선택 모달에 사용된다.
 * GET /api/display/run-cards?orgId=1&lineCode=P11
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const SQL_RUN_CARDS = `
SELECT MODEL_NAME, ITEM_CODE, LOT_SIZE, LOT_NO, RUN_NO
  FROM IP_PRODUCT_RUN_CARD
 WHERE LINE_CODE = :lineCode
   AND ORGANIZATION_ID = :orgId
   AND RUN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
 ORDER BY MODEL_NAME, ITEM_CODE
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = Number(searchParams.get('orgId') ?? '1');
  const lineCode = searchParams.get('lineCode') ?? '';

  if (!lineCode) {
    return NextResponse.json({ rows: [] });
  }

  try {
    const rows = await executeQuery(SQL_RUN_CARDS, { lineCode, orgId });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('[API /display/run-cards] Error:', error);
    return NextResponse.json({ error: 'Query failed', rows: [] }, { status: 500 });
  }
}
