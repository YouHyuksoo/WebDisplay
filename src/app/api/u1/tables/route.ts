/**
 * @file src/app/api/u1/tables/route.ts
 * @description 베트남U1 공정에서 사용하는 Oracle 테이블 목록을 반환하는 API.
 * 초보자 가이드:
 * - U1 공정 테이블 5개를 고정 목록으로 관리한다 (IQ_MACHINE_*_U1_DATA_RAW 5개)
 * - DB에서 각 테이블의 코멘트를 조회하여 함께 반환한다
 * - 기본 active 프로필(베트남VD)을 사용하므로 executeQuery로 연결한다.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** U1 공정 테이블 목록 및 사이드바 표시용 alias */
export const U1_TABLE_MAP: Record<string, string> = {
  'IQ_MACHINE_ATE_U1_DATA_RAW': 'ATE',
  'IQ_MACHINE_BURNIN_U1_DATA_RAW': 'BURN-IN',
  'IQ_MACHINE_FW_U1_DATA_RAW': 'FW',
  'IQ_MACHINE_HIPOT_U1_DATA_RAW': 'HIPOT',
  'IQ_MACHINE_ICT_U1_DATA_RAW': 'ICT',
};

export const U1_TABLES = Object.keys(U1_TABLE_MAP);

interface TableInfo {
  TABLE_NAME: string;
  COMMENTS: string | null;
}

export async function GET() {
  try {
    const inList = U1_TABLES.map((_, i) => `:t${i}`).join(',');
    const binds: Record<string, string> = {};
    U1_TABLES.forEach((t, i) => { binds[`t${i}`] = t; });

    const tables = await executeQuery<TableInfo>(
      `SELECT T.TABLE_NAME, C.COMMENTS
         FROM USER_TABLES T
         LEFT JOIN USER_TAB_COMMENTS C ON T.TABLE_NAME = C.TABLE_NAME
        WHERE T.TABLE_NAME IN (${inList})
        ORDER BY T.TABLE_NAME`,
      binds,
    );
    const result = tables.map((t) => ({
      ...t,
      ALIAS: U1_TABLE_MAP[t.TABLE_NAME] ?? t.TABLE_NAME,
    }));
    return NextResponse.json({ tables: result });
  } catch (err) {
    console.error('U1 테이블 목록 조회 실패:', err);
    return NextResponse.json(
      { error: '테이블 목록을 불러올 수 없습니다' },
      { status: 500 },
    );
  }
}
