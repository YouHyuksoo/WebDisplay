/**
 * @file src/app/api/mxvc/post-process/route.ts
 * @description 멕시코전장 후공정생산현황 통합 API
 * 초보자 가이드:
 * 1. GET /api/mxvc/post-process?dateFrom=&dateTo=&lines=&orgId=
 * 2. 생산계획/불량/재검사/수리/FPY차트/매거진 6종 데이터를 Promise.all 병렬 실행
 * 3. executeQuery는 활성 프로필(멕시코전장외부 = SVEHICLEPDBEXT)에서 실행
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { buildLineFilter } from '@/lib/queries/production-kpi';
import {
  POST_PROCESS_TABLES,
  type PostProcessTableKey,
  buildTimeWhere,
  sqlTableStats,
  sqlTableFpyHourly,
  sqlQcStats,
  sqlMagazine,
  sqlProductionKpiAgg,
} from '@/lib/queries/post-process';
import type {
  PostProcessResponse,
  PostProcessKpi,
  PostProcessFpyRow,
  PostProcessMagazineRow,
} from '@/types/mxvc/post-process';

export const dynamic = 'force-dynamic';

/** 단일 테이블 불량/재검 통계 — 오류 시 0 반환 */
async function fetchTableStats(
  key: PostProcessTableKey,
  timeWhere: string,
  binds: Record<string, string>,
) {
  try {
    const rows = await executeQuery<{ TOTAL_BC: number; FAIL_BC: number; RETEST_BC: number }>(
      sqlTableStats(key, timeWhere),
      binds,
    );
    const r = rows[0] ?? { TOTAL_BC: 0, FAIL_BC: 0, RETEST_BC: 0 };
    return { total: r.TOTAL_BC, fail: r.FAIL_BC, retest: r.RETEST_BC };
  } catch {
    return { total: 0, fail: 0, retest: 0 };
  }
}

/** 단일 테이블 시간대별 직행율 — 오류 시 빈 배열 반환 */
async function fetchTableFpy(
  key: PostProcessTableKey,
  timeWhere: string,
  binds: Record<string, string>,
): Promise<PostProcessFpyRow[]> {
  try {
    const rows = await executeQuery<{ HOUR: string; TOTAL: number; PASS_CNT: number }>(
      sqlTableFpyHourly(key, timeWhere),
      binds,
    );
    return rows.map((r) => ({
      hour:  r.HOUR,
      total: r.TOTAL,
      pass:  r.PASS_CNT,
      yield: r.TOTAL > 0 ? Math.round((r.PASS_CNT / r.TOTAL) * 10000) / 100 : 100,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const p          = req.nextUrl.searchParams;
    const dateFrom   = p.get('dateFrom') ?? '';
    const dateTo     = p.get('dateTo')   ?? '';
    const linesParam = p.get('lines')    ?? '%';
    const orgId      = Number(p.get('orgId') ?? '1');

    const lineCodes = linesParam === '%' ? [] : linesParam.split(',').map((s) => s.trim()).filter(Boolean);
    const { clause: lineClause, binds: lineBinds } = buildLineFilter(lineCodes);

    const { where: timeWhere, binds: timeBind } = buildTimeWhere(dateFrom, dateTo);
    const { sql: qcSql, binds: qcBinds } = sqlQcStats(dateFrom, dateTo);

    // ─── 병렬 실행 (생산계획 + 수리 + 매거진 + 5개 테이블 stats) ───
    const [prodRows, qcRows, magazineRows, ...statsArr] = await Promise.all([
      executeQuery<{ PLAN_QTY: number; TARGET_QTY: number; ACTUAL_QTY: number; ACHIEVEMENT_RATE: number }>(
        sqlProductionKpiAgg(lineClause),
        { orgId, ...lineBinds },
      ).catch(() => [{ PLAN_QTY: 0, TARGET_QTY: 0, ACTUAL_QTY: 0, ACHIEVEMENT_RATE: 0 }]),

      executeQuery<{ WAITING: number; DONE: number }>(qcSql, qcBinds)
        .catch(() => [{ WAITING: 0, DONE: 0 }]),

      executeQuery<{ LINE_CODE: string; WORKSTAGE_CODE: string; MAGAZINE_NO: string; IN_QTY: number }>(
        sqlMagazine,
        {},
      ).catch(() => []),

      ...POST_PROCESS_TABLES.map((k) => fetchTableStats(k, timeWhere, timeBind)),
    ]);

    // ─── FPY 시간대별 (별도 병렬) ───
    const fpyArr = await Promise.all(
      POST_PROCESS_TABLES.map((k) => fetchTableFpy(k, timeWhere, timeBind)),
    );

    // ─── 통계 집계 ───
    const stats = statsArr as { total: number; fail: number; retest: number }[];
    const totalBc  = stats.reduce((s, r) => s + r.total,  0);
    const failBc   = stats.reduce((s, r) => s + r.fail,   0);
    const retestBc = stats.reduce((s, r) => s + r.retest, 0);

    const prod = (prodRows as { PLAN_QTY: number; TARGET_QTY: number; ACTUAL_QTY: number; ACHIEVEMENT_RATE: number }[])[0]
      ?? { PLAN_QTY: 0, TARGET_QTY: 0, ACTUAL_QTY: 0, ACHIEVEMENT_RATE: 0 };
    const qc   = (qcRows as { WAITING: number; DONE: number }[])[0]
      ?? { WAITING: 0, DONE: 0 };

    const kpi: PostProcessKpi = {
      planQty:         prod.PLAN_QTY,
      targetQty:       prod.TARGET_QTY,
      actualQty:       prod.ACTUAL_QTY,
      achievementRate: prod.ACHIEVEMENT_RATE,
      defectRate:  totalBc > 0 ? Math.round((failBc   / totalBc) * 10000) / 100 : 0,
      retestRate:  totalBc > 0 ? Math.round((retestBc / totalBc) * 10000) / 100 : 0,
      repairWaiting: qc.WAITING ?? 0,
      repairDone:    qc.DONE    ?? 0,
    };

    const fpyChart: Record<string, PostProcessFpyRow[]> = {};
    POST_PROCESS_TABLES.forEach((k, i) => { fpyChart[k] = fpyArr[i]; });

    const magazine: PostProcessMagazineRow[] = (
      magazineRows as { LINE_CODE: string; WORKSTAGE_CODE: string; MAGAZINE_NO: string; IN_QTY: number }[]
    ).map((r) => ({
      lineCode:      r.LINE_CODE,
      workstageCode: r.WORKSTAGE_CODE,
      magazineNo:    r.MAGAZINE_NO,
      inQty:         r.IN_QTY,
    }));

    const res: PostProcessResponse = {
      kpi,
      fpyChart,
      magazine,
      lastUpdated: new Date().toISOString(),
    };
    return NextResponse.json(res);

  } catch (error) {
    console.error('[POST-PROCESS API]', error);
    return NextResponse.json(
      { error: '데이터 조회 실패', detail: String(error) },
      { status: 500 },
    );
  }
}
