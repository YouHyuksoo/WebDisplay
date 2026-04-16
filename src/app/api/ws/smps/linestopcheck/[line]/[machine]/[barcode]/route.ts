/**
 * @file src/app/api/ws/smps/linestopcheck/[line]/[machine]/[barcode]/route.ts
 * @description 설비 라인정지 판정 API — CTQ A등급 상태 조회
 *
 * 초보자 가이드:
 * 1. 설비(ICT/HIPOT/FT1/BURNIN/ATE)가 REST 호출로 라인정지 여부 확인
 * 2. URL: GET /api/ws/smps/linestopcheck/{LINE}/{MACHINE}/{BARCODE}
 * 3. 응답: plain text "OK" 또는 "NG/{LINE}/{MACHINE}"
 * 4. 판정 근거: ctq-monitor 잡이 갱신하는 monitor-state.json의 prevGrades
 * 5. DB 조회 없음 — 파일 읽기만 (ms 단위 응답)
 *
 * 설비별 A등급 판정 매핑:
 * - ICT    → A등급 해당 없음 (항상 OK)
 * - HIPOT  → accident:HIPOT (판정완료 1건+)
 * - FT1    → repeatability:FT (연속 동일 Location)
 * - BURNIN → accident:BURNIN (판정완료 2건+)
 * - ATE    → repeatability:ATE + accident:ATE (둘 중 하나라도 A면 NG)
 */

import { NextResponse } from 'next/server';
import { readMonitorState } from '@/lib/monitor/monitor-state';

export const dynamic = 'force-dynamic';

/**
 * 설비(MACHINE)별 → prevGrades에서 확인할 카테고리:공정 키 목록
 * 하나라도 A등급이면 NG 회신
 */
const MACHINE_GRADE_KEYS: Record<string, string[]> = {
  ICT:    [],
  HIPOT:  ['accident:HIPOT'],
  FT1:    ['repeatability:FT'],
  BURNIN: ['accident:BURNIN'],
  ATE:    ['repeatability:ATE', 'accident:ATE'],
};

interface RouteParams {
  params: Promise<{
    line: string;
    machine: string;
    barcode: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { line, machine, barcode } = await params;
  const upperMachine = machine.toUpperCase();
  const upperLine = line.toUpperCase();

  if (process.env.CTQ_MONITOR_ENABLED !== 'true') {
    return new NextResponse('OK', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const gradeKeys = MACHINE_GRADE_KEYS[upperMachine];
  if (!gradeKeys) {
    return new NextResponse(`NG/${upperLine}/${upperMachine}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (gradeKeys.length === 0) {
    return new NextResponse('OK', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const state = await readMonitorState();

  const isAGrade = gradeKeys.some((suffix) => {
    const key = `${upperLine}:${suffix}`;
    return state.prevGrades[key] === 'A';
  });

  if (isAGrade) {
    console.log(`[LineStopCheck] NG — ${upperLine}/${upperMachine} (barcode: ${barcode})`);
    return new NextResponse(`NG/${upperLine}/${upperMachine}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse('OK', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
