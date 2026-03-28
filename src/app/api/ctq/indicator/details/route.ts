/**
 * @file src/app/api/ctq/indicator/details/route.ts
 * @description 지표 상세 조회 API -- IQ_DAILY_NOTIFY 불량 이력
 *
 * 초보자 가이드:
 * 1. 대책서 OK 클릭 시 해당 대책서번호의 IQ_DAILY_NOTIFY 이력 표시
 * 2. 코드 컬럼은 F_GET_BASECODE / F_GET_WORKSTAGE_NAME 으로 명칭 변환
 */

import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

interface NotifyRow {
  ACTION_DATE: string;
  START_TIME: string;
  END_TIME: string;
  LINE_NAME: string;
  WORKSTAGE_NAME: string;
  MACHINE_CODE: string;
  MODEL_NAME: string;
  ITEM_CODE: string;
  DETECT_LOCATION: string;
  LOCATION_INFO: string;
  SERIAL_NO: string;
  GRADE: string;
  BAD_REASON_NAME: string;
  BAD_DESCRIPTION: string;
  MATERIAL_MAKER: string;
  INSPECT_BAD_QTY: number;
  INSPECT_QTY: number;
  RUN_NO: string;
  NOTIFY_STATUS_NAME: string;
  COMPLETE_YN: string;
  COMPLETE_DATE: string;
  INSPECT_CHARGER: string;
  INSPECT_MANAGER: string;
  DEPARTMENT_NAME: string;
  COUNTERMEASURE: string;
  COMMENTS: string;
  QC_COMMENTS: string;
  LINE_STATUS_NOTIFY: string;
  ACTION_DATE_RAW: string;
  NOTIFY_SEQUENCE: number;
  ORGANIZATION_ID: number;
  INSPECT_IMAGE_FILE_NAME: string;
  DOCUMENT_IMAGE_FILE_NAME: string;
  NG_IMAGE_FILE_NAME: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const countermeasure = url.searchParams.get("countermeasure") ?? "";

    if (!countermeasure) {
      return NextResponse.json({ error: "countermeasure 필수" }, { status: 400 });
    }

    const sql = `
      SELECT TO_CHAR(t.ACTION_DATE, 'YYYY/MM/DD') AS ACTION_DATE,
             NVL(TO_CHAR(t.START_TIME, 'HH24:MI'), '-') AS START_TIME,
             NVL(TO_CHAR(t.END_TIME, 'HH24:MI'), '-') AS END_TIME,
             NVL(F_GET_LINE_NAME(t.LINE_CODE, 1), NVL(t.LINE_CODE, '-')) AS LINE_NAME,
             NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), NVL(t.WORKSTAGE_CODE, '-')) AS WORKSTAGE_NAME,
             NVL(t.MACHINE_CODE, '-') AS MACHINE_CODE,
             NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
             NVL(t.ITEM_CODE, '-') AS ITEM_CODE,
             NVL(t.DETECT_LOCATION, '-') AS DETECT_LOCATION,
             NVL(t.LOCATION_INFO, '-') AS LOCATION_INFO,
             NVL(t.SERIAL_NO, '-') AS SERIAL_NO,
             NVL(t.GRADE, '-') AS GRADE,
             NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1), NVL(t.BAD_REASON_CODE, '-')) AS BAD_REASON_NAME,
             NVL(t.BAD_DESCRIPTION, '-') AS BAD_DESCRIPTION,
             NVL(t.MATERIAL_MAKER, '-') AS MATERIAL_MAKER,
             NVL(t.INSPECT_BAD_QTY, 0) AS INSPECT_BAD_QTY,
             NVL(t.INSPECT_QTY, 0) AS INSPECT_QTY,
             NVL(t.RUN_NO, '-') AS RUN_NO,
             NVL(F_GET_BASECODE('NOTIFY STATUS', t.NOTIFY_STATUS, 'C', 1), NVL(t.NOTIFY_STATUS, '-')) AS NOTIFY_STATUS_NAME,
             NVL(t.COMPLETE_YN, 'N') AS COMPLETE_YN,
             NVL(TO_CHAR(t.COMPLETE_DATE, 'YYYY/MM/DD HH24:MI'), '-') AS COMPLETE_DATE,
             NVL(t.INSPECT_CHARGER, '-') AS INSPECT_CHARGER,
             NVL(t.INSPECT_MANAGER, '-') AS INSPECT_MANAGER,
             NVL(F_GET_BASECODE('DEPARTMENT', t.DEPARTMENT_CODE, 'C', 1), NVL(t.DEPARTMENT_CODE, '-')) AS DEPARTMENT_NAME,
             NVL(t.COUNTERMEASURE, '-') AS COUNTERMEASURE,
             NVL(t.COMMENTS, '-') AS COMMENTS,
             NVL(t.QC_COMMENTS, '-') AS QC_COMMENTS,
             NVL(t.LINE_STATUS_NOTIFY, '-') AS LINE_STATUS_NOTIFY,
             TO_CHAR(t.ACTION_DATE, 'YYYY/MM/DD') AS ACTION_DATE_RAW,
             t.NOTIFY_SEQUENCE,
             t.ORGANIZATION_ID,
             NVL(t.INSPECT_IMAGE_FILE_NAME, '-') AS INSPECT_IMAGE_FILE_NAME,
             NVL(t.DOCUMENT_IMAGE_FILE_NAME, '-') AS DOCUMENT_IMAGE_FILE_NAME,
             NVL(t.NG_IMAGE_FILE_NAME, '-') AS NG_IMAGE_FILE_NAME
      FROM IQ_DAILY_NOTIFY t
      WHERE t.COUNTERMEASURE = :countermeasure
      ORDER BY t.ACTION_DATE DESC, t.START_TIME DESC
      FETCH FIRST 100 ROWS ONLY
    `;

    const rows = await executeQuery<NotifyRow>(sql, { countermeasure });

    return NextResponse.json({
      records: rows.map((r) => ({
        actionDate: r.ACTION_DATE,
        startTime: r.START_TIME,
        endTime: r.END_TIME,
        lineName: r.LINE_NAME,
        workstageName: r.WORKSTAGE_NAME,
        machineCode: r.MACHINE_CODE,
        modelName: r.MODEL_NAME,
        itemCode: r.ITEM_CODE,
        detectLocation: r.DETECT_LOCATION,
        locationInfo: r.LOCATION_INFO,
        serialNo: r.SERIAL_NO,
        grade: r.GRADE,
        badReasonName: r.BAD_REASON_NAME,
        badDescription: r.BAD_DESCRIPTION,
        materialMaker: r.MATERIAL_MAKER,
        inspectBadQty: r.INSPECT_BAD_QTY,
        inspectQty: r.INSPECT_QTY,
        runNo: r.RUN_NO,
        notifyStatusName: r.NOTIFY_STATUS_NAME,
        completeYn: r.COMPLETE_YN,
        completeDate: r.COMPLETE_DATE,
        inspectCharger: r.INSPECT_CHARGER,
        inspectManager: r.INSPECT_MANAGER,
        departmentName: r.DEPARTMENT_NAME,
        countermeasure: r.COUNTERMEASURE,
        comments: r.COMMENTS,
        qcComments: r.QC_COMMENTS,
        lineStatusNotify: r.LINE_STATUS_NOTIFY,
        actionDateRaw: r.ACTION_DATE_RAW,
        notifySequence: r.NOTIFY_SEQUENCE,
        organizationId: r.ORGANIZATION_ID,
        inspectImageFileName: r.INSPECT_IMAGE_FILE_NAME,
        documentImageFileName: r.DOCUMENT_IMAGE_FILE_NAME,
        ngImageFileName: r.NG_IMAGE_FILE_NAME,
      })),
      total: rows.length,
    });
  } catch (error) {
    console.error("Indicator details API error:", error);
    return NextResponse.json(
      { error: "상세 조회 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
