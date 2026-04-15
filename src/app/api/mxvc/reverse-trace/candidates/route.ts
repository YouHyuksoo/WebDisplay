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
    return NextResponse.json({ error: 'mode 파라미터가 필요합니다 (issue | run | feeder)' }, { status: 400 });
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
     ORDER BY "issueDate" DESC
     FETCH FIRST 500 ROWS ONLY`;

  const rows = await executeQuery(sql, { runNo });
  return NextResponse.json({ mode: 'run', candidates: rows, total: rows.length });
}

async function handleFeeder(sp: URLSearchParams) {
  const date     = sp.get('date')     ?? '';
  const eqpCd    = sp.get('eqpCd')    ?? '';
  const feederCd = sp.get('feederCd') ?? '';
  if (!date || !eqpCd || !feederCd) {
    return NextResponse.json({ error: 'date, eqpCd, feederCd 모두 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT DISTINCT
           CAST("ReelCd" AS VARCHAR2(200))                                  AS "reelCd",
           CAST("PartNo" AS VARCHAR2(100))                                  AS "partNo",
           TO_CHAR(CAST("ReelInstallDt" AS TIMESTAMP), 'YYYY-MM-DD HH24:MI:SS')   AS "installDt",
           TO_CHAR(CAST("ReelUninstallDt" AS TIMESTAMP), 'YYYY-MM-DD HH24:MI:SS') AS "uninstallDt"
      FROM HW_ITS_REELCHANGEHISTORY
     WHERE "EqpCd"    = :eqpCd
       AND "FeederCd" = :feederCd
       AND "ReelInstallDt" < TRUNC(TO_DATE(:targetDate, 'YYYY-MM-DD')) + 1
       AND ( "ReelUninstallDt" IS NULL
             OR "ReelUninstallDt" >= TRUNC(TO_DATE(:targetDate, 'YYYY-MM-DD')) )
     ORDER BY "installDt" DESC`;

  const rows = await executeQuery(sql, { eqpCd, feederCd, targetDate: date });
  return NextResponse.json({ mode: 'feeder', candidates: rows, total: rows.length });
}
