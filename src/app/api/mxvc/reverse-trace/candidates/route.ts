/**
 * @file src/app/api/mxvc/reverse-trace/candidates/route.ts
 * @description 역추적 위자드 — 릴 후보 리스트 조회 API
 *
 * 초보자 가이드:
 * 1. mode 파라미터로 세 가지 경로 분기: issue | run | feeder
 * 2. 각 모드별 필수 파라미터 검증 후 Oracle 조회
 * 3. 최대 500건까지만 반환 (DB 부하 방지)
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get('mode');

  try {
    if (mode === 'issue')  return await handleIssue(sp);
    if (mode === 'run')    return await handleRun(sp);
    if (mode === 'feeder') return await handleFeeder(sp);
    if (mode === 'refid')  return await handleRefId(sp);
    return NextResponse.json({ error: 'mode 파라미터가 필요합니다 (issue | run | feeder | refid)' }, { status: 400 });
  } catch (err) {
    console.error('candidates API 오류:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

async function handleIssue(sp: URLSearchParams) {
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo   = sp.get('dateTo')   ?? '';
  const itemCode = sp.get('itemCode') ?? '';
  if (!dateFrom || !dateTo || !itemCode) {
    return NextResponse.json({ error: 'dateFrom, dateTo, itemCode 모두 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT DISTINCT
           rb.ITEM_BARCODE                                  AS "reelCd",
           iss.ITEM_CODE                                    AS "itemCode",
           NVL(iss.MODEL_NAME, '-')                         AS "modelName",
           TO_CHAR(iss.ISSUE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS "issueDate",
           iss.ISSUE_QTY                                    AS "issueQty",
           iss.MATERIAL_MFS                                 AS "lotNo"
      FROM IM_ITEM_ISSUE iss
      JOIN IM_ITEM_RECEIPT_BARCODE rb
        ON rb.LOT_NO = iss.MATERIAL_MFS AND rb.ITEM_CODE = iss.ITEM_CODE
     WHERE iss.ISSUE_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
       AND iss.ISSUE_DATE <  TO_DATE(:dateTo,   'YYYY-MM-DD') + 1
       AND iss.ITEM_CODE = :itemCode
       AND iss.ISSUE_DEFICIT = '3'
       AND iss.LOT_DIVIDE_SEQUENCE IS NULL
     ORDER BY "issueDate" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { dateFrom, dateTo, itemCode });
  return NextResponse.json({ mode: 'issue', candidates: rows, total: rows.length });
}

async function handleRun(sp: URLSearchParams) {
  const runNo = sp.get('runNo') ?? '';
  if (!runNo) return NextResponse.json({ error: 'runNo 파라미터가 필요합니다' }, { status: 400 });

  const sql = `
    SELECT DISTINCT
           rb.ITEM_BARCODE                                  AS "reelCd",
           iss.ITEM_CODE                                    AS "itemCode",
           NVL(iss.MODEL_NAME, '-')                         AS "modelName",
           TO_CHAR(iss.ISSUE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS "issueDate",
           iss.ISSUE_QTY                                    AS "issueQty"
      FROM IM_ITEM_ISSUE iss
      JOIN IM_ITEM_RECEIPT_BARCODE rb
        ON rb.LOT_NO = iss.MATERIAL_MFS AND rb.ITEM_CODE = iss.ITEM_CODE
     WHERE iss.RUN_NO = :runNo
       AND iss.ISSUE_DEFICIT = '3'
       AND iss.LOT_DIVIDE_SEQUENCE IS NULL
     ORDER BY "issueDate" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { runNo });
  return NextResponse.json({ mode: 'run', candidates: rows, total: rows.length });
}

async function handleFeeder(sp: URLSearchParams) {
  const startDtFrom = sp.get('startDtFrom') ?? '';
  const startDtTo   = sp.get('startDtTo')   ?? '';
  const eqpNm       = sp.get('eqpNm')       ?? '';
  const feederSlot  = sp.get('feederSlot')  ?? '';
  if (!startDtFrom || !startDtTo || !eqpNm || !feederSlot) {
    return NextResponse.json({ error: 'startDtFrom, startDtTo, eqpNm, feederSlot 모두 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT CAST("ReelCd" AS VARCHAR2(200))                                      AS "reelCd",
           MAX(CAST("PartNo" AS VARCHAR2(100)))                                  AS "partNo",
           MAX(TRIM(CAST("SlotNo" AS VARCHAR2(50))))                             AS "slotNo",
           MAX(CAST("EqpNm" AS VARCHAR2(200)))                                   AS "eqpNm",
           TO_CHAR(MIN(CAST("StartDt" AS TIMESTAMP)), 'YYYY-MM-DD HH24:MI:SS')  AS "startDt"
      FROM HW_VW_LTS
     WHERE CAST("EqpNm" AS VARCHAR2(200)) = :eqpNm
       AND TRIM(CAST("SlotNo" AS VARCHAR2(50))) = :feederSlot
       AND CAST("StartDt" AS TIMESTAMP) >= TRUNC(TO_DATE(:startDtFrom, 'YYYY-MM-DD'))
       AND CAST("StartDt" AS TIMESTAMP) <  TRUNC(TO_DATE(:startDtTo,   'YYYY-MM-DD')) + 1
     GROUP BY CAST("ReelCd" AS VARCHAR2(200))
     ORDER BY "startDt" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { eqpNm, feederSlot, startDtFrom, startDtTo });
  return NextResponse.json({ mode: 'feeder', candidates: rows, total: rows.length });
}

async function handleRefId(sp: URLSearchParams) {
  const referenceId  = sp.get('referenceId')  ?? '';
  const startDtFrom  = sp.get('startDtFrom')  ?? '';
  const startDtTo    = sp.get('startDtTo')    ?? '';
  if (!referenceId || !startDtFrom || !startDtTo) {
    return NextResponse.json({ error: 'referenceId, startDtFrom, startDtTo 모두 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT CAST("ReelCd"      AS VARCHAR2(200)) AS "reelCd",
           MAX(CAST("ReferenceID" AS VARCHAR2(200))) AS "referenceId",
           TO_CHAR(MIN(CAST("StartDt" AS TIMESTAMP)), 'YYYY-MM-DD HH24:MI:SS') AS "startDt",
           MAX(CAST("PartNo"      AS VARCHAR2(100))) AS "partNo",
           MAX(CAST("EqpNm"       AS VARCHAR2(200))) AS "eqpNm",
           MAX(CAST("LineNm"      AS VARCHAR2(100))) AS "lineNm"
      FROM HW_VW_LTS
     WHERE CAST("ReferenceID" AS VARCHAR2(200)) = :referenceId
       AND CAST("StartDt" AS TIMESTAMP) >= TRUNC(TO_DATE(:startDtFrom, 'YYYY-MM-DD'))
       AND CAST("StartDt" AS TIMESTAMP) <  TRUNC(TO_DATE(:startDtTo,   'YYYY-MM-DD')) + 1
     GROUP BY CAST("ReelCd" AS VARCHAR2(200))
     ORDER BY "startDt" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { referenceId, startDtFrom, startDtTo });
  return NextResponse.json({ mode: 'refid', candidates: rows, total: rows.length });
}
