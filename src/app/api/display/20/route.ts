/**
 * @file route.ts
 * @description 생산계획등록 CRUD API (메뉴 20).
 * 초보자 가이드:
 * - GET  /api/display/20?orgId=1&planDateFrom=2026-03-01&planDateTo=2026-03-31&lineCode=S01 → 기간+라인 조회
 * - POST /api/display/20 (body JSON) → 신규 등록
 * - PUT  /api/display/20 (body JSON) → 수정
 * - DELETE /api/display/20?planDate=...&lineCode=...&orgId=... → 삭제
 * PB 원본: IP_PRODUCT_LINE_TARGET 테이블 CRUD
 */
import { NextResponse } from 'next/server';
import { executeQuery, executeDml } from '@/lib/db';

/** ---------- GET — 계획 목록 조회 ---------- */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const planDateFrom = searchParams.get('planDateFrom') ?? null;
  const planDateTo = searchParams.get('planDateTo') ?? null;
  const lineCode = searchParams.get('lineCode') ?? null;
  // 하위호환: 단일 날짜 파라미터도 지원
  const planDate = searchParams.get('planDate') ?? null;

  const sql = `
    SELECT t.PLAN_DATE, t.LINE_CODE,
           F_GET_LINE_NAME(t.LINE_CODE, 1) AS LINE_NAME,
           t.SHIFT_CODE, t.MODEL_NAME, t.ITEM_CODE,
           t.UPH, t.PLAN_QTY, t.WORKER_QTY, t.COMMENTS,
           t.LEADER_ID, t.SUB_LEADER_ID,
           NVL(leader.USER_NAME, t.LEADER_ID)       AS LEADER_NAME,
           NVL(sub_leader.USER_NAME, t.SUB_LEADER_ID) AS SUB_LEADER_NAME,
           t.ENTER_DATE, t.ENTER_BY
      FROM IP_PRODUCT_LINE_TARGET t
      LEFT JOIN ISYS_USERS leader     ON leader.USER_ID     = t.LEADER_ID
      LEFT JOIN ISYS_USERS sub_leader ON sub_leader.USER_ID = t.SUB_LEADER_ID
     WHERE t.ORGANIZATION_ID = :orgId
       AND ((:planDateFrom IS NULL AND :planDateTo IS NULL AND :planDate IS NULL)
            OR (:planDate IS NOT NULL AND t.PLAN_DATE = TO_DATE(:planDate, 'YYYY-MM-DD'))
            OR (:planDateFrom IS NOT NULL AND :planDateTo IS NOT NULL
                AND t.PLAN_DATE BETWEEN TO_DATE(:planDateFrom, 'YYYY-MM-DD')
                                    AND TO_DATE(:planDateTo,   'YYYY-MM-DD')))
       AND (:lineCode IS NULL OR t.LINE_CODE = :lineCode)
     ORDER BY t.PLAN_DATE DESC, t.LINE_CODE`;

  try {
    const rows = await executeQuery(sql, { orgId, planDateFrom, planDateTo, planDate, lineCode });
    return NextResponse.json({ rows, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[API /display/20 GET] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', rows: [] },
      { status: 500 },
    );
  }
}

/** ---------- POST — 신규 등록 ---------- */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sql = `
      INSERT INTO IP_PRODUCT_LINE_TARGET (
        PLAN_DATE, LINE_CODE, SHIFT_CODE, PLAN_QTY, UPH,
        MODEL_NAME, ITEM_CODE, WORKER_QTY, COMMENTS,
        LEADER_ID, SUB_LEADER_ID, ORGANIZATION_ID, ENTER_DATE, ENTER_BY
      ) VALUES (
        TO_DATE(:planDate, 'YYYY-MM-DD'), :lineCode, :shiftCode, :planQty, :uph,
        :modelName, :itemCode, :workerQty, :comments,
        :leaderId, :subLeaderId, :orgId, SYSDATE, :enterBy
      )`;

    const result = await executeDml(sql, {
      planDate: body.planDate,
      lineCode: body.lineCode,
      shiftCode: body.shiftCode,
      planQty: Number(body.planQty) || 0,
      uph: Number(body.uph) || 0,
      modelName: body.modelName ?? null,
      itemCode: body.itemCode ?? null,
      workerQty: Number(body.workerQty) || 0,
      comments: body.comments ?? null,
      leaderId: body.leaderId ?? null,
      subLeaderId: body.subLeaderId ?? null,
      orgId: body.orgId ?? '1',
      enterBy: body.enterBy ?? 'SYSTEM',
    });

    return NextResponse.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (error) {
    console.error('[API /display/20 POST] Error:', error);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }
}

/** ---------- PUT — 수정 ---------- */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const sql = `
      UPDATE IP_PRODUCT_LINE_TARGET SET
        SHIFT_CODE=:shiftCode, PLAN_QTY=:planQty, UPH=:uph,
        MODEL_NAME=:modelName, ITEM_CODE=:itemCode, WORKER_QTY=:workerQty,
        COMMENTS=:comments, LEADER_ID=:leaderId, SUB_LEADER_ID=:subLeaderId,
        LAST_MODIFY_DATE=SYSDATE, LAST_MODIFY_BY=:modifyBy
      WHERE PLAN_DATE=TO_DATE(:planDate,'YYYY-MM-DD')
        AND LINE_CODE=:lineCode
        AND ORGANIZATION_ID=:orgId`;

    const result = await executeDml(sql, {
      shiftCode: body.shiftCode,
      planQty: Number(body.planQty) || 0,
      uph: Number(body.uph) || 0,
      modelName: body.modelName ?? null,
      itemCode: body.itemCode ?? null,
      workerQty: Number(body.workerQty) || 0,
      comments: body.comments ?? null,
      leaderId: body.leaderId ?? null,
      subLeaderId: body.subLeaderId ?? null,
      modifyBy: body.modifyBy ?? 'SYSTEM',
      planDate: body.planDate,
      lineCode: body.lineCode,
      orgId: body.orgId ?? '1',
    });

    return NextResponse.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (error) {
    console.error('[API /display/20 PUT] Error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

/** ---------- DELETE — 삭제 ---------- */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const planDate = searchParams.get('planDate');
  const lineCode = searchParams.get('lineCode');
  const orgId = searchParams.get('orgId') ?? '1';

  if (!planDate || !lineCode) {
    return NextResponse.json(
      { error: 'planDate and lineCode are required' },
      { status: 400 },
    );
  }

  try {
    const sql = `
      DELETE FROM IP_PRODUCT_LINE_TARGET
       WHERE PLAN_DATE=TO_DATE(:planDate,'YYYY-MM-DD')
         AND LINE_CODE=:lineCode
         AND ORGANIZATION_ID=:orgId`;

    const result = await executeDml(sql, { planDate, lineCode, orgId });
    return NextResponse.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (error) {
    console.error('[API /display/20 DELETE] Error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
