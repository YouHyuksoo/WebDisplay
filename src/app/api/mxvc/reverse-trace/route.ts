/**
 * @file src/app/api/mxvc/reverse-trace/route.ts
 * @description 멕시코전장 역추적 API — ReelCd(자재릴번호)로 사용된 PCB 조회
 *
 * 초보자 가이드:
 * 1. HW_VW_LTS 동의어 테이블 (SQL Server) 사용
 * 2. ReelCd 입력 → 해당 릴이 장착된 BoardSN 목록 + 상세 반환
 * 3. 컬럼명이 camelCase (SQL Server 동의어) — 대소문자 주의
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface LtsRow {
  BoardSN: string;
  StartDt: string;
  EndDt: string;
  PCBFileNm: string;
  JobOrderNo: string;
  StepNo: number;
  ReferenceID: string;
  ArrayIndex: number;
  BlockIndex: number;
  ReelCd: string;
  PartNo: string;
  SlotNo: string;
  EqpNm: string;
  LineNm: string;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const reelCd = sp.get('reelCd') ?? '';
  const mode = sp.get('mode') ?? 'summary';

  if (!reelCd.trim()) {
    return NextResponse.json({ error: 'reelCd 파라미터가 필요합니다' }, { status: 400 });
  }

  try {
    if (mode === 'detail') {
      return await handleDetail(reelCd, sp.get('boardSN') ?? '');
    }
    return await handleSummary(reelCd);
  } catch (err) {
    console.error('역추적 API 오류:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

/** 요약: 입고이력 + 출고이력 + 사용된 BoardSN 목록 병렬 조회 */
async function handleSummary(reelCd: string) {
  /* ReelCd에서 LOT_NO 추출: "품번-LOT-수량" 형식에서 두 번째 파트 */
  const parts = reelCd.split('-');
  const lotNo = parts.length >= 2 ? parts.slice(1, -1).join('-') : reelCd;

  const [receiptRows, issueRows, reelMasterRows, reelChangeRows, boardRows] = await Promise.all([
    /* 입고이력 */
    executeQuery(
      `SELECT ITEM_BARCODE, ITEM_CODE, LOT_NO, SCAN_DATE, SCAN_QTY,
              SUPPLIER_CODE, RECEIPT_SLIP_NO, BARCODE_STATUS, MANUFACTURE_DATE,
              MANUFACTURE_WEEK, VENDOR_LOTNO, INSPECT_RESULT
         FROM IM_ITEM_RECEIPT_BARCODE
        WHERE ITEM_BARCODE = :reelCd`,
      { reelCd },
    ),
    /* 출고이력 */
    executeQuery(
      `SELECT ISSUE_DATE, ITEM_CODE, MATERIAL_MFS, LINE_CODE, WORKSTAGE_CODE,
              ISSUE_QTY, ISSUE_STATUS, MODEL_NAME, ISSUE_TYPE, ENTER_DATE, ENTER_BY
         FROM IM_ITEM_ISSUE
        WHERE MATERIAL_MFS = :lotNo
          AND ISSUE_DEFICIT = '3'
          AND LOT_DIVIDE_SEQUENCE IS NULL
        ORDER BY ISSUE_DATE DESC`,
      { lotNo },
    ),
    /* 릴 투입이력 (HW_ITS_REEL, SQL Server 동의어 — 대소문자 주의) */
    executeQuery(
      `SELECT CAST("ReelCd" AS VARCHAR2(200)) AS "ReelCd",
              CAST("PartNo" AS VARCHAR2(100)) AS "PartNo",
              TO_NUMBER("CurrentCnt") AS "CurrentCnt",
              TO_NUMBER("InitCnt") AS "InitCnt",
              CAST("VendorNm" AS VARCHAR2(200)) AS "VendorNm",
              CAST("VendorLot" AS VARCHAR2(200)) AS "VendorLot",
              CAST("PartType" AS VARCHAR2(100)) AS "PartType",
              CAST("UseYN" AS VARCHAR2(20)) AS "UseYN",
              CAST("MSLLevel" AS VARCHAR2(20)) AS "MSLLevel",
              TO_NUMBER("MSLStatus") AS "MSLStatus",
              TO_NUMBER("RemainTime") AS "RemainTime",
              CAST("LastLoadDt" AS TIMESTAMP) AS "LastLoadDt",
              CAST("RegDt" AS TIMESTAMP) AS "RegDt",
              CAST("MSLUpdateTime" AS TIMESTAMP) AS "MSLUpdateTime",
              CAST("Memo" AS VARCHAR2(500)) AS "Memo"
         FROM HW_ITS_REEL
        WHERE "ReelCd" = :reelCd`,
      { reelCd },
    ),
    /* 릴교환이력 (HW_ITS_REELCHANGEHISTORY, SQL Server 동의어 — 대소문자 주의) */
    executeQuery(
      `SELECT TO_NUMBER("ReelChangeID") AS "ReelChangeID",
              CAST("ReelCd" AS VARCHAR2(200)) AS "ReelCd",
              CAST("PartNo" AS VARCHAR2(100)) AS "PartNo",
              CAST("FeederCd" AS VARCHAR2(100)) AS "FeederCd",
              CAST("FeederSlot" AS VARCHAR2(100)) AS "FeederSlot",
              CAST("EqpCd" AS VARCHAR2(100)) AS "EqpCd",
              CAST("ReelInstallDt" AS TIMESTAMP) AS "ReelInstallDt",
              CAST("ReelUninstallDt" AS TIMESTAMP) AS "ReelUninstallDt",
              TO_NUMBER("MapID") AS "MapID"
         FROM HW_ITS_REELCHANGEHISTORY
        WHERE "ReelCd" = :reelCd
        ORDER BY "ReelInstallDt" DESC`,
      { reelCd },
    ),
    /* 사용된 BoardSN */
    executeQuery(
      `SELECT * FROM (
         SELECT "BoardSN",
                MIN("StartDt") AS "StartDt",
                MAX("EndDt") AS "EndDt",
                MIN("PartNo") AS "PartNo",
                MIN("EqpNm") AS "EqpNm",
                MIN("LineNm") AS "LineNm",
                MIN("JobOrderNo") AS "JobOrderNo",
                COUNT(*) AS "StepCount"
           FROM HW_VW_LTS
          WHERE "ReelCd" = :reelCd
          GROUP BY "BoardSN"
       ) ORDER BY "StartDt" DESC`,
      { reelCd },
    ),
  ]);

  return NextResponse.json({
    reelCd,
    lotNo,
    receipt: sanitize(receiptRows as Record<string, unknown>[]),
    issues: sanitize(issueRows as Record<string, unknown>[]),
    reelMaster: sanitize(reelMasterRows as Record<string, unknown>[]),
    reelChanges: sanitize(reelChangeRows as Record<string, unknown>[]),
    boards: sanitize(boardRows as Record<string, unknown>[]),
    total: boardRows.length,
  });
}

/** 상세: 특정 BoardSN + ReelCd 조합의 전체 장착 내역 */
async function handleDetail(reelCd: string, boardSN: string) {
  if (!boardSN.trim()) {
    return NextResponse.json({ error: 'boardSN 파라미터가 필요합니다' }, { status: 400 });
  }

  const sql = `
    SELECT "BoardSN", "StartDt", "EndDt", "PCBFileNm", "JobOrderNo",
           "StepNo", "ReferenceID", "ArrayIndex", "BlockIndex",
           "ReelCd", "PartNo", "SlotNo", "EqpNm", "LineNm"
      FROM HW_VW_LTS
     WHERE "ReelCd" = :reelCd AND "BoardSN" = :boardSN
     ORDER BY "StepNo"`;

  const rows = await executeQuery(sql, { reelCd, boardSN });

  return NextResponse.json({
    reelCd,
    boardSN,
    details: sanitize(rows as Record<string, unknown>[]),
    total: rows.length,
  });
}

function sanitize(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) safe[k] = v.toISOString();
      else if (typeof v === 'bigint') safe[k] = Number(v);
      else if (typeof v === 'string') safe[k] = v.trim();
      else safe[k] = v;
    }
    return safe;
  });
}
