/**
 * @file route.ts
 * @description 온습도 센서(설비) 목록 조회 API.
 * 초보자 가이드: GET /api/display/sensors?orgId=1 로 호출하면
 * MACHINE_TYPE='TEMP' 이고 MES_DISPLAY_YN='Y'인 설비 목록을 반환한다.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const SQL_SENSOR_LIST = `
SELECT
  machine_code           AS "machineCode",
  machine_name           AS "machineName",
  mes_display_sequence   AS "sequence"
FROM imcn_machine
WHERE organization_id   = :orgId
  AND machine_type       = 'TEMP'
  AND mes_display_yn     = 'Y'
ORDER BY mes_display_sequence
`;

interface SensorRow {
  machineCode: string;
  machineName: string;
  sequence: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';

  try {
    const sensors = await executeQuery<SensorRow>(SQL_SENSOR_LIST, {
      orgId: Number(orgId),
    });

    return NextResponse.json({ sensors });
  } catch (error) {
    console.error('[API /display/sensors] Error:', error);
    return NextResponse.json({ error: 'Database query failed', sensors: [] }, { status: 500 });
  }
}
