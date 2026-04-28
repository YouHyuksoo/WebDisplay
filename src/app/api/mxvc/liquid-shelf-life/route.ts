/**
 * @file src/app/api/mxvc/liquid-shelf-life/route.ts
 * @description 액형자재 유효기간 모니터링 API
 *
 * 초보자 가이드:
 * 1. IM_ITEM_INVENTORY(LOT 단위 재고) ⨝ ID_ITEM(품목 마스터)
 * 2. ITEM_CLASS = 'THERMAL INTERFACE MATERIAL' 만 대상
 * 3. INVENTORY_QTY > 0 + MANUFACTURE_DATE IS NOT NULL (집계 가능 LOT만)
 * 4. 잔여일자 = MANUFACTURE_DATE + LIFE_CYCLE - TRUNC(SYSDATE)
 * 5. 정렬: 잔여일자 ASC (만료 임박 우선)
 */
import { NextResponse, type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";
import type { LiquidShelfLifeResponse, LiquidShelfLifeRow } from "@/types/mxvc/liquid-shelf-life";
import { SHELF_LIFE_THRESHOLD } from "@/types/mxvc/liquid-shelf-life";

export const dynamic = "force-dynamic";

interface DbRow {
  ITEM_CODE: string;
  ITEM_NAME: string | null;
  LOT: string | null;
  RECEIPT_DATE: string | null;
  MANUFACTURE_DATE: string | null;
  LIFE_CYCLE: number | null;
  REMAINING_DAYS: number | null;
  INVENTORY_QTY: number | null;
}

/**
 * @param inStockOnly true면 INVENTORY_QTY > 0 인 LOT만 (실 재고 모니터링).
 *                    false면 LOT 이력 전체 (수량 0 포함, 만료 이력 추적).
 */
function buildSql(inStockOnly: boolean): string {
  const inStockClause = inStockOnly ? "AND inv.INVENTORY_QTY > 0" : "";
  return `
    SELECT inv.ITEM_CODE,
           item.ITEM_NAME,
           inv.MATERIAL_MFS                                AS LOT,
           TO_CHAR(inv.LAST_RECEIPT_DATE, 'YYYY-MM-DD')    AS RECEIPT_DATE,
           TO_CHAR(inv.MANUFACTURE_DATE,  'YYYY-MM-DD')    AS MANUFACTURE_DATE,
           item.LIFE_CYCLE,
           (TRUNC(inv.MANUFACTURE_DATE) + item.LIFE_CYCLE - TRUNC(SYSDATE)) AS REMAINING_DAYS,
           inv.INVENTORY_QTY
      FROM IM_ITEM_INVENTORY inv
      JOIN ID_ITEM           item ON inv.ITEM_CODE = item.ITEM_CODE
     WHERE item.ITEM_CLASS         = 'THERMAL INTERFACE MATERIAL'
       ${inStockClause}
       AND inv.MANUFACTURE_DATE    IS NOT NULL
       AND item.LIFE_CYCLE         IS NOT NULL
     ORDER BY REMAINING_DAYS ASC, inv.ITEM_CODE, inv.MATERIAL_MFS
  `;
}

export async function GET(request: NextRequest) {
  try {
    /* inStock=0 명시 시에만 false, 그 외(미지정/1)는 true (현행 default 유지) */
    const inStockOnly = request.nextUrl.searchParams.get("inStock") !== "0";
    const dbRows = await executeQuery<DbRow>(buildSql(inStockOnly), {});

    const rows: LiquidShelfLifeRow[] = dbRows.map((r) => ({
      ITEM_CODE: r.ITEM_CODE,
      ITEM_NAME: r.ITEM_NAME ?? "",
      LOT: r.LOT ?? "",
      RECEIPT_DATE: r.RECEIPT_DATE,
      MANUFACTURE_DATE: r.MANUFACTURE_DATE,
      LIFE_CYCLE: Number(r.LIFE_CYCLE ?? 0),
      REMAINING_DAYS: Number(r.REMAINING_DAYS ?? 0),
      INVENTORY_QTY: Number(r.INVENTORY_QTY ?? 0),
    }));

    /* 알람 카운트 — 만료 임박/만료 합계 + 만료만 */
    let warningCount = 0;
    let expiredCount = 0;
    for (const row of rows) {
      if (row.REMAINING_DAYS < SHELF_LIFE_THRESHOLD.EXPIRED) {
        expiredCount++;
        warningCount++;
      } else if (row.REMAINING_DAYS <= SHELF_LIFE_THRESHOLD.CRITICAL) {
        warningCount++;
      }
    }

    const body: LiquidShelfLifeResponse = {
      rows,
      warningCount,
      expiredCount,
      lastUpdated: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("MXVC Liquid Shelf Life API error:", error);
    return NextResponse.json(
      { error: "액형자재 유효기간 데이터 조회 실패", detail: String(error) },
      { status: 500 },
    );
  }
}
