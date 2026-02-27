/**
 * @file route.ts
 * @description SMD 기계 상태 API (메뉴 24).
 * 초보자 가이드: GET /api/display/24?orgId=1 로 호출하면 SMD 점검 항목과 기계 상태를 반환한다.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  SQL_CHECK_ITEMS,
  SQL_MACHINE_STATUS,
} from '@/lib/queries/machine-status-smd';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';

  try {
    const [checkItems, machineStatus] = await Promise.all([
      executeQuery(SQL_CHECK_ITEMS, { orgId: Number(orgId) }),
      executeQuery(SQL_MACHINE_STATUS, { orgId: Number(orgId) }),
    ]);

    return NextResponse.json({
      checkItems,
      machineStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/24] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', checkItems: [], machineStatus: [] },
      { status: 500 },
    );
  }
}
