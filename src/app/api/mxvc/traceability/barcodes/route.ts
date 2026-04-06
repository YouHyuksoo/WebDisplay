/**
 * @file src/app/api/mxvc/traceability/barcodes/route.ts
 * @description RUN_NO로 IP_PRODUCT_2D_BARCODE의 SERIAL_NO 목록 조회.
 * 초보자 가이드:
 * - GET ?runNo=XXXX → 해당 RUN_NO에 등록된 SERIAL_NO 목록 반환
 * - 사이드바 바코드 목록 표시용
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface BarcodeRow {
  SERIAL_NO: string;
  PCB_ITEM: string | null;
}

export async function GET(req: NextRequest) {
  const runNo = req.nextUrl.searchParams.get('runNo')?.trim() ?? '';

  if (!runNo) {
    return NextResponse.json({ error: 'runNo 파라미터가 필요합니다' }, { status: 400 });
  }

  try {
    const rows = await executeQuery<BarcodeRow>(
      `SELECT SERIAL_NO, PCB_ITEM
         FROM IP_PRODUCT_2D_BARCODE
        WHERE RUN_NO = :runNo
        ORDER BY SERIAL_NO ASC`,
      { runNo },
    );
    return NextResponse.json({ barcodes: rows, total: rows.length });
  } catch (err) {
    console.error('바코드 목록 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
