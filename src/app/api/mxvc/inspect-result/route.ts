/**
 * @file src/app/api/mxvc/inspect-result/route.ts
 * @description 설비호출저장이력 API — IQ_MACHINE_INSPECT_RESULT 검색
 * 초보자 가이드:
 * 1. mode=filters → 필터 드롭다운 옵션 반환 (LINE_CODE, MACHINE_CODE)
 * 2. 기본 → 날짜/키워드/필터 검색 + 서버 페이지네이션
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlInspectResultList,
  sqlInspectResultCount,
  sqlFilterOptions,
  buildKeywordClause,
  buildColumnFilters,
} from '@/lib/queries/inspect-result';
import type { InspectResultRow } from '@/lib/queries/inspect-result';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('mode') === 'filters') {
    try {
      const rows = await executeQuery<{ COL_TYPE: string; COL_VALUE: string; COL_LABEL: string | null }>(
        sqlFilterOptions(), {},
      );
      const lineCodeList: { value: string; label: string }[] = [];
      const machineCodeList: { value: string; label: string }[] = [];
      const workstageCodeList: { value: string; label: string }[] = [];
      for (const r of rows) {
        const item = { value: r.COL_VALUE, label: r.COL_LABEL ?? r.COL_VALUE };
        if (r.COL_TYPE === 'LINE_CODE') lineCodeList.push(item);
        else if (r.COL_TYPE === 'MACHINE_CODE') machineCodeList.push(item);
        else if (r.COL_TYPE === 'WORKSTAGE_CODE') workstageCodeList.push(item);
      }
      return NextResponse.json({ lineCodeList, machineCodeList, workstageCodeList });
    } catch (error) {
      console.error('[API inspect-result] Filters error:', error);
      return NextResponse.json({ error: String(error), lineCodeList: [], machineCodeList: [], workstageCodeList: [] }, { status: 500 });
    }
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const fromDate = (searchParams.get('fromDate') ?? today).replace(/-/g, '/');
  const toDate = (searchParams.get('toDate') ?? today).replace(/-/g, '/');
  const keyword = searchParams.get('keyword') ?? '';
  const lineCode = searchParams.get('lineCode') ?? '';
  const machineCode = searchParams.get('machineCode') ?? '';
  const workstageCode = searchParams.get('workstageCode') ?? '';
  const isLast = searchParams.get('isLast') ?? '';
  const sortCol = searchParams.get('sortCol') ?? 'INSPECT_DATE';
  const sortDir = (searchParams.get('sortDir') ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' as const : 'DESC' as const;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(200, Math.max(10, Number(searchParams.get('pageSize') ?? '50')));

  const startRow = (page - 1) * pageSize;
  const endRow = page * pageSize;

  const { clause: kwClause, binds: kwBinds } = buildKeywordClause(keyword || undefined);
  const { clause: colClause, binds: colBinds } = buildColumnFilters({
    lineCode: lineCode || undefined,
    machineCode: machineCode || undefined,
    workstageCode: workstageCode || undefined,
    isLast: isLast || undefined,
  });
  const extraClause = kwClause + colClause;
  const extraBinds = { ...kwBinds, ...colBinds };

  try {
    const [countResult, rows] = await Promise.all([
      executeQuery<{ TOTAL_COUNT: number }>(
        sqlInspectResultCount(extraClause),
        { fromDate, toDate, ...extraBinds },
      ),
      executeQuery<InspectResultRow>(
        sqlInspectResultList(extraClause, sortCol, sortDir),
        { fromDate, toDate, startRow, endRow, ...extraBinds },
      ),
    ]);

    const totalCount = countResult[0]?.TOTAL_COUNT ?? 0;

    return NextResponse.json({
      rows,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API inspect-result] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', rows: [], totalCount: 0, page: 1, pageSize, totalPages: 0 },
      { status: 500 },
    );
  }
}
