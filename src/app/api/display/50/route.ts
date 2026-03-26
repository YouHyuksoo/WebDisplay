/**
 * @file route.ts
 * @description 설비 로그 검색 API (메뉴 50). SVEHICLEPDB 인스턴스 접속.
 * 초보자 가이드: GET /api/display/50?fromDate=2026-03-01&toDate=2026-03-27&keyword=test&addr=MOBIS&lineCode=51&page=1&pageSize=50
 * ICOM_WEB_SERVICE_LOG 테이블에서 날짜/키워드/개별필터로 검색하고 페이지네이션 결과를 반환한다.
 * mode=filters 파라미터로 필터 드롭다운용 고유값 목록을 조회할 수 있다.
 */
import { NextResponse } from 'next/server';
import { executeQueryByProfile } from '@/lib/db';
import {
  sqlEquipmentLogList,
  sqlEquipmentLogCount,
  sqlFilterOptions,
  buildKeywordClause,
  buildColumnFilters,
} from '@/lib/queries/equipment-log';
import type { EquipmentLogRow } from '@/lib/queries/equipment-log';

/** SVEHICLEPDB 프로필 이름 (database.json에 등록) */
const DB_PROFILE = 'SVEHICLEPDB';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  /* 필터 옵션(고유값) 조회 모드 */
  if (searchParams.get('mode') === 'filters') {
    try {
      const rows = await executeQueryByProfile<{ COL_TYPE: string; COL_VALUE: string; COL_LABEL: string | null }>(
        DB_PROFILE, sqlFilterOptions(), {},
      );
      const addrList: { value: string; label: string }[] = [];
      const lineCodeList: { value: string; label: string }[] = [];
      for (const r of rows) {
        const item = { value: r.COL_VALUE, label: r.COL_LABEL ?? r.COL_VALUE };
        if (r.COL_TYPE === 'ADDR') addrList.push(item);
        else if (r.COL_TYPE === 'LINE_CODE') lineCodeList.push(item);
      }
      return NextResponse.json({ addrList, lineCodeList });
    } catch (error) {
      console.error('[API /display/50] Filters error:', error);
      return NextResponse.json({ error: String(error), addrList: [], lineCodeList: [] }, { status: 500 });
    }
  }

  /* 로그 검색 모드 */
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = searchParams.get('fromDate') ?? today;
  const toDate = searchParams.get('toDate') ?? today;
  const keyword = searchParams.get('keyword') ?? '';
  const addr = searchParams.get('addr') ?? '';
  const lineCode = searchParams.get('lineCode') ?? '';
  const workstageCode = searchParams.get('workstageCode') ?? '';
  const sortCol = searchParams.get('sortCol') ?? 'CALL_DATE';
  const sortDir = (searchParams.get('sortDir') ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' as const : 'DESC' as const;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(200, Math.max(10, Number(searchParams.get('pageSize') ?? '50')));

  const startRow = (page - 1) * pageSize;
  const endRow = page * pageSize;

  const { clause: kwClause, binds: kwBinds } = buildKeywordClause(keyword || undefined);
  const { clause: colClause, binds: colBinds } = buildColumnFilters({
    addr: addr || undefined,
    lineCode: lineCode || undefined,
    workstageCode: workstageCode || undefined,
  });
  const extraClause = kwClause + colClause;
  const extraBinds = { ...kwBinds, ...colBinds };

  try {
    const [countResult, logList] = await Promise.all([
      executeQueryByProfile<{ TOTAL_COUNT: number }>(
        DB_PROFILE,
        sqlEquipmentLogCount(extraClause),
        { fromDate, toDate, ...extraBinds },
      ),
      executeQueryByProfile<EquipmentLogRow>(
        DB_PROFILE,
        sqlEquipmentLogList(extraClause, sortCol, sortDir),
        { fromDate, toDate, startRow, endRow, ...extraBinds },
      ),
    ]);

    const totalCount = countResult[0]?.TOTAL_COUNT ?? 0;

    return NextResponse.json({
      logList,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/50] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', logList: [], totalCount: 0, page: 1, pageSize, totalPages: 0 },
      { status: 500 },
    );
  }
}
