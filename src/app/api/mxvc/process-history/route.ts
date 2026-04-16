/**
 * @file src/app/api/mxvc/process-history/route.ts
 * @description 공정통과이력 API — IQ_MACHINE_INSPECT_RESULT를 PID 행 + WORKSTAGE_CODE 열 피벗.
 *
 * 초보자 가이드:
 * 1. GET ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&isLast=Y|N|all
 * 2. raw 데이터 조회 후 서버 측 피벗 (Oracle 동적 PIVOT 회피)
 * 3. 각 PID에 대해 WORKSTAGE별 {MACHINE_CODE, INSPECT_RESULT, INSPECT_DATE}
 * 4. 최대 10000 rows 제한 (raw 기준, 피벗 후 DISTINCT PID 수)
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RawRow {
  PID: string;
  MODEL_NAME: string | null;
  WORKSTAGE_CODE: string;
  WORKSTAGE_NAME: string | null;
  MACHINE_CODE: string | null;
  INSPECT_RESULT: string | null;
  INSPECT_DATE: string | null;
}

interface PivotRow {
  PID: string;
  MODEL_NAME: string | null;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get('dateFrom')?.trim() ?? '';
  const dateTo   = sp.get('dateTo')?.trim()   ?? '';
  const isLast   = sp.get('isLast')?.trim()   ?? 'Y';
  const pid      = sp.get('pid')?.trim()      ?? '';

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom, dateTo 필수' }, { status: 400 });
  }

  const isLastClause = isLast === 'all' || isLast === ''
    ? ''
    : `AND t.IS_LAST = :isLast`;

  /* PID 부분 일치 (대소문자 무시) */
  const pidClause = pid ? `AND UPPER(t.PID) LIKE UPPER(:pidLike)` : '';

  /* INSPECT_DATE는 VARCHAR2 'YYYY/MM/DD HH24:MI:SS' — 입력 대시 → 슬래시 변환 */
  const fromSlash = dateFrom.replace(/-/g, '/');
  const toSlash   = dateTo.replace(/-/g, '/');
  const binds: Record<string, string> = { dateFrom: fromSlash, dateTo: toSlash };
  if (isLastClause) binds.isLast = isLast;
  if (pidClause)    binds.pidLike = `%${pid}%`;

  try {
    /* INSPECT_DATE는 VARCHAR2 'YYYY-MM-DD HH24:MI:SS' — 문자열 범위 비교 */
    const rows = await executeQuery<RawRow>(
      `SELECT t.PID,
              F_GET_MODEL_NAME_BY_PID(t.PID) AS MODEL_NAME,
              t.WORKSTAGE_CODE,
              NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), t.WORKSTAGE_CODE) AS WORKSTAGE_NAME,
              t.MACHINE_CODE,
              t.INSPECT_RESULT,
              t.INSPECT_DATE
         FROM IQ_MACHINE_INSPECT_RESULT t
        WHERE t.INSPECT_DATE BETWEEN :dateFrom || ' 00:00:00'
                                 AND :dateTo   || ' 23:59:59'
          ${isLastClause}
          ${pidClause}
          AND t.PID IS NOT NULL
        ORDER BY t.PID, t.INSPECT_DATE
        FETCH FIRST 10000 ROWS ONLY`,
      binds,
    );

    /* 서버 측 피벗 */
    const workstageMap = new Map<string, string>(); // code → name
    const pidMap = new Map<string, PivotRow>();

    for (const r of rows) {
      const pid = r.PID;
      const wc  = r.WORKSTAGE_CODE;
      if (!wc) continue;

      if (!workstageMap.has(wc)) {
        workstageMap.set(wc, r.WORKSTAGE_NAME ?? wc);
      }

      if (!pidMap.has(pid)) {
        pidMap.set(pid, { PID: pid, MODEL_NAME: r.MODEL_NAME });
      }
      const row = pidMap.get(pid)!;
      /* 같은 PID+WORKSTAGE가 여러 건이면 최신(ORDER BY INSPECT_DATE)이 뒤에 오므로 덮어씀 */
      row[`${wc}__MACHINE`] = r.MACHINE_CODE;
      row[`${wc}__RESULT`]  = r.INSPECT_RESULT;
      row[`${wc}__DATE`]    = r.INSPECT_DATE;
    }

    /* WORKSTAGE_CODE 오름차순 — ICT(W110) → DOWNLOAD(W130) → ... → EOL(W155) */
    const workstages = Array.from(workstageMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      workstages,
      rows: Array.from(pidMap.values()),
      totalRaw: rows.length,
      totalPids: pidMap.size,
    });
  } catch (err) {
    console.error('공정통과이력 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
