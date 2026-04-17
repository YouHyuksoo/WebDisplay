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
  RATING_LABEL: string | null;
  WORKSTAGE_CODE: string;
  WORKSTAGE_NAME: string | null;
  MACHINE_CODE: string | null;
  INSPECT_RESULT: string | null;
  INSPECT_DATE: string | null;
  IS_LAST: string | null;
}

interface PivotRow {
  PID: string;
  MODEL_NAME: string | null;
  RATING_LABEL: string | null;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get('dateFrom')?.trim() ?? '';
  const dateTo   = sp.get('dateTo')?.trim()   ?? '';
  const isLast   = sp.get('isLast')?.trim()   ?? 'Y';
  let   pid      = sp.get('pid')?.trim()      ?? '';
  const mode     = sp.get('mode')?.trim()     ?? 'pivot';

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom, dateTo 필수' }, { status: 400 });
  }

  /* INSPECT_DATE는 VARCHAR2 'YYYY/MM/DD HH24:MI:SS' — 입력 대시 → 슬래시 변환 */
  const fromSlash = dateFrom.replace(/-/g, '/');
  const toSlash   = dateTo.replace(/-/g, '/');

  try {
    /* RATING_LABEL → SERIAL_NO 변환:
       사용자가 완제품 바코드(RATING_LABEL)를 붙여넣은 경우
       IP_PRODUCT_2D_BARCODE 에서 매칭되는 SERIAL_NO를 찾아 내부 조회에 사용.
       완전 일치로만 시도 — 부분 입력은 기존 LIKE 동작 유지. */
    let resolvedLabel: { originalLabel: string; resolvedSerial: string } | null = null;
    if (pid) {
      const labelMatch = await executeQuery<{ SERIAL_NO: string | null }>(
        `SELECT SERIAL_NO
           FROM IP_PRODUCT_2D_BARCODE
          WHERE RATING_LABEL = :label
            AND SERIAL_NO IS NOT NULL
            AND ROWNUM = 1`,
        { label: pid },
      );
      const sn = labelMatch[0]?.SERIAL_NO;
      if (sn) {
        resolvedLabel = { originalLabel: pid, resolvedSerial: sn };
        pid = sn;
      }
    }

    const isLastClause = isLast === 'all' || isLast === ''
      ? ''
      : `AND t.IS_LAST = :isLast`;

    /* PID 부분 일치 (대소문자 무시) */
    const pidClause = pid ? `AND UPPER(t.PID) LIKE UPPER(:pidLike)` : '';

    const binds: Record<string, string> = { dateFrom: fromSlash, dateTo: toSlash };
    if (isLastClause) binds.isLast = isLast;
    if (pidClause)    binds.pidLike = `%${pid}%`;

    /* INSPECT_DATE는 VARCHAR2 'YYYY-MM-DD HH24:MI:SS' — 문자열 범위 비교.
       IP_PRODUCT_2D_BARCODE LEFT JOIN 으로 각 PID 의 RATING_LABEL 를 함께 조회.
       JOIN 은 PID = SERIAL_NO 일치 기준. 라벨이 없는 PID 도 행은 유지(LEFT). */
    const rows = await executeQuery<RawRow>(
      `SELECT t.PID,
              F_GET_MODEL_NAME_BY_PID(t.PID) AS MODEL_NAME,
              b.RATING_LABEL,
              t.WORKSTAGE_CODE,
              NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), t.WORKSTAGE_CODE) AS WORKSTAGE_NAME,
              t.MACHINE_CODE,
              t.INSPECT_RESULT,
              t.INSPECT_DATE,
              t.IS_LAST
         FROM IQ_MACHINE_INSPECT_RESULT t
         LEFT JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
        WHERE t.INSPECT_DATE BETWEEN :dateFrom || ' 00:00:00'
                                 AND :dateTo   || ' 23:59:59'
          ${isLastClause}
          ${pidClause}
          AND t.PID IS NOT NULL
        ORDER BY t.PID, t.INSPECT_DATE
        FETCH FIRST 10000 ROWS ONLY`,
      binds,
    );

    /* ── list 모드: raw 데이터를 공정별 그룹으로 반환 + QC 데이터 ── */
    if (mode === 'list') {
      const wsMap = new Map<string, string>();
      for (const r of rows) {
        if (r.WORKSTAGE_CODE && !wsMap.has(r.WORKSTAGE_CODE)) {
          wsMap.set(r.WORKSTAGE_CODE, r.WORKSTAGE_NAME ?? r.WORKSTAGE_CODE);
        }
      }
      const workstages = Array.from(wsMap.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.code.localeCompare(b.code));

      /* PID 목록으로 IP_PRODUCT_WORK_QC 조회 */
      const pids = [...new Set(rows.map((r) => r.PID))];
      let qcRows: Record<string, unknown>[] = [];
      if (pids.length > 0 && pid) {
        const qcBinds: Record<string, string> = { pidLike: `%${pid}%` };
        qcRows = await executeQuery<Record<string, unknown>>(
          `SELECT SERIAL_NO,
                  WORKSTAGE_CODE,
                  MACHINE_CODE,
                  QC_RESULT,
                  TO_CHAR(QC_DATE, 'YYYY/MM/DD HH24:MI:SS') AS QC_DATE,
                  BAD_REASON_CODE,
                  BAD_POSITION,
                  LOCATION_CODE,
                  REPAIR_RESULT_CODE,
                  TO_CHAR(REPAIR_DATE, 'YYYY/MM/DD HH24:MI:SS') AS REPAIR_DATE,
                  FILE_NAME
             FROM IP_PRODUCT_WORK_QC
            WHERE UPPER(SERIAL_NO) LIKE UPPER(:pidLike)
            ORDER BY SERIAL_NO, QC_DATE
            FETCH FIRST 5000 ROWS ONLY`,
          qcBinds,
        );
      }

      return NextResponse.json({
        mode: 'list',
        workstages,
        rows: rows.map((r) => ({
          PID: r.PID,
          MODEL_NAME: r.MODEL_NAME,
          RATING_LABEL: r.RATING_LABEL,
          WORKSTAGE_CODE: r.WORKSTAGE_CODE,
          WORKSTAGE_NAME: r.WORKSTAGE_NAME,
          MACHINE_CODE: r.MACHINE_CODE,
          INSPECT_RESULT: r.INSPECT_RESULT,
          INSPECT_DATE: r.INSPECT_DATE,
          IS_LAST: r.IS_LAST,
        })),
        qcRows,
        totalRaw: rows.length,
        resolvedLabel,
      });
    }

    /* ── pivot 모드 (기본) ── */
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
        pidMap.set(pid, { PID: pid, MODEL_NAME: r.MODEL_NAME, RATING_LABEL: r.RATING_LABEL });
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
      mode: 'pivot',
      workstages,
      rows: Array.from(pidMap.values()),
      totalRaw: rows.length,
      totalPids: pidMap.size,
      resolvedLabel,
    });
  } catch (err) {
    console.error('공정통과이력 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
