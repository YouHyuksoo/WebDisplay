/**
 * @file src/app/api/mxvc/repair-status/route.ts
 * @description 멕시코전장 수리현황 API — IP_PRODUCT_WORK_QC 불량 PID 수리 현황
 *
 * 초보자 가이드:
 * 1. 테이블: IP_PRODUCT_WORK_QC
 * 2. 기간: 기본 당일 08:00 ~ 익일 08:00 (dateFrom/dateTo 파라미터로 변경 가능)
 * 3. CTQ repair-status와 동일 구조 — 멕시코전장 DB(기본 프로필) 사용
 * 4. 시리얼번호 prefix 필터 없음 (CTQ의 VN07/VNL1 필터 제거)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface QcRow {
  QC_DATE: string;
  SERIAL_NO: string;
  LINE_CODE: string;
  LINE_NAME: string;
  MODEL_NAME: string;
  WORKSTAGE_CODE: string;
  WORKSTAGE_NAME: string;
  REPAIR_WORKSTAGE_NAME: string;
  QC_RESULT_NAME: string;
  REPAIR_RESULT_NAME: string;
  RECEIPT_NAME: string;
  LOCATION_CODE: string;
  HANDLING_NAME: string;
  DEFECT_ITEM_CODE: string;
  BAD_REASON_CODE: string;
  BAD_REASON_NAME: string;
}

function toShiftStart(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d} 08:00:00`;
}

function toShiftEnd(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, '0');
  const nd = String(next.getDate()).padStart(2, '0');
  return `${ny}/${nm}/${nd} 08:00:00`;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const dateFrom = sp.get('dateFrom')?.trim() ?? '';
    const dateTo   = sp.get('dateTo')?.trim() ?? '';
    const pidFilter       = sp.get('pid')?.trim() ?? '';
    const lineFilter      = sp.get('lines')?.trim() ?? '';
    const workstageFilter = sp.get('workstage')?.trim() ?? '';
    const modelFilter     = sp.get('model')?.trim() ?? '';

    /* 날짜 범위 — 없으면 당일 작업조 */
    const tsStart = dateFrom
      ? toShiftStart(dateFrom)
      : (() => {
          const now = new Date();
          const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
          return `${y}/${m}/${d} 08:00:00`;
        })();
    const tsEnd = dateTo
      ? toShiftEnd(dateTo)
      : (() => {
          const tomorrow = new Date(Date.now() + 86400000);
          const y = tomorrow.getFullYear(), m = String(tomorrow.getMonth() + 1).padStart(2, '0'), d = String(tomorrow.getDate()).padStart(2, '0');
          return `${y}/${m}/${d} 08:00:00`;
        })();

    const pidClause       = pidFilter       ? 'AND t.SERIAL_NO LIKE :pidLike'       : '';
    const lineClause      = lineFilter && lineFilter !== '%'
      ? 'AND t.LINE_CODE LIKE :lineLike'
      : '';
    const workstageClause = workstageFilter ? 'AND t.WORKSTAGE_CODE LIKE :wsCLike'  : '';
    const modelClause     = modelFilter     ? 'AND t.MODEL_NAME LIKE :modelLike'    : '';

    const sql = `
      SELECT TO_CHAR(t.QC_DATE, 'YYYY-MM-DD HH24:MI:SS') AS QC_DATE,
             t.SERIAL_NO,
             t.LINE_CODE,
             t.WORKSTAGE_CODE,
             NVL(F_GET_LINE_NAME(t.LINE_CODE, 1), t.LINE_CODE)                                           AS LINE_NAME,
             NVL(t.MODEL_NAME, '-')                                                                       AS MODEL_NAME,
             NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), NVL(t.WORKSTAGE_CODE, '-'))                     AS WORKSTAGE_NAME,
             NVL(F_GET_WORKSTAGE_NAME(t.REPAIR_WORKSTAGE_CODE), NVL(t.REPAIR_WORKSTAGE_CODE, '-'))       AS REPAIR_WORKSTAGE_NAME,
             NVL(F_GET_BASECODE('QC RESULT', t.QC_RESULT, 'K', 1), NVL(t.QC_RESULT, '-'))               AS QC_RESULT_NAME,
             NVL(F_GET_BASECODE('REPAIR RESULT CODE', t.REPAIR_RESULT_CODE, 'K', 1), NVL(t.REPAIR_RESULT_CODE, '-')) AS REPAIR_RESULT_NAME,
             NVL(F_GET_BASECODE('RECEIPT DEFICIT', t.RECEIPT_DEFICIT, 'K', 1), NVL(t.RECEIPT_DEFICIT, '-')) AS RECEIPT_NAME,
             NVL(t.LOCATION_CODE, '-')                                                                    AS LOCATION_CODE,
             NVL(F_GET_BASECODE('QC INSPECT HANDLING', t.QC_INSPECT_HANDLING, 'K', 1), NVL(t.QC_INSPECT_HANDLING, '-')) AS HANDLING_NAME,
             NVL(t.BAD_POSITION, '-')                                                                     AS DEFECT_ITEM_CODE,
             NVL(t.BAD_REASON_CODE, '-')                                                                  AS BAD_REASON_CODE,
             NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'K', 1), NVL(t.BAD_REASON_CODE, '-')) AS BAD_REASON_NAME
      FROM IP_PRODUCT_WORK_QC t
      WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
        AND t.QC_DATE <  TO_DATE(:tsEnd,   'YYYY/MM/DD HH24:MI:SS')
        AND t.LINE_CODE IS NOT NULL
        AND t.LINE_CODE <> '*'
        ${lineClause}
        ${workstageClause}
        ${modelClause}
        ${pidClause}
      ORDER BY t.WORKSTAGE_CODE, t.RECEIPT_DEFICIT, t.QC_DATE DESC
      FETCH FIRST 500 ROWS ONLY
    `;

    const rows = await executeQuery<QcRow>(sql, {
      tsStart,
      tsEnd,
      ...(lineFilter && lineFilter !== '%' ? { lineLike: `%${lineFilter}%` } : {}),
      ...(workstageFilter ? { wsCLike: `%${workstageFilter}%` } : {}),
      ...(modelFilter     ? { modelLike: `%${modelFilter}%` }   : {}),
      ...(pidFilter       ? { pidLike: `%${pidFilter}%` }        : {}),
    });

    const mapped = rows.map((r) => ({
      qcDate:               r.QC_DATE,
      pid:                  r.SERIAL_NO,
      lineCode:             r.LINE_CODE,
      lineName:             r.LINE_NAME || r.LINE_CODE,
      modelName:            r.MODEL_NAME,
      workstageName:        r.WORKSTAGE_NAME,
      repairWorkstageName:  r.REPAIR_WORKSTAGE_NAME,
      qcResultName:         r.QC_RESULT_NAME,
      repairResultName:     r.REPAIR_RESULT_NAME,
      receiptName:          r.RECEIPT_NAME,
      locationCode:         r.LOCATION_CODE,
      handlingName:         r.HANDLING_NAME,
      defectItemCode:       r.DEFECT_ITEM_CODE,
      badReasonCode:        r.BAD_REASON_CODE,
      badReasonName:        r.BAD_REASON_NAME,
    }));

    return NextResponse.json({ rows: mapped, total: mapped.length, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error('MXVC Repair Status API error:', error);
    return NextResponse.json({ error: '데이터 조회 실패', detail: String(error) }, { status: 500 });
  }
}
