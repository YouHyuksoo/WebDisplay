/**
 * @file src/app/api/ctq/repair-status/route.ts
 * @description 수리상태 API -- IP_PRODUCT_WORK_QC 당일 불량 PID 수리 현황 조회
 *
 * 초보자 가이드:
 * 1. **테이블**: IP_PRODUCT_WORK_QC
 * 2. **기간**: 당일 08:00 ~ 익일 08:00
 * 3. **내용**: 불량 감지된 PID의 수리 상태 (입고/수리결과/처리)
 * 4. **코드변환**: F_GET_BASECODE(코드타입, 코드명, 언어, 조직ID)
 * 5. **정렬**: QC_DATE 내림차순 (최신순)
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import { parseLines, buildLineInClause, getVietnamTimeRange } from "@/lib/ctq/line-filter";

export const dynamic = "force-dynamic";

interface QcRow {
  QC_DATE: string;
  SERIAL_NO: string;
  LINE_CODE: string;
  LINE_NAME: string;
  MODEL_NAME: string;
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

export async function GET(request: NextRequest) {
  try {
    const lines = parseLines(request);
    const lineFilter = buildLineInClause(lines, "t", "ln");
    const tr = getVietnamTimeRange();
    const pidFilter = request.nextUrl.searchParams.get("pid")?.trim() ?? "";
    const pidClause = pidFilter ? "AND t.SERIAL_NO LIKE :pidLike" : "";

    const sql = `
      SELECT TO_CHAR(t.QC_DATE, 'YYYY-MM-DD HH24:MI:SS') AS QC_DATE,
             t.SERIAL_NO,
             t.LINE_CODE,
             F_GET_LINE_NAME(t.LINE_CODE, 1) AS LINE_NAME,
             NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
             NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), NVL(t.WORKSTAGE_CODE, '-')) AS WORKSTAGE_NAME,
             NVL(F_GET_WORKSTAGE_NAME(t.REPAIR_WORKSTAGE_CODE), NVL(t.REPAIR_WORKSTAGE_CODE, '-')) AS REPAIR_WORKSTAGE_NAME,
             NVL(F_GET_BASECODE('QC RESULT', t.QC_RESULT, 'C', 1), NVL(t.QC_RESULT, '-')) AS QC_RESULT_NAME,
             NVL(F_GET_BASECODE('REPAIR RESULT CODE', t.REPAIR_RESULT_CODE, 'C', 1), NVL(t.REPAIR_RESULT_CODE, '-')) AS REPAIR_RESULT_NAME,
             NVL(F_GET_BASECODE('RECEIPT DEFICIT', t.RECEIPT_DEFICIT, 'C', 1), NVL(t.RECEIPT_DEFICIT, '-')) AS RECEIPT_NAME,
             NVL(t.LOCATION_CODE, '-') AS LOCATION_CODE,
             NVL(F_GET_BASECODE('QC INSPECT HANDLING', t.QC_INSPECT_HANDLING, 'C', 1), NVL(t.QC_INSPECT_HANDLING, '-')) AS HANDLING_NAME,
             NVL(t.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
             NVL(t.BAD_REASON_CODE, '-') AS BAD_REASON_CODE,
             NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1), NVL(t.BAD_REASON_CODE, '-')) AS BAD_REASON_NAME
      FROM IP_PRODUCT_WORK_QC t
      WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
        AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
        AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
        AND t.LINE_CODE IS NOT NULL
        AND t.LINE_CODE <> '*'
        ${lineFilter.clause}
        ${pidClause}
      ORDER BY t.WORKSTAGE_CODE, t.RECEIPT_DEFICIT, t.QC_DATE DESC
      FETCH FIRST 500 ROWS ONLY
    `;

    const rows = await executeQuery<QcRow>(sql, {
      tsStart: tr.startStr,
      tsEnd: tr.endStr,
      ...lineFilter.params,
      ...(pidFilter ? { pidLike: `%${pidFilter}%` } : {}),
    });

    const mapped = rows.map((r) => ({
      qcDate: r.QC_DATE,
      pid: r.SERIAL_NO,
      lineCode: r.LINE_CODE,
      lineName: r.LINE_NAME || r.LINE_CODE,
      modelName: r.MODEL_NAME,
      workstageName: r.WORKSTAGE_NAME,
      repairWorkstageName: r.REPAIR_WORKSTAGE_NAME,
      qcResultName: r.QC_RESULT_NAME,
      repairResultName: r.REPAIR_RESULT_NAME,
      receiptName: r.RECEIPT_NAME,
      locationCode: r.LOCATION_CODE,
      handlingName: r.HANDLING_NAME,
      defectItemCode: r.DEFECT_ITEM_CODE,
      badReasonCode: r.BAD_REASON_CODE,
      badReasonName: r.BAD_REASON_NAME,
    }));

    return NextResponse.json({
      rows: mapped,
      total: mapped.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Repair Status API error:", error);
    return NextResponse.json(
      { error: "데이터 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
