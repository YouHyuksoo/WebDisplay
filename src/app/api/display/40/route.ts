/**
 * @file route.ts
 * @description SPI 차트분석 API (메뉴 40).
 * 초보자 가이드: GET /api/display/40?lines=S03F,S10F 로 호출하면
 * 해당 라인의 SPI 검사 데이터를 반환한다.
 * lines 파라미터가 없거나 '%'이면 전체 라인 조회.
 * 4개 쿼리를 Promise.all로 병렬 실행하여 응답 속도를 최적화.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { buildInFilter } from '@/lib/display-helpers';
import {
  sqlSpiByLine,
  sqlSpiFpyTrend,
  sqlSpiSummary,
  sqlSpiTopLines,
} from '@/lib/queries/spi-chart';
import type { SpiLineRow, SpiFpyRow, SpiSummaryRow, SpiTopLineRow } from '@/lib/queries/spi-chart';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds } = buildInFilter(lineCodes, 'LINE_CODE', 'line');

  try {
    const [byLine, fpyTrend, summaryRows, topLines] = await Promise.all([
      executeQuery<SpiLineRow>(sqlSpiByLine(clause), binds),
      executeQuery<SpiFpyRow>(sqlSpiFpyTrend(clause), binds),
      executeQuery<SpiSummaryRow>(sqlSpiSummary(clause), binds),
      executeQuery<SpiTopLineRow>(sqlSpiTopLines(clause), binds),
    ]);

    const summary = summaryRows[0] ?? {
      TOTAL_INSPECTED: 0,
      TOTAL_DEFECTS: 0,
      DEFECT_RATE: 0,
      FPY_RATE: 0,
    };

    return NextResponse.json({
      byLine,
      fpyTrend,
      summary,
      topLines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/40] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', byLine: [], fpyTrend: [], summary: null, topLines: [] },
      { status: 500 },
    );
  }
}
