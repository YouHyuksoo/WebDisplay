/**
 * @file route.ts
 * @description 온습도 모니터링 API (메뉴 37).
 * 초보자 가이드: GET /api/display/37?orgId=1&machines=MC01,MC02 로 호출하면
 * 센서 데이터 목록과 NG/WN 건수를 반환한다.
 * machines 파라미터로 특정 설비만 필터링 가능 (% = 전체).
 * PB 원본: d_display_temperature_status_ye_img, d_display_temperature_ng_count
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlTempHumidityStatus,
  sqlTempHumidityNgCount,
  buildSensorFilter,
} from '@/lib/queries/temperature-humidity';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = Number(searchParams.get('orgId') ?? '1');
  const machinesParam = searchParams.get('machines') ?? '%';
  const machineList = machinesParam === '%' ? ['%'] : machinesParam.split(',').filter(Boolean);

  const { clause: machineClause, binds: machineBinds } = buildSensorFilter(machineList);

  try {
    const [sensorData, ngCountResult] = await Promise.all([
      executeQuery(sqlTempHumidityStatus(machineClause), { orgId, ...machineBinds }),
      executeQuery<{ NG_COUNT: number }>(sqlTempHumidityNgCount(), { orgId }),
    ]);

    const ngCount = ngCountResult[0]?.NG_COUNT ?? 0;

    return NextResponse.json({
      sensorData,
      ngCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/37] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', sensorData: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
