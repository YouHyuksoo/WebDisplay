/**
 * @file src/app/api/mxvc/traceability/barcodes/route.ts
 * @description 바코드 목록 조회 API — 6가지 모드 지원.
 *
 * 초보자 가이드:
 * - 구버전: GET ?runNo=XXXX → IP_PRODUCT_2D_BARCODE.RUN_NO 기준 조회 (backward compat)
 * - 신버전: GET ?mode=runNo|magazine|box|pallet|carrier&value=XXX
 *           GET ?mode=repair&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&itemCode=XXX
 * - 모든 모드는 {SERIAL_NO, PCB_ITEM}[] 를 반환한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface BarcodeRow {
  SERIAL_NO: string;
  PCB_ITEM: string | null;
}

type SingleMode = 'runNo' | 'magazine' | 'box' | 'pallet' | 'carrier';

const SINGLE_MODE_COLUMN: Record<SingleMode, string> = {
  runNo:    'RUN_NO',
  magazine: 'MAGAZINE_NO',
  box:      'BOX_NO',
  pallet:   'PALLETE_NO',
  carrier:  'CARRIER_BARCODE',
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get('mode');
  const legacyRunNo = sp.get('runNo')?.trim() ?? '';

  try {
    /* backward compat: ?runNo=XXXX */
    if (!mode && legacyRunNo) {
      return await querySingle('RUN_NO', legacyRunNo);
    }

    if (mode && mode in SINGLE_MODE_COLUMN) {
      const value = sp.get('value')?.trim() ?? '';
      if (!value) {
        return NextResponse.json({ error: 'value 파라미터가 필요합니다' }, { status: 400 });
      }
      return await querySingle(SINGLE_MODE_COLUMN[mode as SingleMode], value);
    }

    if (mode === 'repair') {
      const dateFrom = sp.get('dateFrom')?.trim() ?? '';
      const dateTo   = sp.get('dateTo')?.trim()   ?? '';
      const itemCode = sp.get('itemCode')?.trim() ?? '';
      if (!dateFrom || !dateTo || !itemCode) {
        return NextResponse.json(
          { error: 'dateFrom, dateTo, itemCode 파라미터가 모두 필요합니다' },
          { status: 400 },
        );
      }
      return await queryRepair(dateFrom, dateTo, itemCode);
    }

    if (mode === 'spi' || mode === 'aoi') {
      const dateFrom = sp.get('dateFrom')?.trim() ?? '';
      const dateTo   = sp.get('dateTo')?.trim()   ?? '';
      if (!dateFrom || !dateTo) {
        return NextResponse.json(
          { error: 'dateFrom, dateTo 파라미터가 필요합니다' },
          { status: 400 },
        );
      }
      return await queryEquipmentLog(mode, dateFrom, dateTo);
    }

    return NextResponse.json(
      { error: 'mode 또는 runNo 파라미터가 필요합니다' },
      { status: 400 },
    );
  } catch (err) {
    console.error('바코드 목록 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

async function querySingle(column: string, value: string) {
  const rows = await executeQuery<BarcodeRow>(
    `SELECT SERIAL_NO, NULL AS PCB_ITEM
       FROM IP_PRODUCT_2D_BARCODE
      WHERE ${column} = :val
      ORDER BY SERIAL_NO ASC`,
    { val: value },
  );
  return NextResponse.json({ barcodes: rows, total: rows.length });
}

/**
 * 설비 로그 기준 조회 — 해당 기간 바코드 직접 추출.
 * - SPI: LOG_SPI(LOG_TIMESTAMP, ARRAY_BARCODE) + LOG_SPI_VD(INSPECTION_DATE 'YYYY-MM-DD', ARRAY_BARCODE) UNION
 * - AOI: LOG_AOI(LOG_TIMESTAMP, SERIAL_NO)
 * 결과 1000건 제한.
 */
async function queryEquipmentLog(mode: 'spi' | 'aoi', dateFrom: string, dateTo: string) {
  const sql = mode === 'spi'
    ? `SELECT SERIAL_NO, NULL AS PCB_ITEM FROM (
         SELECT DISTINCT ARRAY_BARCODE AS SERIAL_NO
           FROM LOG_SPI
          WHERE LOG_TIMESTAMP >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
            AND LOG_TIMESTAMP <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
            AND ARRAY_BARCODE IS NOT NULL
         UNION
         SELECT DISTINCT ARRAY_BARCODE AS SERIAL_NO
           FROM LOG_SPI_VD
          WHERE INSPECTION_DATE BETWEEN :dateFrom AND :dateTo
            AND ARRAY_BARCODE IS NOT NULL
       )
       ORDER BY SERIAL_NO ASC
       FETCH FIRST 1000 ROWS ONLY`
    : `SELECT DISTINCT SERIAL_NO, NULL AS PCB_ITEM
         FROM LOG_AOI
        WHERE LOG_TIMESTAMP >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
          AND LOG_TIMESTAMP <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
          AND SERIAL_NO IS NOT NULL
        ORDER BY SERIAL_NO ASC
        FETCH FIRST 1000 ROWS ONLY`;
  const rows = await executeQuery<BarcodeRow>(sql, { dateFrom, dateTo });
  return NextResponse.json({ barcodes: rows, total: rows.length });
}

async function queryRepair(dateFrom: string, dateTo: string, itemCode: string) {
  const rows = await executeQuery<BarcodeRow>(
    `SELECT DISTINCT SERIAL_NO, NULL AS PCB_ITEM
       FROM IP_PRODUCT_WORK_QC
      WHERE QC_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
        AND QC_DATE <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
        AND ITEM_CODE = :itemCode
        AND SERIAL_NO IS NOT NULL
      ORDER BY SERIAL_NO ASC`,
    { dateFrom, dateTo, itemCode },
  );
  return NextResponse.json({ barcodes: rows, total: rows.length });
}
