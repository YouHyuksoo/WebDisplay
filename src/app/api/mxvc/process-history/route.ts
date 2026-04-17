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

/**
 * RATING_LABEL 완전일치로 IP_PRODUCT_2D_BARCODE 에서 SERIAL_NO 목록을 조회한다.
 * 같은 라벨에 Top(T) / Bottom(B) 면이 각각 등록되어 복수 건이 반환될 수 있음.
 * PCB_ITEM 은 'T'=Top / 'B'=Bottom / 'S'=PBA 등 코드값.
 *
 * **SMT 공정 확장**:
 * SPI/AOI/COATING1/COATING2/COATINGVISION 등 SMT 단계는 TOP/BOT 면이 각각
 * 별도 SERIAL_NO 로 기록되므로, IP_PRODUCT_2D_BARCODE 에 한쪽(주로 Top)만
 * 등록되어 있어도 누락되지 않도록 `F_GET_SMT_BOT_2_TOP(topSerial)` 로
 * 상대 면 SERIAL_NO 를 도출해 결과에 합류한다.
 */
async function fetchLabelSerials(
  label: string,
): Promise<Array<{ serial: string; side: string | null }>> {
  const rows = await executeQuery<{ SERIAL_NO: string | null; PCB_ITEM: string | null }>(
    `SELECT SERIAL_NO, PCB_ITEM
       FROM IP_PRODUCT_2D_BARCODE
      WHERE RATING_LABEL = :label
        AND SERIAL_NO IS NOT NULL
      ORDER BY PCB_ITEM, SERIAL_NO`,
    { label },
  );
  const map = new Map<string, { serial: string; side: string | null }>();
  for (const r of rows) {
    if (!r.SERIAL_NO) continue;
    map.set(r.SERIAL_NO, { serial: r.SERIAL_NO, side: r.PCB_ITEM });
  }

  /* F_GET_SMT_BOT_2_TOP(topSerial) → BOT 자동 도출. 이미 존재하면 중복 제거. */
  const originals = Array.from(map.values());
  for (const o of originals) {
    const bot = await fetchBotFromTop(o.serial);
    if (bot && bot !== o.serial && !map.has(bot)) {
      map.set(bot, { serial: bot, side: 'B' });
    }
  }
  return Array.from(map.values());
}

/** TOP SERIAL_NO → BOT SERIAL_NO (F_GET_SMT_BOT_2_TOP). 실패/동일 시 null. */
async function fetchBotFromTop(topSerial: string): Promise<string | null> {
  try {
    const r = await executeQuery<{ BOT: string | null }>(
      `SELECT F_GET_SMT_BOT_2_TOP(:t) AS BOT FROM DUAL`,
      { t: topSerial },
    );
    const bot = r[0]?.BOT;
    if (!bot || bot === topSerial) return null;
    return bot;
  } catch {
    return null;
  }
}

interface RawRow {
  PID: string;
  MODEL_NAME: string | null;
  RATING_LABEL: string | null;
  PCB_ITEM: string | null;          // IP_PRODUCT_2D_BARCODE.PCB_ITEM — 'T'=Top, 'B'=Bottom, 'S'=PBA
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
  PCB_ITEM: string | null;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const dateFrom    = sp.get('dateFrom')?.trim()    ?? '';
  const dateTo      = sp.get('dateTo')?.trim()      ?? '';
  const isLast      = sp.get('isLast')?.trim()      ?? 'Y';
  /* 입력 우선순위 (상→하):
     1) ratingLabel (완전일치) → IP_PRODUCT_2D_BARCODE Top+Bot 모두 조회
     2) topSerial   (완전일치) → TOP + F_GET_SMT_BOT_2_TOP(topSerial) 로 BOT 자동 도출
     3) botSerial   (완전일치) → BOT 단독 조회
     4) serialNo    (부분일치, 하위호환) → LIKE
     하위호환 `pid` 는 serialNo 로 매핑. */
  let   ratingLabel = (sp.get('ratingLabel') ?? '').trim();
  let   topSerial   = (sp.get('topSerial')   ?? '').trim();
  let   botSerial   = (sp.get('botSerial')   ?? '').trim();
  let   serialNo    = (sp.get('serialNo') ?? sp.get('pid') ?? '').trim();
  const mode        = sp.get('mode')?.trim()        ?? 'pivot';

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom, dateTo 필수' }, { status: 400 });
  }

  /* INSPECT_DATE는 VARCHAR2 'YYYY/MM/DD HH24:MI:SS' — 입력 대시 → 슬래시 변환 */
  const fromSlash = dateFrom.replace(/-/g, '/');
  const toSlash   = dateTo.replace(/-/g, '/');

  try {
    /* 입력 우선순위:
       1) ratingLabel → fetchLabelSerials (Top+Bot 자동 합류)
       2) topSerial   → TOP + F_GET_SMT_BOT_2_TOP(TOP) 로 BOT 도출
       3) botSerial   → BOT 단독
       4) serialNo    → RATING_LABEL 자동 폴백 시도 후 실패 시 LIKE */
    let resolvedSerials: Array<{ serial: string; side: string | null }> = [];
    if (ratingLabel) {
      resolvedSerials = await fetchLabelSerials(ratingLabel);
    } else if (topSerial || botSerial) {
      /* UI 가 미리 resolve 해서 topSerial+botSerial 둘 다 채워 보낸 경우엔
         함수 재호출 없이 그대로 IN 절로 사용. topSerial 만 있으면 BOT 자동. */
      if (topSerial) resolvedSerials.push({ serial: topSerial, side: 'T' });
      if (botSerial && !resolvedSerials.some((r) => r.serial === botSerial)) {
        resolvedSerials.push({ serial: botSerial, side: 'B' });
      }
      if (topSerial && !botSerial) {
        const bot = await fetchBotFromTop(topSerial);
        if (bot && !resolvedSerials.some((r) => r.serial === bot)) {
          resolvedSerials.push({ serial: bot, side: 'B' });
        }
      }
    } else if (serialNo) {
      /* 하위호환: serialNo 값이 사실 RATING_LABEL 일 수도 있음. */
      const fallback = await fetchLabelSerials(serialNo);
      if (fallback.length > 0) {
        ratingLabel     = serialNo;
        resolvedSerials = fallback;
        serialNo        = '';
      }
    }

    const isLastClause = isLast === 'all' || isLast === ''
      ? ''
      : `AND t.IS_LAST = :isLast`;

    /* PID 필터: resolvedSerials 있으면 IN 절, 아니면 serialNo LIKE */
    let pidClause = '';
    const binds: Record<string, string> = { dateFrom: fromSlash, dateTo: toSlash };
    if (isLastClause) binds.isLast = isLast;

    if (resolvedSerials.length > 0) {
      const bindNames = resolvedSerials.map((_, i) => `:sn${i}`);
      pidClause = `AND t.PID IN (${bindNames.join(',')})`;
      resolvedSerials.forEach((r, i) => { binds[`sn${i}`] = r.serial; });
    } else if (serialNo) {
      pidClause = `AND UPPER(t.PID) LIKE UPPER(:pidLike)`;
      binds.pidLike = `%${serialNo}%`;
    }

    /* INSPECT_DATE는 VARCHAR2 'YYYY-MM-DD HH24:MI:SS' — 문자열 범위 비교.
       IP_PRODUCT_2D_BARCODE LEFT JOIN 으로 각 PID 의 RATING_LABEL 를 함께 조회.
       JOIN 은 PID = SERIAL_NO 일치 기준. 라벨이 없는 PID 도 행은 유지(LEFT). */
    const rows = await executeQuery<RawRow>(
      `SELECT t.PID,
              F_GET_MODEL_NAME_BY_PID(t.PID) AS MODEL_NAME,
              b.RATING_LABEL,
              b.PCB_ITEM,
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

      /* QC 조회: resolvedSerials 있으면 IN 절, serialNo 있으면 LIKE */
      const pids = [...new Set(rows.map((r) => r.PID))];
      let qcRows: Record<string, unknown>[] = [];
      const hasFilter = resolvedSerials.length > 0 || !!serialNo;
      if (pids.length > 0 && hasFilter) {
        let qcWhere = '';
        const qcBinds: Record<string, string> = {};
        if (resolvedSerials.length > 0) {
          const bindNames = resolvedSerials.map((_, i) => `:qsn${i}`);
          qcWhere = `SERIAL_NO IN (${bindNames.join(',')})`;
          resolvedSerials.forEach((r, i) => { qcBinds[`qsn${i}`] = r.serial; });
        } else {
          qcWhere = `UPPER(SERIAL_NO) LIKE UPPER(:pidLike)`;
          qcBinds.pidLike = `%${serialNo}%`;
        }
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
            WHERE ${qcWhere}
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
          PCB_ITEM: r.PCB_ITEM,
          WORKSTAGE_CODE: r.WORKSTAGE_CODE,
          WORKSTAGE_NAME: r.WORKSTAGE_NAME,
          MACHINE_CODE: r.MACHINE_CODE,
          INSPECT_RESULT: r.INSPECT_RESULT,
          INSPECT_DATE: r.INSPECT_DATE,
          IS_LAST: r.IS_LAST,
        })),
        qcRows,
        totalRaw: rows.length,
        ratingLabel: ratingLabel || null,
        resolvedSerials,
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
        pidMap.set(pid, {
          PID: pid,
          MODEL_NAME: r.MODEL_NAME,
          RATING_LABEL: r.RATING_LABEL,
          PCB_ITEM: r.PCB_ITEM,
        });
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
      ratingLabel: ratingLabel || null,
      resolvedSerials,
    });
  } catch (err) {
    console.error('공정통과이력 조회 실패:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
